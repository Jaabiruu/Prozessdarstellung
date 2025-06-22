import { PrismaService } from '../database/prisma.service';
import { AuditContext } from './interfaces/audit-context.interface';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditLog, Prisma } from '@prisma/client';
export declare class AuditService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(auditData: CreateAuditLogDto, transaction?: Prisma.TransactionClient): Promise<AuditLog>;
    createFromContext(context: AuditContext, transaction?: Prisma.TransactionClient): Promise<AuditLog>;
    findAllByEntity(entityType: string, entityId: string, options?: {
        limit?: number;
        offset?: number;
        userId?: string;
    }): Promise<AuditLog[]>;
    findAllByUser(userId: string, options?: {
        limit?: number;
        offset?: number;
        entityType?: string;
    }): Promise<AuditLog[]>;
}
