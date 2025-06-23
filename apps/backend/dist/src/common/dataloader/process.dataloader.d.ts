import DataLoader from 'dataloader';
import { PrismaService } from '../../database/prisma.service';
import { Process } from '@prisma/client';
type UserForDataLoader = {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
};
export declare class ProcessDataLoader {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createProcessLoader(): DataLoader<string, Process | null>;
    createUserLoader(): DataLoader<string, UserForDataLoader | null>;
}
export {};
