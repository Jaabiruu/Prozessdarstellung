import { OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
export declare class CacheService implements OnModuleDestroy {
    private readonly configService;
    private readonly eventEmitter;
    private readonly logger;
    private redis;
    private metrics;
    private readonly keyPrefix;
    private readonly defaultTtl;
    private readonly enabled;
    constructor(configService: ConfigService, eventEmitter: EventEmitter2);
    private initializeRedis;
    getOrSet<T>(key: string, factory: () => Promise<T>, options?: CacheOptions): Promise<T>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: any, ttl?: number, tags?: string[]): Promise<void>;
    del(key: string): Promise<void>;
    invalidatePattern(pattern: string): Promise<void>;
    invalidateByTags(tags: string[]): Promise<void>;
    handleProductionLineEvent(): Promise<void>;
    handleProcessEvent(): Promise<void>;
    getMetrics(): CacheMetrics;
    resetMetrics(): void;
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        details: any;
    }>;
    private buildKey;
    private updateHitRate;
    onModuleDestroy(): Promise<void>;
}
