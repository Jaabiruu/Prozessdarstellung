import { Resolver, Query, Mutation, Args, Context, ResolveField, Parent, Int } from '@nestjs/graphql';
import { GraphQLContext } from '../common/interfaces/graphql-context.interface';
import { UseGuards } from '@nestjs/common';
import { ProductionLineService } from './production-line.service';
import { ProductionLine } from './entities/production-line.entity';
import { CreateProductionLineInput } from './dto/create-production-line.input';
import { UpdateProductionLineInput } from './dto/update-production-line.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User as PrismaUser, ProductionLineStatus } from '@prisma/client';
import { User } from '../user/entities/user.entity';
import { Process } from '../process/entities/process.entity';
// Import will be resolved at runtime to avoid circular dependency

@Resolver(() => ProductionLine)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductionLineResolver {
  constructor(private readonly productionLineService: ProductionLineService) {}

  @Mutation(() => ProductionLine)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async createProductionLine(
    @Args('input') createProductionLineInput: CreateProductionLineInput,
    @CurrentUser() currentUser: PrismaUser,
    @Context() context: any,
  ): Promise<ProductionLine> {
    const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
    const userAgent = context.req?.get('user-agent');

    return this.productionLineService.create(
      createProductionLineInput,
      currentUser.id,
      ipAddress,
      userAgent,
    );
  }

  @Query(() => [ProductionLine])
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.QUALITY_ASSURANCE)
  async productionLines(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 }) limit: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
    @Args('isActive', { type: () => Boolean, nullable: true }) isActive?: boolean,
    @Args('status', { type: () => ProductionLineStatus, nullable: true }) status?: ProductionLineStatus,
  ): Promise<ProductionLine[]> {
    return this.productionLineService.findAll({
      limit,
      offset,
      ...(isActive !== undefined && { isActive }),
      ...(status && { status }),
    });
  }

  @Query(() => ProductionLine)
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.QUALITY_ASSURANCE)
  async productionLine(@Args('id') id: string): Promise<ProductionLine> {
    return this.productionLineService.findOne(id);
  }

  @Mutation(() => ProductionLine)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async updateProductionLine(
    @Args('input') updateProductionLineInput: UpdateProductionLineInput,
    @CurrentUser() currentUser: PrismaUser,
    @Context() context: any,
  ): Promise<ProductionLine> {
    const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
    const userAgent = context.req?.get('user-agent');

    return this.productionLineService.update(
      updateProductionLineInput,
      currentUser.id,
      ipAddress,
      userAgent,
    );
  }

  @Mutation(() => ProductionLine)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async removeProductionLine(
    @Args('id') id: string,
    @Args('reason') reason: string,
    @CurrentUser() currentUser: PrismaUser,
    @Context() context: any,
  ): Promise<ProductionLine> {
    const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
    const userAgent = context.req?.get('user-agent');

    return this.productionLineService.remove(
      id,
      reason,
      currentUser.id,
      ipAddress,
      userAgent,
    );
  }


  // Field resolvers for relationships - these will be optimized with DataLoader in Phase 4.3
  @ResolveField(() => User, { nullable: true })
  async creator(
    @Parent() productionLine: ProductionLine,
    @Context() context: GraphQLContext,
  ): Promise<User | null> {
    // Use DataLoader to prevent N+1 queries
    return context.dataloaders.userLoader.load(productionLine.createdBy);
  }

  @ResolveField(() => [Object], { nullable: true })
  async processes(
    @Parent() productionLine: ProductionLine,
    @Context() context: GraphQLContext,
  ): Promise<any[]> {
    // Use DataLoader to prevent N+1 queries
    return context.dataloaders.processesByProductionLineLoader.load(productionLine.id);
  }

  @ResolveField(() => Int, { nullable: true })
  async processCount(
    @Parent() productionLine: ProductionLine,
    @Context() context: GraphQLContext,
  ): Promise<number> {
    // Use DataLoader to get processes and return count
    const processes = await context.dataloaders.processesByProductionLineLoader.load(productionLine.id);
    return processes.length;
  }
}