import { HealthIndicatorResult, HealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../database';
import { CacheService } from '../common/cache/cache.service';
export declare class HealthService extends HealthIndicator {
    private readonly prismaService;
    private readonly cacheService;
    private readonly logger;
    constructor(prismaService: PrismaService, cacheService: CacheService);
    checkDatabase(): Promise<HealthIndicatorResult>;
    checkRedis(): Promise<HealthIndicatorResult>;
    getCacheMetrics(): Promise<HealthIndicatorResult>;
    checkElasticsearch(): Promise<HealthIndicatorResult>;
}
