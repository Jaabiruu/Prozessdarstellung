import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { ConfigService } from '../../config/config.service';

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalRequests: 0,
  };
  private readonly keyPrefix: string;
  private readonly defaultTtl: number;
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const redisConfig = this.configService.redis;
    this.keyPrefix = redisConfig.cache.keyPrefix;
    this.defaultTtl = redisConfig.cache.defaultTtl;
    this.enabled = redisConfig.cache.enabled;

    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn('Cache is disabled in configuration');
      return;
    }

    try {
      const redisConfig = this.configService.redis;
      this.redis = new Redis(redisConfig.url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis cache');
      });

      this.redis.on('error', error => {
        this.logger.error('Redis connection error:', error);
        this.redis = null; // Enable graceful degradation
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error('Failed to initialize Redis cache:', error);
      this.redis = null; // Enable graceful degradation
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cacheKey = this.buildKey(key);
    const ttl = options.ttl || this.defaultTtl;

    this.metrics.totalRequests++;

    // Try to get from cache first
    const cached = await this.get<T>(cacheKey);
    if (cached !== null) {
      this.metrics.hits++;
      this.updateHitRate();
      this.logger.debug(`Cache hit: ${cacheKey}`);
      return cached;
    }

    // Cache miss - call factory function
    this.metrics.misses++;
    this.updateHitRate();
    this.logger.debug(`Cache miss: ${cacheKey}`);

    try {
      const value = await factory();
      await this.set(cacheKey, value, ttl, options.tags);
      return value;
    } catch (error) {
      this.logger.error(`Factory function failed for key ${cacheKey}:`, error);
      throw error;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      this.logger.debug('Redis not available, returning null for key:', key);
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Failed to get cache value for key ${key}:`, error);
      return null; // Graceful degradation
    }
  }

  async set(
    key: string,
    value: any,
    ttl?: number,
    tags?: string[],
  ): Promise<void> {
    if (!this.redis) {
      this.logger.debug(
        'Redis not available, skipping cache set for key:',
        key,
      );
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);
      const expiry = ttl || this.defaultTtl;

      await this.redis.setex(key, expiry, serializedValue);

      // Store tags for invalidation patterns
      if (tags && tags.length > 0) {
        const tagKey = `${this.keyPrefix}tags:${key}`;
        await this.redis.setex(tagKey, expiry, JSON.stringify(tags));
      }

      this.logger.debug(`Cache set: ${key} (TTL: ${expiry}s)`);
    } catch (error) {
      this.logger.error(`Failed to set cache value for key ${key}:`, error);
      // Don't throw - graceful degradation
    }
  }

  async del(key: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.del(key);
      await this.redis.del(`${this.keyPrefix}tags:${key}`);
      this.logger.debug(`Cache deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.redis) {
      this.logger.debug(
        'Redis not available, skipping pattern invalidation:',
        pattern,
      );
      return;
    }

    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.debug(
          `Invalidated ${keys.length} keys matching pattern: ${pattern}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to invalidate pattern ${pattern}:`, error);
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.redis || tags.length === 0) {
      return;
    }

    try {
      const tagPattern = `${this.keyPrefix}tags:*`;
      const tagKeys = await this.redis.keys(tagPattern);
      const keysToDelete: string[] = [];

      for (const tagKey of tagKeys) {
        const tagData = await this.redis.get(tagKey);
        if (tagData) {
          const keyTags = JSON.parse(tagData) as string[];
          const hasMatchingTag = tags.some(tag => keyTags.includes(tag));

          if (hasMatchingTag) {
            const originalKey = tagKey.replace(`${this.keyPrefix}tags:`, '');
            keysToDelete.push(originalKey, tagKey);
          }
        }
      }

      if (keysToDelete.length > 0) {
        await this.redis.del(...keysToDelete);
        this.logger.debug(
          `Invalidated ${keysToDelete.length / 2} keys by tags: ${tags.join(', ')}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to invalidate by tags ${tags.join(', ')}:`,
        error,
      );
    }
  }

  // Event-driven invalidation handlers
  @OnEvent('productionLine.created')
  @OnEvent('productionLine.updated')
  @OnEvent('productionLine.deleted')
  async handleProductionLineEvent(): Promise<void> {
    await this.invalidatePattern('production-lines:*');
    await this.invalidateByTags(['production-line']);
  }

  @OnEvent('process.created')
  @OnEvent('process.updated')
  @OnEvent('process.deleted')
  async handleProcessEvent(): Promise<void> {
    await this.invalidatePattern('processes:*');
    await this.invalidatePattern('process:*');
    await this.invalidateByTags(['process']);
  }

  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0,
    };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    details: any;
  }> {
    if (!this.redis) {
      return {
        status: 'unhealthy',
        details: { error: 'Redis connection not available' },
      };
    }

    try {
      const result = await this.redis.ping();
      return {
        status: result === 'PONG' ? 'healthy' : 'unhealthy',
        details: { response: result, metrics: this.getMetrics() },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  private updateHitRate(): void {
    this.metrics.hitRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.hits / this.metrics.totalRequests) * 100
        : 0;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log('Redis connection closed');
    }
  }
}
