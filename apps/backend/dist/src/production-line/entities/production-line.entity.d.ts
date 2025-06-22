import { ProductionLineStatus } from '@prisma/client';
import { User } from '../../user/entities/user.entity';
import { Process } from '../../process/entities/process.entity';
export declare class ProductionLine {
    id: string;
    name: string;
    status: ProductionLineStatus;
    version: number;
    isActive: boolean;
    parentId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    reason: string;
    creator?: User;
    processes?: Process[];
    processCount?: number;
}
