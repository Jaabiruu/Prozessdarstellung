import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CacheService } from '../common/cache/cache.service';
import { CreateProductionLineInput } from './dto/create-production-line.input';
import { UpdateProductionLineInput } from './dto/update-production-line.input';
import { ProductionLine, ProductionLineStatus } from '@prisma/client';
export declare class ProductionLineService {
    private readonly prisma;
    private readonly auditService;
    private readonly cacheService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService, cacheService: CacheService, eventEmitter: EventEmitter2);
    create(createProductionLineInput: CreateProductionLineInput, currentUserId: string, ipAddress?: string, userAgent?: string): Promise<ProductionLine>;
    findAll(options?: {
        limit?: number;
        offset?: number;
        isActive?: boolean;
        status?: ProductionLineStatus;
    }): Promise<ProductionLine[]>;
    findOne(id: string): Promise<ProductionLine>;
    update(updateProductionLineInput: UpdateProductionLineInput, currentUserId: string, ipAddress?: string, userAgent?: string): Promise<ProductionLine>;
    remove(id: string, reason: string, currentUserId: string, ipAddress?: string, userAgent?: string): Promise<ProductionLine>;
}
