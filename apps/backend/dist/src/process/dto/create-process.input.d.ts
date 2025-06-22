import { ProcessStatus } from '@prisma/client';
export declare class CreateProcessInput {
    title: string;
    description?: string;
    duration?: number;
    progress?: number;
    status?: ProcessStatus;
    x?: number;
    y?: number;
    color?: string;
    productionLineId: string;
    reason?: string;
}
