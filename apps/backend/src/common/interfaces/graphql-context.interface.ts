import DataLoader from 'dataloader';
import { ProductionLine, Process } from '@prisma/client';
import { Request, Response } from 'express';

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

export interface GraphQLContext {
  req: Request;
  res: Response;
  dataloaders: {
    productionLineLoader: DataLoader<string, ProductionLine | null>;
    processLoader: DataLoader<string, Process | null>;
    userLoader: DataLoader<string, UserForDataLoader | null>;
    processesByProductionLineLoader: DataLoader<string, Process[]>;
  };
}
