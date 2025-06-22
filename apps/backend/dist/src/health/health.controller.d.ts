import { HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';
export declare class HealthController {
    private readonly health;
    private readonly healthService;
    constructor(health: HealthCheckService, healthService: HealthService);
    check(): Promise<import("@nestjs/terminus").HealthCheckResult>;
    readiness(): Promise<import("@nestjs/terminus").HealthCheckResult>;
    liveness(): {
        status: string;
        timestamp: string;
        service: string;
    };
}
