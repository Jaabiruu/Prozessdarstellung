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
var CacheWarmingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheWarmingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const config_service_1 = require("../../config/config.service");
const cache_service_1 = require("./cache.service");
const prisma_service_1 = require("../../database/prisma.service");
let CacheWarmingService = CacheWarmingService_1 = class CacheWarmingService {
    configService;
    cacheService;
    prisma;
    logger = new common_1.Logger(CacheWarmingService_1.name);
    isEnabled;
    constructor(configService, cacheService, prisma) {
        this.configService = configService;
        this.cacheService = cacheService;
        this.prisma = prisma;
        this.isEnabled = this.configService.redis.cache.enabled;
    }
    async onModuleInit() {
        if (!this.isEnabled) {
            this.logger.warn('Cache is disabled, skipping cache warming');
            return;
        }
        setTimeout(() => {
            this.warmCriticalData();
        }, 5000);
    }
    async warmCriticalData() {
        if (!this.isEnabled) {
            return;
        }
        this.logger.log('Starting cache warming process');
        const startTime = Date.now();
        try {
            await Promise.all([
                this.warmProductionLines(),
                this.warmRecentProcesses(),
                this.warmActiveData(),
            ]);
            const duration = Date.now() - startTime;
            this.logger.log(`Cache warming completed in ${duration}ms`);
        }
        catch (error) {
            this.logger.error('Cache warming failed:', error);
        }
    }
    async warmProductionLines() {
        try {
            const queries = [
                { isActive: true },
                { isActive: true, limit: 20 },
                {},
            ];
            for (const options of queries) {
                const cacheKey = `production-lines:${JSON.stringify(options)}`;
                await this.cacheService.getOrSet(cacheKey, async () => {
                    const productionLines = await this.prisma.productionLine.findMany({
                        where: {
                            ...(options.isActive !== undefined && {
                                isActive: options.isActive,
                            }),
                        },
                        include: {
                            creator: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    role: true,
                                },
                            },
                            _count: {
                                select: {
                                    processes: true,
                                },
                            },
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: options.limit || 100,
                    });
                    this.logger.debug(`Warmed production lines cache: ${productionLines.length} items for ${JSON.stringify(options)}`);
                    return productionLines;
                }, {
                    ttl: 1800,
                    tags: ['production-line'],
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to warm production lines cache:', error);
        }
    }
    async warmRecentProcesses() {
        try {
            const activeLines = await this.prisma.productionLine.findMany({
                where: { isActive: true },
                select: { id: true },
                take: 10,
            });
            for (const line of activeLines) {
                const options = { productionLineId: line.id, isActive: true };
                const cacheKey = `processes:line:${line.id}:${JSON.stringify(options)}`;
                await this.cacheService.getOrSet(cacheKey, async () => {
                    const processes = await this.prisma.process.findMany({
                        where: {
                            productionLineId: line.id,
                            isActive: true,
                        },
                        include: {
                            creator: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    role: true,
                                },
                            },
                            productionLine: {
                                select: {
                                    id: true,
                                    name: true,
                                    status: true,
                                    isActive: true,
                                },
                            },
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: 50,
                    });
                    this.logger.debug(`Warmed processes cache for line ${line.id}: ${processes.length} items`);
                    return processes;
                }, {
                    ttl: 1800,
                    tags: ['process', `processes:line:${line.id}`],
                });
            }
        }
        catch (error) {
            this.logger.error('Failed to warm processes cache:', error);
        }
    }
    async warmActiveData() {
        try {
            const recentLines = await this.prisma.productionLine.findMany({
                where: { isActive: true },
                orderBy: { updatedAt: 'desc' },
                take: 5,
                include: {
                    creator: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                        },
                    },
                    processes: {
                        select: {
                            id: true,
                            title: true,
                            status: true,
                            progress: true,
                            createdAt: true,
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                    },
                    _count: {
                        select: {
                            processes: true,
                        },
                    },
                },
            });
            for (const line of recentLines) {
                const cacheKey = `production-line:${line.id}`;
                await this.cacheService.set(cacheKey, line, 3600, ['production-line', `production-line:${line.id}`]);
            }
            const recentProcesses = await this.prisma.process.findMany({
                where: { isActive: true },
                orderBy: { updatedAt: 'desc' },
                take: 10,
                include: {
                    creator: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                        },
                    },
                    productionLine: {
                        select: {
                            id: true,
                            name: true,
                            status: true,
                            isActive: true,
                        },
                    },
                },
            });
            for (const process of recentProcesses) {
                const cacheKey = `process:${process.id}`;
                await this.cacheService.set(cacheKey, process, 3600, ['process', `process:${process.id}`]);
            }
            this.logger.debug(`Warmed individual item caches: ${recentLines.length} production lines, ${recentProcesses.length} processes`);
        }
        catch (error) {
            this.logger.error('Failed to warm active data cache:', error);
        }
    }
    async backgroundRefresh() {
        if (!this.isEnabled) {
            return;
        }
        this.logger.debug('Starting background cache refresh');
        try {
            const criticalQueries = [
                { isActive: true },
                { isActive: true, limit: 20 },
            ];
            for (const options of criticalQueries) {
                const cacheKey = `production-lines:${JSON.stringify(options)}`;
                await this.cacheService.del(cacheKey);
                await this.cacheService.getOrSet(cacheKey, async () => {
                    return await this.prisma.productionLine.findMany({
                        where: {
                            ...(options.isActive !== undefined && {
                                isActive: options.isActive,
                            }),
                        },
                        include: {
                            creator: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    role: true,
                                },
                            },
                            _count: {
                                select: {
                                    processes: true,
                                },
                            },
                        },
                        orderBy: {
                            createdAt: 'desc',
                        },
                        take: options.limit || 100,
                    });
                }, {
                    ttl: 1800,
                    tags: ['production-line'],
                });
            }
            this.logger.debug('Background cache refresh completed');
        }
        catch (error) {
            this.logger.error('Background cache refresh failed:', error);
        }
    }
    async manualWarm() {
        const startTime = Date.now();
        try {
            await this.warmCriticalData();
            const duration = Date.now() - startTime;
            return {
                success: true,
                duration,
                message: `Cache warming completed successfully in ${duration}ms`,
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            return {
                success: false,
                duration,
                message: `Cache warming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }
};
exports.CacheWarmingService = CacheWarmingService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CacheWarmingService.prototype, "warmCriticalData", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CacheWarmingService.prototype, "backgroundRefresh", null);
exports.CacheWarmingService = CacheWarmingService = CacheWarmingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_service_1.ConfigService,
        cache_service_1.CacheService,
        prisma_service_1.PrismaService])
], CacheWarmingService);
//# sourceMappingURL=cache-warming.service.js.map