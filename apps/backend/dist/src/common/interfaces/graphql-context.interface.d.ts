import DataLoader from 'dataloader';
import { ProductionLine, Process } from '@prisma/client';
export interface GraphQLContext {
    req: any;
    res: any;
    dataloaders: {
        productionLineLoader: DataLoader<string, ProductionLine | null>;
        processLoader: DataLoader<string, Process | null>;
        userLoader: DataLoader<string, any | null>;
        processesByProductionLineLoader: DataLoader<string, any[]>;
    };
}
