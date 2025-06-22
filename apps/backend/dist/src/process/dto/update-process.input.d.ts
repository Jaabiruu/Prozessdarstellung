import { ProcessStatus } from '@prisma/client';
export declare class UpdateProcessInput {
    id: string;
    title?: string;
    description?: string;
    duration?: number;
    progress?: number;
    status?: ProcessStatus;
    x?: number;
    y?: number;
    color?: string;
    reason?: string;
}
