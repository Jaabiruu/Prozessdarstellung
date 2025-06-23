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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const terminus_1 = require("@nestjs/terminus");
const health_service_1 = require("./health.service");
const cache_warming_service_1 = require("../common/cache/cache-warming.service");
const public_decorator_1 = require("../common/decorators/public.decorator");
let HealthController = class HealthController {
    health;
    healthService;
    cacheWarmingService;
    constructor(health, healthService, cacheWarmingService) {
        this.health = health;
        this.healthService = healthService;
        this.cacheWarmingService = cacheWarmingService;
    }
    check() {
        return this.health.check([
            () => this.healthService.checkDatabase(),
            () => this.healthService.checkRedis(),
            () => this.healthService.checkElasticsearch(),
        ]);
    }
    readiness() {
        return this.health.check([
            () => this.healthService.checkDatabase(),
            () => this.healthService.checkRedis(),
        ]);
    }
    liveness() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'pharmaceutical-backend',
        };
    }
    cacheMetrics() {
        return this.health.check([() => this.healthService.getCacheMetrics()]);
    }
    async warmCache() {
        return await this.cacheWarmingService.manualWarm();
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "check", null);
__decorate([
    (0, common_1.Get)('ready'),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "readiness", null);
__decorate([
    (0, common_1.Get)('live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "liveness", null);
__decorate([
    (0, common_1.Get)('cache/metrics'),
    (0, terminus_1.HealthCheck)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "cacheMetrics", null);
__decorate([
    (0, common_1.Post)('cache/warm'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "warmCache", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    (0, public_decorator_1.Public)(),
    __metadata("design:paramtypes", [terminus_1.HealthCheckService,
        health_service_1.HealthService,
        cache_warming_service_1.CacheWarmingService])
], HealthController);
//# sourceMappingURL=health.controller.js.map