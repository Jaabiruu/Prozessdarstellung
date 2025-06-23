import { HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { CacheWarmingService } from '../common/cache/cache-warming.service';
export declare class HealthController {
    private readonly health;
    private readonly healthService;
    private readonly cacheWarmingService;
    constructor(health: HealthCheckService, healthService: HealthService, cacheWarmingService: CacheWarmingService);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult>;
    readiness(): Promise<import("@nestjs/terminus").HealthCheckResult>;
    liveness(): {
        status: string;
        timestamp: string;
        service: string;
    };
    cacheMetrics(): Promise<import("@nestjs/terminus").HealthCheckResult>;
    warmCache(): Promise<{
        success: boolean;
        duration: number;
        message: string;
    }>;
}
