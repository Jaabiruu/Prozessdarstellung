import { GraphQLContext } from '../common/interfaces/graphql-context.interface';
import { ProductionLineService } from './production-line.service';
import { ProductionLine } from './entities/production-line.entity';
import { CreateProductionLineInput } from './dto/create-production-line.input';
import { UpdateProductionLineInput } from './dto/update-production-line.input';
import { User as PrismaUser, ProductionLineStatus } from '@prisma/client';
import { User } from '../user/entities/user.entity';
export declare class ProductionLineResolver {
    private readonly productionLineService;
    constructor(productionLineService: ProductionLineService);
    createProductionLine(createProductionLineInput: CreateProductionLineInput, currentUser: PrismaUser, context: any): Promise<ProductionLine>;
    productionLines(limit: number, offset: number, isActive?: boolean, status?: ProductionLineStatus): Promise<ProductionLine[]>;
    productionLine(id: string): Promise<ProductionLine>;
    updateProductionLine(updateProductionLineInput: UpdateProductionLineInput, currentUser: PrismaUser, context: any): Promise<ProductionLine>;
    removeProductionLine(id: string, reason: string, currentUser: PrismaUser, context: any): Promise<ProductionLine>;
    creator(productionLine: ProductionLine, context: GraphQLContext): Promise<User | null>;
    processes(productionLine: ProductionLine, context: GraphQLContext): Promise<any[]>;
    processCount(productionLine: ProductionLine, context: GraphQLContext): Promise<number>;
}
