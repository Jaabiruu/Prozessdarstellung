import DataLoader from 'dataloader';
import { PrismaService } from '../../database/prisma.service';
import { ProductionLine, Process } from '@prisma/client';
export declare class ProductionLineDataLoader {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createProductionLineLoader(): DataLoader<string, ProductionLine | null>;
    createProcessesByProductionLineLoader(): DataLoader<string, Process[]>;
}
