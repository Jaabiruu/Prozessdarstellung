import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User } from '@prisma/client';
import { AuditAction, UserRole } from '../common/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createUserInput: CreateUserInput,
    currentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
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

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.CREATE,
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
          },
          tx,
        );

        this.logger.log('User created successfully', {
          userId: user.id,
          email: user.email,
          role: user.role,
          createdBy: currentUserId,
        });

        return user;
      });
    } catch (error) {
      // Handle Prisma unique constraint violation (P2002)
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('User with this email already exists');
      }

      this.logger.error('Failed to create user', {
        email: createUserInput.email,
        role: createUserInput.role,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findAll(
    options?: {
      limit?: number;
      offset?: number;
      isActive?: boolean;
      role?: string;
    },
  ): Promise<User[]> {
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
    } catch (error) {
      this.logger.error('Failed to fetch users', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findOne(id: string): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      this.logger.error('Failed to fetch user', {
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async update(
    updateUserInput: UpdateUserInput,
    currentUserId: string,
    currentUserRole: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Fetch existing user within transaction to get "before" state for audit
        const existingUser = await tx.user.findUnique({
          where: { id: updateUserInput.id },
        });

        if (!existingUser) {
          throw new NotFoundException(`User with ID ${updateUserInput.id} not found`);
        }

        // Role change authorization check
        if (updateUserInput.role && updateUserInput.role !== existingUser.role) {
          if (currentUserRole !== UserRole.ADMIN) {
            throw new ForbiddenException('Only administrators can change user roles');
          }
        }

        const updateData: any = {};
        
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

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.UPDATE,
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
          },
          tx,
        );

        this.logger.log('User updated successfully', {
          userId: user.id,
          updatedBy: currentUserId,
          changes: Object.keys(updateData),
        });

        return user;
      });
    } catch (error) {
      this.logger.error('Failed to update user', {
        userId: updateUserInput.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async deactivate(
    id: string,
    reason: string,
    currentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<User> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Fetch existing user within transaction to get "before" state for audit
        const existingUser = await tx.user.findUnique({
          where: { id },
        });

        if (!existingUser) {
          throw new NotFoundException(`User with ID ${id} not found`);
        }

        if (!existingUser.isActive) {
          throw new ConflictException('User is already deactivated');
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

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.DELETE,
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
          },
          tx,
        );

        this.logger.log('User deactivated successfully', {
          userId: user.id,
          deactivatedBy: currentUserId,
        });

        return user;
      });
    } catch (error) {
      this.logger.error('Failed to deactivate user', {
        userId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async changePassword(
    userId: string,
    newPassword: string,
    reason: string,
    currentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      await this.prisma.$transaction(async (tx) => {
        // Verify user exists within transaction
        const existingUser = await tx.user.findUnique({
          where: { id: userId },
        });

        if (!existingUser) {
          throw new NotFoundException(`User with ID ${userId} not found`);
        }

        await tx.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
        });

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.UPDATE,
            entityType: 'User',
            entityId: userId,
            reason,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            details: {
              action: 'password_change',
            },
          },
          tx,
        );
      });

      this.logger.log('User password changed successfully', {
        userId,
        changedBy: currentUserId,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to change user password', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async testTransactionRollback(
    testUserEmail: string,
    currentUserId: string,
    shouldFail: boolean = true,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const testUser = await tx.user.create({
          data: {
            email: testUserEmail,
            password: await bcrypt.hash('temp-password', 12),
            firstName: 'Test',
            lastName: 'User',
            role: UserRole.OPERATOR,
          },
        });

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.CREATE,
            entityType: 'User',
            entityId: testUser.id,
            reason: 'Transaction rollback test',
            details: {
              testScenario: 'forced_rollback',
              email: testUser.email,
            },
          },
          tx,
        );

        if (shouldFail) {
          throw new Error('Intentional rollback for testing transaction atomicity');
        }

        return testUser;
      });

      return {
        success: true,
        message: 'Transaction completed successfully',
      };
    } catch (error) {
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
}
