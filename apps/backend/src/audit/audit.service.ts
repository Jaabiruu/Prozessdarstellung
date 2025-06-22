import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditContext } from './interfaces/audit-context.interface';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLog, Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    auditData: CreateAuditLogDto,
    transaction?: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    try {
      const prismaClient = transaction || this.prisma;
      
      const createData: any = {
        userId: auditData.userId,
        action: auditData.action,
        entityType: auditData.entityType,
        entityId: auditData.entityId,
        reason: auditData.reason,
      };

      if (auditData.ipAddress) {
        createData.ipAddress = auditData.ipAddress;
      }

      if (auditData.userAgent) {
        createData.userAgent = auditData.userAgent;
      }

      if (auditData.details) {
        createData.details = auditData.details;
      }

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
    } catch (error) {
      this.logger.error('Failed to create audit log', {
        userId: auditData.userId,
        action: auditData.action,
        entityType: auditData.entityType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async createFromContext(
    context: AuditContext,
    transaction?: Prisma.TransactionClient,
  ): Promise<AuditLog> {
    return this.create(
      {
        userId: context.userId,
        action: context.action,
        entityType: context.entityType,
        entityId: context.entityId,
        reason: context.reason,
        ipAddress: context.ipAddress || null,
        userAgent: context.userAgent || null,
        details: context.details || null,
      },
      transaction,
    );
  }

  async findAllByEntity(
    entityType: string,
    entityId: string,
    options?: {
      limit?: number;
      offset?: number;
      userId?: string;
    },
  ): Promise<AuditLog[]> {
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
    } catch (error) {
      this.logger.error('Failed to fetch audit logs', {
        entityType,
        entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findAllByUser(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      entityType?: string;
    },
  ): Promise<AuditLog[]> {
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
    } catch (error) {
      this.logger.error('Failed to fetch user audit logs', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

}
