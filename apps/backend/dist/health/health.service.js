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
var HealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const database_1 = require("../database");
let HealthService = HealthService_1 = class HealthService extends terminus_1.HealthIndicator {
    constructor(prismaService) {
        super();
        this.prismaService = prismaService;
        this.logger = new common_1.Logger(HealthService_1.name);
    }
    async checkDatabase() {
        const key = 'database';
        try {
            const healthCheck = await this.prismaService.healthCheck();
            const isHealthy = healthCheck.status === 'healthy';
            if (isHealthy) {
                return this.getStatus(key, true, {
                    responseTime: `${healthCheck.responseTime}ms`,
                });
            }
            const message = 'Database connection failed';
            this.logger.error(message, { status: healthCheck.status, responseTime: healthCheck.responseTime });
            throw new terminus_1.HealthCheckError(message, this.getStatus(key, false, {
                status: healthCheck.status,
                responseTime: `${healthCheck.responseTime}ms`,
            }));
        }
        catch (error) {
            if (error instanceof terminus_1.HealthCheckError) {
                throw error;
            }
            const message = 'Database health check failed';
            this.logger.error(message, error instanceof Error ? error.stack : error);
            throw new terminus_1.HealthCheckError(message, this.getStatus(key, false, {
                message: error instanceof Error ? error.message : 'Unknown error',
            }));
        }
    }
    async checkRedis() {
        const key = 'redis';
        const message = 'Redis health check not yet implemented';
        throw new terminus_1.HealthCheckError(message, this.getStatus(key, false, {
            reason: 'Implementation pending - Redis client not yet integrated',
        }));
    }
    async checkElasticsearch() {
        const key = 'elasticsearch';
        const message = 'Elasticsearch health check not yet implemented';
        throw new terminus_1.HealthCheckError(message, this.getStatus(key, false, {
            reason: 'Implementation pending - Elasticsearch client not yet integrated',
        }));
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = HealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_1.PrismaService])
], HealthService);
//# sourceMappingURL=health.service.js.map