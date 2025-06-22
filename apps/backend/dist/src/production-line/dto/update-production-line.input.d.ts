import { ProductionLineStatus } from '@prisma/client';
export declare class UpdateProductionLineInput {
    id: string;
    name?: string;
    status?: ProductionLineStatus;
    reason?: string;
}
