import { HealthIndicatorResult, HealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../database';
export declare class HealthService extends HealthIndicator {
    private readonly prismaService;
    private readonly logger;
    constructor(prismaService: PrismaService);
    checkDatabase(): Promise<HealthIndicatorResult>;
    checkRedis(): Promise<HealthIndicatorResult>;
    checkElasticsearch(): Promise<HealthIndicatorResult>;
}
