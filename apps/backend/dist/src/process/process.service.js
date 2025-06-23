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
var ProcessService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const cache_service_1 = require("../common/cache/cache.service");
const client_1 = require("@prisma/client");
const user_role_enum_1 = require("../common/enums/user-role.enum");
let ProcessService = ProcessService_1 = class ProcessService {
    prisma;
    auditService;
    cacheService;
    eventEmitter;
    logger = new common_1.Logger(ProcessService_1.name);
    constructor(prisma, auditService, cacheService, eventEmitter) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.cacheService = cacheService;
        this.eventEmitter = eventEmitter;
    }
    async create(createProcessInput, currentUserId, ipAddress, userAgent) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const productionLine = await tx.productionLine.findUnique({
                    where: { id: createProcessInput.productionLineId },
                });
                if (!productionLine) {
                    throw new common_1.NotFoundException(`Production line with ID ${createProcessInput.productionLineId} not found`);
                }
                if (!productionLine.isActive) {
                    throw new common_1.BadRequestException('Cannot create process on inactive production line');
                }
                const process = await tx.process.create({
                    data: {
                        title: createProcessInput.title,
                        description: createProcessInput.description || null,
                        duration: createProcessInput.duration || null,
                        progress: createProcessInput.progress || 0.0,
                        status: createProcessInput.status || client_1.ProcessStatus.PENDING,
                        x: createProcessInput.x || 0.0,
                        y: createProcessInput.y || 0.0,
                        color: createProcessInput.color || '#4F46E5',
                        productionLineId: createProcessInput.productionLineId,
                        createdBy: currentUserId,
                        reason: createProcessInput.reason || 'Process created',
                    },
                });
                await this.auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.CREATE,
                    entityType: 'Process',
                    entityId: process.id,
                    reason: createProcessInput.reason || 'Process created',
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        title: process.title,
                        description: process.description,
                        duration: process.duration,
                        status: process.status,
                        progress: process.progress,
                        productionLineId: process.productionLineId,
                        version: process.version,
                    },
                }, tx);
                this.logger.log('Process created successfully', {
                    processId: process.id,
                    title: process.title,
                    status: process.status,
                    productionLineId: process.productionLineId,
                    createdBy: currentUserId,
                });
                this.eventEmitter.emit('process.created', {
                    id: process.id,
                    title: process.title,
                    productionLineId: process.productionLineId,
                });
                return process;
            });
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'P2002') {
                throw new common_1.ConflictException('Process with this title already exists in the production line');
            }
            this.logger.error('Failed to create process', {
                title: createProcessInput.title,
                productionLineId: createProcessInput.productionLineId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async findAll(options) {
        try {
            const cacheKey = options?.productionLineId
                ? `processes:line:${options.productionLineId}:${JSON.stringify(options)}`
                : `processes:${JSON.stringify(options || {})}`;
            return await this.cacheService.getOrSet(cacheKey, async () => {
                const processes = await this.prisma.process.findMany({
                    where: {
                        ...(options?.isActive !== undefined && {
                            isActive: options.isActive,
                        }),
                        ...(options?.status && { status: options.status }),
                        ...(options?.productionLineId && {
                            productionLineId: options.productionLineId,
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
                    take: options?.limit || 100,
                    skip: options?.offset || 0,
                });
                this.logger.debug(`Fetched ${processes.length} processes from database`);
                return processes;
            }, {
                ttl: 1800,
                tags: options?.productionLineId
                    ? ['process', `processes:line:${options.productionLineId}`]
                    : ['process'],
            });
        }
        catch (error) {
            this.logger.error('Failed to fetch processes', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async findOne(id) {
        try {
            const cacheKey = `process:${id}`;
            return await this.cacheService.getOrSet(cacheKey, async () => {
                const process = await this.prisma.process.findUnique({
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
                if (!process) {
                    throw new common_1.NotFoundException(`Process with ID ${id} not found`);
                }
                this.logger.debug(`Fetched process ${id} from database`);
                return process;
            }, {
                ttl: 3600,
                tags: ['process', `process:${id}`],
            });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error('Failed to fetch process', {
                processId: id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async update(updateProcessInput, currentUserId, ipAddress, userAgent) {
        try {
            return await this.prisma.$transaction(async (tx) => {
                const existingProcess = await tx.process.findUnique({
                    where: { id: updateProcessInput.id },
                });
                if (!existingProcess) {
                    throw new common_1.NotFoundException(`Process with ID ${updateProcessInput.id} not found`);
                }
                const updateData = {};
                if (updateProcessInput.title !== undefined) {
                    updateData.title = updateProcessInput.title;
                }
                if (updateProcessInput.description !== undefined) {
                    updateData.description = updateProcessInput.description;
                }
                if (updateProcessInput.duration !== undefined) {
                    updateData.duration = updateProcessInput.duration;
                }
                if (updateProcessInput.progress !== undefined) {
                    updateData.progress = updateProcessInput.progress;
                }
                if (updateProcessInput.status !== undefined) {
                    updateData.status = updateProcessInput.status;
                }
                if (updateProcessInput.x !== undefined) {
                    updateData.x = updateProcessInput.x;
                }
                if (updateProcessInput.y !== undefined) {
                    updateData.y = updateProcessInput.y;
                }
                if (updateProcessInput.color !== undefined) {
                    updateData.color = updateProcessInput.color;
                }
                const process = await tx.process.update({
                    where: { id: updateProcessInput.id },
                    data: updateData,
                });
                await this.auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.UPDATE,
                    entityType: 'Process',
                    entityId: process.id,
                    reason: updateProcessInput.reason || 'Process updated',
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        changes: updateData,
                        previousValues: {
                            title: existingProcess.title,
                            description: existingProcess.description,
                            duration: existingProcess.duration,
                            progress: existingProcess.progress,
                            status: existingProcess.status,
                            x: existingProcess.x,
                            y: existingProcess.y,
                            color: existingProcess.color,
                        },
                    },
                }, tx);
                this.logger.log('Process updated successfully', {
                    processId: process.id,
                    updatedBy: currentUserId,
                    changes: Object.keys(updateData),
                });
                this.eventEmitter.emit('process.updated', {
                    id: process.id,
                    productionLineId: process.productionLineId,
                    changes: updateData,
                });
                return process;
            });
        }
        catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'P2002') {
                throw new common_1.ConflictException('Process with this title already exists in the production line');
            }
            this.logger.error('Failed to update process', {
                processId: updateProcessInput.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async remove(id, reason, currentUserId, ipAddress, userAgent) {
        try {
            const existingProcess = await this.findOne(id);
            if (!existingProcess.isActive) {
                throw new common_1.ConflictException('Process is already deactivated');
            }
            return await this.prisma.$transaction(async (tx) => {
                const process = await tx.process.update({
                    where: { id },
                    data: {
                        isActive: false,
                    },
                });
                await this.auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.DELETE,
                    entityType: 'Process',
                    entityId: process.id,
                    reason,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        action: 'deactivation',
                        previouslyActive: existingProcess.isActive,
                        title: existingProcess.title,
                        status: existingProcess.status,
                        progress: existingProcess.progress,
                        productionLineId: existingProcess.productionLineId,
                    },
                }, tx);
                this.logger.log('Process deactivated successfully', {
                    processId: process.id,
                    deactivatedBy: currentUserId,
                });
                this.eventEmitter.emit('process.deleted', {
                    id: process.id,
                    productionLineId: process.productionLineId,
                    action: 'deactivation',
                });
                return process;
            });
        }
        catch (error) {
            this.logger.error('Failed to deactivate process', {
                processId: id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
};
exports.ProcessService = ProcessService;
exports.ProcessService = ProcessService = ProcessService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService,
        cache_service_1.CacheService,
        event_emitter_1.EventEmitter2])
], ProcessService);
//# sourceMappingURL=process.service.js.map