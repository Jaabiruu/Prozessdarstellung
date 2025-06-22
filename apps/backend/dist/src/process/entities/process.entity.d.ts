import { ProcessStatus } from '@prisma/client';
import { User } from '../../user/entities/user.entity';
import { ProductionLine } from '../../production-line/entities/production-line.entity';
export declare class Process {
    id: string;
    title: string;
    description?: string | null;
    duration?: number | null;
    progress: number;
    status: ProcessStatus;
    x: number;
    y: number;
    color: string;
    version: number;
    isActive: boolean;
    parentId?: string | null;
    productionLineId: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    reason: string;
    creator?: User;
    productionLine?: ProductionLine;
}
