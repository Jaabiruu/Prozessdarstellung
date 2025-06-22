import { ProductionLineStatus } from '@prisma/client';
export declare class CreateProductionLineInput {
    name: string;
    status?: ProductionLineStatus;
    reason?: string;
}
