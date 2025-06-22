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
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const client_1 = require("@prisma/client");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const bcrypt = require("bcrypt");
let UserService = UserService_1 = class UserService {
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
        this.logger = new common_1.Logger(UserService_1.name);
    }
    async create(createUserInput, currentUserId, ipAddress, userAgent) {
        try {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: createUserInput.email },
            });
            if (existingUser) {
                throw new common_1.ConflictException('User with this email already exists');
            }
            const hashedPassword = await bcrypt.hash(createUserInput.password, 12);
            return await this.auditService.withTransaction(async (tx, auditService) => {
                const user = await tx.user.create({
                    data: {
                        email: createUserInput.email,
                        password: hashedPassword,
                        firstName: createUserInput.firstName || null,
                        lastName: createUserInput.lastName || null,
                        role: createUserInput.role,
                    },
                });
                await auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.CREATE,
                    entityType: 'User',
                    entityId: user.id,
                    reason: createUserInput.reason,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        email: user.email,
                        role: user.role,
                        firstName: user.firstName,
                        lastName: user.lastName,
                    },
                }, tx);
                this.logger.log('User created successfully', {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    createdBy: currentUserId,
                });
                return user;
            });
        }
        catch (error) {
            this.logger.error('Failed to create user', {
                email: createUserInput.email,
                role: createUserInput.role,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async findAll(options) {
        try {
            const users = await this.prisma.user.findMany({
                where: {
                    ...(options?.isActive !== undefined && { isActive: options.isActive }),
                    ...(options?.role && { role: options.role }),
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: options?.limit || 100,
                skip: options?.offset || 0,
            });
            return users;
        }
        catch (error) {
            this.logger.error('Failed to fetch users', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async findOne(id) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id },
            });
            if (!user) {
                throw new common_1.NotFoundException(`User with ID ${id} not found`);
            }
            return user;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            this.logger.error('Failed to fetch user', {
                userId: id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async update(updateUserInput, currentUserId, currentUserRole, ipAddress, userAgent) {
        try {
            const existingUser = await this.findOne(updateUserInput.id);
            if (updateUserInput.role && updateUserInput.role !== existingUser.role) {
                if (currentUserRole !== client_1.UserRole.ADMIN) {
                    throw new common_1.ForbiddenException('Only administrators can change user roles');
                }
            }
            return await this.auditService.withTransaction(async (tx, auditService) => {
                const updateData = {};
                if (updateUserInput.firstName !== undefined) {
                    updateData.firstName = updateUserInput.firstName;
                }
                if (updateUserInput.lastName !== undefined) {
                    updateData.lastName = updateUserInput.lastName;
                }
                if (updateUserInput.role !== undefined) {
                    updateData.role = updateUserInput.role;
                }
                if (updateUserInput.isActive !== undefined) {
                    updateData.isActive = updateUserInput.isActive;
                }
                const user = await tx.user.update({
                    where: { id: updateUserInput.id },
                    data: updateData,
                });
                await auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.UPDATE,
                    entityType: 'User',
                    entityId: user.id,
                    reason: updateUserInput.reason,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        changes: updateData,
                        previousValues: {
                            firstName: existingUser.firstName,
                            lastName: existingUser.lastName,
                            role: existingUser.role,
                            isActive: existingUser.isActive,
                        },
                    },
                }, tx);
                this.logger.log('User updated successfully', {
                    userId: user.id,
                    updatedBy: currentUserId,
                    changes: Object.keys(updateData),
                });
                return user;
            });
        }
        catch (error) {
            this.logger.error('Failed to update user', {
                userId: updateUserInput.id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async deactivate(id, reason, currentUserId, ipAddress, userAgent) {
        try {
            const existingUser = await this.findOne(id);
            if (!existingUser.isActive) {
                throw new common_1.ConflictException('User is already deactivated');
            }
            return await this.auditService.withTransaction(async (tx, auditService) => {
                const user = await tx.user.update({
                    where: { id },
                    data: { isActive: false },
                });
                await auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.DELETE,
                    entityType: 'User',
                    entityId: user.id,
                    reason,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        action: 'deactivation',
                        previouslyActive: existingUser.isActive,
                    },
                }, tx);
                this.logger.log('User deactivated successfully', {
                    userId: user.id,
                    deactivatedBy: currentUserId,
                });
                return user;
            });
        }
        catch (error) {
            this.logger.error('Failed to deactivate user', {
                userId: id,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async changePassword(userId, newPassword, reason, currentUserId, ipAddress, userAgent) {
        try {
            await this.findOne(userId);
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            await this.auditService.withTransaction(async (tx, auditService) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { password: hashedPassword },
                });
                await auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.UPDATE,
                    entityType: 'User',
                    entityId: userId,
                    reason,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        action: 'password_change',
                    },
                }, tx);
            });
            this.logger.log('User password changed successfully', {
                userId,
                changedBy: currentUserId,
            });
            return true;
        }
        catch (error) {
            this.logger.error('Failed to change user password', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], UserService);
//# sourceMappingURL=user.service.js.map