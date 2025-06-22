import { GraphQLContext } from '../common/interfaces/graphql-context.interface';
import { ProcessService } from './process.service';
import { Process } from './entities/process.entity';
import { CreateProcessInput } from './dto/create-process.input';
import { UpdateProcessInput } from './dto/update-process.input';
import { User as PrismaUser, ProcessStatus } from '@prisma/client';
import { User } from '../user/entities/user.entity';
import { ProductionLine } from '../production-line/entities/production-line.entity';
export declare class ProcessResolver {
    private readonly processService;
    constructor(processService: ProcessService);
    createProcess(createProcessInput: CreateProcessInput, currentUser: PrismaUser, context: any): Promise<Process>;
    processes(limit: number, offset: number, isActive?: boolean, status?: ProcessStatus, productionLineId?: string): Promise<Process[]>;
    process(id: string): Promise<Process>;
    processesByProductionLine(productionLineId: string, limit: number, offset: number, isActive?: boolean, status?: ProcessStatus): Promise<Process[]>;
    updateProcess(updateProcessInput: UpdateProcessInput, currentUser: PrismaUser, context: any): Promise<Process>;
    removeProcess(id: string, reason: string, currentUser: PrismaUser, context: any): Promise<Process>;
    creator(process: Process, context: GraphQLContext): Promise<User | null>;
    productionLine(process: Process, context: GraphQLContext): Promise<ProductionLine | null>;
}
