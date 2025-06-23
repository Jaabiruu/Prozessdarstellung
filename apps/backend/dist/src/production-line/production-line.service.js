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
var ProductionLineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionLineService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const cache_service_1 = require("../common/cache/cache.service");
const client_1 = require("@prisma/client");
const user_role_enum_1 = require("../common/enums/user-role.enum");
let ProductionLineService = ProductionLineService_1 = class ProductionLineService {
    prisma;
    auditService;
    cacheService;
    eventEmitter;
    logger = new common_1.Logger(ProductionLineService_1.name);
    constructor(prisma, auditService, cacheService, eventEmitter) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.cacheService = cacheService;
        this.eventEmitter = eventEmitter;
    }
    async create(createProductionLineInput, currentUserId, ipAddress, userAgent) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const productionLine = await tx.productionLine.create({
                    data: {
                        name: createProductionLineInput.name,
                        status: createProductionLineInput.status || client_1.ProductionLineStatus.ACTIVE,
                        createdBy: currentUserId,
                        reason: createProductionLineInput.reason || 'Production line created',
                    },
                });
                await this.auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.CREATE,
                    entityType: 'ProductionLine',
                    entityId: productionLine.id,
                    reason: createProductionLineInput.reason || 'Production line created',
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        name: productionLine.name,
                        status: productionLine.status,
                        version: productionLine.version,
                    },
                }, tx);
                this.logger.log('Production line created successfully', {
                    productionLineId: productionLine.id,
                    name: productionLine.name,
                    status: productionLine.status,
                    createdBy: currentUserId,
                });
                this.eventEmitter.emit('productionLine.created', {
                    id: productionLine.id,
                    name: productionLine.name,
                });
                return productionLine;
            });
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'P2002') {
                throw new common_1.ConflictException('Production line with this name already exists');
            }
            this.logger.error('Failed to create production line', {
                name: createProductionLineInput.name,
                status: createProductionLineInput.status,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async findAll(options) {
        try {
            const cacheKey = `production-lines:${JSON.stringify(options || {})}`;
            return await this.cacheService.getOrSet(cacheKey, async () => {
                const productionLines = await this.prisma.productionLine.findMany({
                    where: {
                        ...(options?.isActive !== undefined && {
                            isActive: options.isActive,
                        }),
                        ...(options?.status && { status: options.status }),
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
                    take: options?.limit || 100,
                    skip: options?.offset || 0,
                });
                this.logger.debug(`Fetched ${productionLines.length} production lines from database`);
                return productionLines;
            }, {
                ttl: 1800,
                tags: ['production-line'],
            });
        }
        catch (error) {
            this.logger.error('Failed to fetch production lines', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async findOne(id) {
        try {
            const cacheKey = `production-line:${id}`;
            return await this.cacheService.getOrSet(cacheKey, async () => {
                const productionLine = await this.prisma.productionLine.findUnique({
                    where: { id },
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
                if (!productionLine) {
                    throw new common_1.NotFoundException(`Production line with ID ${id} not found`);
                }
                this.logger.debug(`Fetched production line ${id} from database`);
                return productionLine;
            }, {
                ttl: 3600,
                tags: ['production-line', `production-line:${id}`],
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error('Failed to fetch production line', {
                productionLineId: id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async update(updateProductionLineInput, currentUserId, ipAddress, userAgent) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existingProductionLine = await tx.productionLine.findUnique({
                    where: { id: updateProductionLineInput.id },
                });
                if (!existingProductionLine) {
                    throw new common_1.NotFoundException(`Production line with ID ${updateProductionLineInput.id} not found`);
                }
                const updateData = {};
                if (updateProductionLineInput.name !== undefined) {
                    updateData.name = updateProductionLineInput.name;
                }
                if (updateProductionLineInput.status !== undefined) {
                    updateData.status = updateProductionLineInput.status;
                }
                const productionLine = await tx.productionLine.update({
                    where: { id: updateProductionLineInput.id },
                    data: updateData,
                });
                await this.auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.UPDATE,
                    entityType: 'ProductionLine',
                    entityId: productionLine.id,
                    reason: updateProductionLineInput.reason || 'Production line updated',
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        changes: updateData,
                        previousValues: {
                            name: existingProductionLine.name,
                            status: existingProductionLine.status,
                        },
                    },
                }, tx);
                this.logger.log('Production line updated successfully', {
                    productionLineId: productionLine.id,
                    updatedBy: currentUserId,
                    changes: Object.keys(updateData),
                });
                this.eventEmitter.emit('productionLine.updated', {
                    id: productionLine.id,
                    changes: updateData,
                });
                return productionLine;
            });
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'P2002') {
                throw new common_1.ConflictException('Production line with this name already exists');
            }
            this.logger.error('Failed to update production line', {
                productionLineId: updateProductionLineInput.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async remove(id, reason, currentUserId, ipAddress, userAgent) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existingProductionLine = await tx.productionLine.findUnique({
                    where: { id },
                });
                if (!existingProductionLine) {
                    throw new common_1.NotFoundException(`Production line with ID ${id} not found`);
                }
                if (!existingProductionLine.isActive) {
                    throw new common_1.ConflictException('Production line is already deactivated');
                }
                const activeProcesses = await tx.process.count({
                    where: {
                        productionLineId: id,
                        isActive: true,
                        status: { not: 'COMPLETED' },
                    },
                });
                if (activeProcesses > 0) {
                    throw new common_1.ConflictException(`Cannot deactivate production line with ${activeProcesses} active processes. Please complete or cancel all processes first.`);
                }
                const productionLine = await tx.productionLine.update({
                    where: { id },
                    data: {
                        isActive: false,
                    },
                });
                await this.auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.DELETE,
                    entityType: 'ProductionLine',
                    entityId: productionLine.id,
                    reason,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        action: 'deactivation',
                        previouslyActive: existingProductionLine.isActive,
                        name: existingProductionLine.name,
                        status: existingProductionLine.status,
                        processCount: activeProcesses,
                    },
                }, tx);
                this.logger.log('Production line deactivated successfully', {
                    productionLineId: productionLine.id,
                    deactivatedBy: currentUserId,
                });
                this.eventEmitter.emit('productionLine.deleted', {
                    id: productionLine.id,
                    action: 'deactivation',
                });
                return productionLine;
            });
        }
        catch (error) {
            this.logger.error('Failed to deactivate production line', {
                productionLineId: id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
};
exports.ProductionLineService = ProductionLineService;
exports.ProductionLineService = ProductionLineService = ProductionLineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        cache_service_1.CacheService,
        event_emitter_1.EventEmitter2])
], ProductionLineService);
//# sourceMappingURL=production-line.service.js.map