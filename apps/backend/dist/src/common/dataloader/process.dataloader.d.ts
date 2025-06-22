import DataLoader from 'dataloader';
import { PrismaService } from '../../database/prisma.service';
import { Process } from '@prisma/client';
export declare class ProcessDataLoader {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createProcessLoader(): DataLoader<string, Process | null>;
    createUserLoader(): DataLoader<string, any | null>;
}
