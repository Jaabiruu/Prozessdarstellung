import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProcessInput } from './dto/create-process.input';
import { UpdateProcessInput } from './dto/update-process.input';
import { Process, ProcessStatus } from '@prisma/client';
export declare class ProcessService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    create(createProcessInput: CreateProcessInput, currentUserId: string, ipAddress?: string, userAgent?: string): Promise<Process>;
    findAll(options?: {
        limit?: number;
        offset?: number;
        isActive?: boolean;
        status?: ProcessStatus;
        productionLineId?: string;
    }): Promise<Process[]>;
    findOne(id: string): Promise<Process>;
    findAllByProductionLine(productionLineId: string, options?: {
        limit?: number;
        offset?: number;
        isActive?: boolean;
        status?: ProcessStatus;
    }): Promise<Process[]>;
    update(updateProcessInput: UpdateProcessInput, currentUserId: string, ipAddress?: string, userAgent?: string): Promise<Process>;
    remove(id: string, reason: string, currentUserId: string, ipAddress?: string, userAgent?: string): Promise<Process>;
}
