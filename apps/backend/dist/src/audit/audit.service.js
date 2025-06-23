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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let AuditService = AuditService_1 = class AuditService {
    prisma;
    logger = new common_1.Logger(AuditService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(auditData, transaction) {
        try {
            const prismaClient = transaction || this.prisma;
            const createData = {
                userId: auditData.userId,
                action: auditData.action,
                entityType: auditData.entityType,
                entityId: auditData.entityId,
                reason: auditData.reason,
                ipAddress: auditData.ipAddress ?? undefined,
                userAgent: auditData.userAgent ?? undefined,
                details: auditData.details ?? undefined,
            };
            const auditLog = await prismaClient.auditLog.create({
                data: createData,
            });
            this.logger.debug('Audit log created', {
                auditLogId: auditLog.id,
                userId: auditData.userId,
                action: auditData.action,
                entityType: auditData.entityType,
            });
            return auditLog;
        }
        catch (error) {
            this.logger.error('Failed to create audit log', {
                userId: auditData.userId,
                action: auditData.action,
                entityType: auditData.entityType,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async createFromContext(context, transaction) {
        return this.create({
            userId: context.userId,
            action: context.action,
            entityType: context.entityType,
            entityId: context.entityId,
            reason: context.reason,
            ipAddress: context.ipAddress || null,
            userAgent: context.userAgent || null,
            details: context.details || null,
        }, transaction);
    }
    async findAllByEntity(entityType, entityId, options) {
        try {
            const auditLogs = await this.prisma.auditLog.findMany({
                where: {
                    entityType,
                    entityId,
                    ...(options?.userId && { userId: options.userId }),
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: options?.limit || 100,
                skip: options?.offset || 0,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                        },
                    },
                },
            });
            return auditLogs;
        }
        catch (error) {
            this.logger.error('Failed to fetch audit logs', {
                entityType,
                entityId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async findAllByUser(userId, options) {
        try {
            const auditLogs = await this.prisma.auditLog.findMany({
                where: {
                    userId,
                    ...(options?.entityType && { entityType: options.entityType }),
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: options?.limit || 100,
                skip: options?.offset || 0,
            });
            return auditLogs;
        }
        catch (error) {
            this.logger.error('Failed to fetch user audit logs', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map