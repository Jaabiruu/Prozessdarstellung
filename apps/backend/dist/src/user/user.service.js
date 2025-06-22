"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const user_role_enum_1 = require("../common/enums/user-role.enum");
const bcrypt = __importStar(require("bcrypt"));
let UserService = UserService_1 = class UserService {
    prisma;
    auditService;
    logger = new common_1.Logger(UserService_1.name);
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async create(createUserInput, currentUserId, ipAddress, userAgent) {
        try {
            const hashedPassword = await bcrypt.hash(createUserInput.password, 12);
            return await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        email: createUserInput.email,
                        password: hashedPassword,
                        firstName: createUserInput.firstName || null,
                        lastName: createUserInput.lastName || null,
                        role: createUserInput.role,
                    },
                });
                await this.auditService.create({
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
            if (error instanceof Error && 'code' in error && error.code === 'P2002') {
                throw new common_1.ConflictException('User with this email already exists');
            }
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
            return await this.prisma.$transaction(async (tx) => {
                const existingUser = await tx.user.findUnique({
                    where: { id: updateUserInput.id },
                });
                if (!existingUser) {
                    throw new common_1.NotFoundException(`User with ID ${updateUserInput.id} not found`);
                }
                if (updateUserInput.role && updateUserInput.role !== existingUser.role) {
                    if (currentUserRole !== user_role_enum_1.UserRole.ADMIN) {
                        throw new common_1.ForbiddenException('Only administrators can change user roles');
                    }
                }
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
                await this.auditService.create({
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
            return await this.prisma.$transaction(async (tx) => {
                const existingUser = await tx.user.findUnique({
                    where: { id },
                });
                if (!existingUser) {
                    throw new common_1.NotFoundException(`User with ID ${id} not found`);
                }
                if (!existingUser.isActive) {
                    throw new common_1.ConflictException('User is already deactivated');
                }
                const anonymizedEmail = `anonymized_${id.substring(0, 8)}@deleted.local`;
                const anonymizedFirstName = `DELETED_USER_${id.substring(0, 8)}`;
                const anonymizedLastName = 'ANONYMIZED';
                const user = await tx.user.update({
                    where: { id },
                    data: {
                        isActive: false,
                        email: anonymizedEmail,
                        firstName: anonymizedFirstName,
                        lastName: anonymizedLastName,
                    },
                });
                await this.auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.DELETE,
                    entityType: 'User',
                    entityId: user.id,
                    reason,
                    ipAddress: ipAddress || null,
                    userAgent: userAgent || null,
                    details: {
                        action: 'deactivation_with_pii_anonymization',
                        previouslyActive: existingUser.isActive,
                        originalEmail: existingUser.email,
                        originalFirstName: existingUser.firstName,
                        originalLastName: existingUser.lastName,
                        anonymizedEmail,
                        anonymizedFirstName,
                        anonymizedLastName,
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
            const hashedPassword = await bcrypt.hash(newPassword, 12);
            await this.prisma.$transaction(async (tx) => {
                const existingUser = await tx.user.findUnique({
                    where: { id: userId },
                });
                if (!existingUser) {
                    throw new common_1.NotFoundException(`User with ID ${userId} not found`);
                }
                await tx.user.update({
                    where: { id: userId },
                    data: { password: hashedPassword },
                });
                await this.auditService.create({
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
    async testTransactionRollback(testUserEmail, currentUserId, shouldFail = true) {
        try {
            await this.prisma.$transaction(async (tx) => {
                const testUser = await tx.user.create({
                    data: {
                        email: testUserEmail,
                        password: await bcrypt.hash('temp-password', 12),
                        firstName: 'Test',
                        lastName: 'User',
                        role: user_role_enum_1.UserRole.OPERATOR,
                    },
                });
                await this.auditService.create({
                    userId: currentUserId,
                    action: user_role_enum_1.AuditAction.CREATE,
                    entityType: 'User',
                    entityId: testUser.id,
                    reason: 'Transaction rollback test',
                    details: {
                        testScenario: 'forced_rollback',
                        email: testUser.email,
                    },
                }, tx);
                if (shouldFail) {
                    throw new Error('Intentional rollback for testing transaction atomicity');
                }
                return testUser;
            });
            return {
                success: true,
                message: 'Transaction completed successfully',
            };
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Intentional rollback')) {
                return {
                    success: false,
                    message: 'Transaction rolled back as expected',
                };
            }
            this.logger.error('Unexpected error in transaction rollback test', {
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