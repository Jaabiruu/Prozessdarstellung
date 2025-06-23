"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const ioredis_1 = __importDefault(require("ioredis"));
const config_service_1 = require("../../config/config.service");
let CacheService = CacheService_1 = class CacheService {
    configService;
    eventEmitter;
    logger = new common_1.Logger(CacheService_1.name);
    redis = null;
    metrics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        totalRequests: 0,
    };
    keyPrefix;
    defaultTtl;
    enabled;
    constructor(configService, eventEmitter) {
        this.configService = configService;
        this.eventEmitter = eventEmitter;
        const redisConfig = this.configService.redis;
        this.keyPrefix = redisConfig.cache.keyPrefix;
        this.defaultTtl = redisConfig.cache.defaultTtl;
        this.enabled = redisConfig.cache.enabled;
        this.initializeRedis();
    }
    async initializeRedis() {
        if (!this.enabled) {
            this.logger.warn('Cache is disabled in configuration');
            return;
        }
        try {
            const redisConfig = this.configService.redis;
            this.redis = new ioredis_1.default(redisConfig.url, {
                maxRetriesPerRequest: 3,
                enableReadyCheck: true,
                lazyConnect: true,
            });
            this.redis.on('connect', () => {
                this.logger.log('Connected to Redis cache');
            });
            this.redis.on('error', error => {
                this.logger.error('Redis connection error:', error);
                this.redis = null;
            });
            await this.redis.connect();
        }
        catch (error) {
            this.logger.error('Failed to initialize Redis cache:', error);
            this.redis = null;
        }
    }
    async getOrSet(key, factory, options = {}) {
        const cacheKey = this.buildKey(key);
        const ttl = options.ttl || this.defaultTtl;
        this.metrics.totalRequests++;
        const cached = await this.get(cacheKey);
        if (cached !== null) {
            this.metrics.hits++;
            this.updateHitRate();
            this.logger.debug(`Cache hit: ${cacheKey}`);
            return cached;
        }
        this.metrics.misses++;
        this.updateHitRate();
        this.logger.debug(`Cache miss: ${cacheKey}`);
        try {
            const value = await factory();
            await this.set(cacheKey, value, ttl, options.tags);
            return value;
        }
        catch (error) {
            this.logger.error(`Factory function failed for key ${cacheKey}:`, error);
            throw error;
        }
    }
    async get(key) {
        if (!this.redis) {
            this.logger.debug('Redis not available, returning null for key:', key);
            return null;
        }
        try {
            const value = await this.redis.get(key);
            if (value === null) {
                return null;
            }
            return JSON.parse(value);
        }
        catch (error) {
            this.logger.error(`Failed to get cache value for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttl, tags) {
        if (!this.redis) {
            this.logger.debug('Redis not available, skipping cache set for key:', key);
            return;
        }
        try {
            const serializedValue = JSON.stringify(value);
            const expiry = ttl || this.defaultTtl;
            await this.redis.setex(key, expiry, serializedValue);
            if (tags && tags.length > 0) {
                const tagKey = `${this.keyPrefix}tags:${key}`;
                await this.redis.setex(tagKey, expiry, JSON.stringify(tags));
            }
            this.logger.debug(`Cache set: ${key} (TTL: ${expiry}s)`);
        }
        catch (error) {
            this.logger.error(`Failed to set cache value for key ${key}:`, error);
        }
    }
    async del(key) {
        if (!this.redis) {
            return;
        }
        try {
            await this.redis.del(key);
            await this.redis.del(`${this.keyPrefix}tags:${key}`);
            this.logger.debug(`Cache deleted: ${key}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete cache key ${key}:`, error);
        }
    }
    async invalidatePattern(pattern) {
        if (!this.redis) {
            this.logger.debug('Redis not available, skipping pattern invalidation:', pattern);
            return;
        }
        try {
            const fullPattern = this.buildKey(pattern);
            const keys = await this.redis.keys(fullPattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                this.logger.debug(`Invalidated ${keys.length} keys matching pattern: ${pattern}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to invalidate pattern ${pattern}:`, error);
        }
    }
    async invalidateByTags(tags) {
        if (!this.redis || tags.length === 0) {
            return;
        }
        try {
            const tagPattern = `${this.keyPrefix}tags:*`;
            const tagKeys = await this.redis.keys(tagPattern);
            const keysToDelete = [];
            for (const tagKey of tagKeys) {
                const tagData = await this.redis.get(tagKey);
                if (tagData) {
                    const keyTags = JSON.parse(tagData);
                    const hasMatchingTag = tags.some(tag => keyTags.includes(tag));
                    if (hasMatchingTag) {
                        const originalKey = tagKey.replace(`${this.keyPrefix}tags:`, '');
                        keysToDelete.push(originalKey, tagKey);
                    }
                }
            }
            if (keysToDelete.length > 0) {
                await this.redis.del(...keysToDelete);
                this.logger.debug(`Invalidated ${keysToDelete.length / 2} keys by tags: ${tags.join(', ')}`);
            }
        }
        catch (error) {
            this.logger.error(`Failed to invalidate by tags ${tags.join(', ')}:`, error);
        }
    }
    async handleProductionLineEvent() {
        await this.invalidatePattern('production-lines:*');
        await this.invalidateByTags(['production-line']);
    }
    async handleProcessEvent() {
        await this.invalidatePattern('processes:*');
        await this.invalidatePattern('process:*');
        await this.invalidateByTags(['process']);
    }
    getMetrics() {
        return { ...this.metrics };
    }
    resetMetrics() {
        this.metrics = {
            hits: 0,
            misses: 0,
            hitRate: 0,
            totalRequests: 0,
        };
    }
    async healthCheck() {
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
        }
        catch (error) {
            return {
                status: 'unhealthy',
                details: { error: error.message },
            };
        }
    }
    buildKey(key) {
        return `${this.keyPrefix}${key}`;
    }
    updateHitRate() {
        this.metrics.hitRate =
            this.metrics.totalRequests > 0
                ? (this.metrics.hits / this.metrics.totalRequests) * 100
                : 0;
    }
    async onModuleDestroy() {
        if (this.redis) {
            await this.redis.quit();
            this.logger.log('Redis connection closed');
        }
    }
};
exports.CacheService = CacheService;
__decorate([
    (0, event_emitter_1.OnEvent)('productionLine.created'),
    (0, event_emitter_1.OnEvent)('productionLine.updated'),
    (0, event_emitter_1.OnEvent)('productionLine.deleted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CacheService.prototype, "handleProductionLineEvent", null);
__decorate([
    (0, event_emitter_1.OnEvent)('process.created'),
    (0, event_emitter_1.OnEvent)('process.updated'),
    (0, event_emitter_1.OnEvent)('process.deleted'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CacheService.prototype, "handleProcessEvent", null);
exports.CacheService = CacheService = CacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.ConfigService,
        event_emitter_1.EventEmitter2])
], CacheService);
//# sourceMappingURL=cache.service.js.map