import { Resolver, Query, Mutation, Args, Context, ResolveField, Parent, Int } from '@nestjs/graphql';
import { GraphQLContext } from '../common/interfaces/graphql-context.interface';
import { UseGuards } from '@nestjs/common';
import { ProcessService } from './process.service';
import { Process } from './entities/process.entity';
import { CreateProcessInput } from './dto/create-process.input';
import { UpdateProcessInput } from './dto/update-process.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User as PrismaUser, ProcessStatus } from '@prisma/client';
import { User } from '../user/entities/user.entity';
import { ProductionLine } from '../production-line/entities/production-line.entity';

@Resolver(() => Process)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProcessResolver {
  constructor(private readonly processService: ProcessService) {}

  @Mutation(() => Process)
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN)
  async createProcess(
    @Args('input') createProcessInput: CreateProcessInput,
    @CurrentUser() currentUser: PrismaUser,
    @Context() context: any,
  ): Promise<Process> {
    const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
    const userAgent = context.req?.get('user-agent');

    return this.processService.create(
      createProcessInput,
      currentUser.id,
      ipAddress,
      userAgent,
    );
  }

  @Query(() => [Process])
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.QUALITY_ASSURANCE)
  async processes(
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 }) limit: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
    @Args('isActive', { type: () => Boolean, nullable: true }) isActive?: boolean,
    @Args('status', { type: () => ProcessStatus, nullable: true }) status?: ProcessStatus,
    @Args('productionLineId', { nullable: true }) productionLineId?: string,
  ): Promise<Process[]> {
    return this.processService.findAll({
      limit,
      offset,
      ...(isActive !== undefined && { isActive }),
      ...(status && { status }),
      ...(productionLineId && { productionLineId }),
    });
  }

  @Query(() => Process)
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.QUALITY_ASSURANCE)
  async process(@Args('id') id: string): Promise<Process> {
    return this.processService.findOne(id);
  }

  @Query(() => [Process])
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN, UserRole.QUALITY_ASSURANCE)
  async processesByProductionLine(
    @Args('productionLineId') productionLineId: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 100 }) limit: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
    @Args('isActive', { type: () => Boolean, nullable: true }) isActive?: boolean,
    @Args('status', { type: () => ProcessStatus, nullable: true }) status?: ProcessStatus,
  ): Promise<Process[]> {
    return this.processService.findAllByProductionLine(productionLineId, {
      limit,
      offset,
      ...(isActive !== undefined && { isActive }),
      ...(status && { status }),
    });
  }

  @Mutation(() => Process)
  @Roles(UserRole.OPERATOR, UserRole.MANAGER, UserRole.ADMIN)
  async updateProcess(
    @Args('input') updateProcessInput: UpdateProcessInput,
    @CurrentUser() currentUser: PrismaUser,
    @Context() context: any,
  ): Promise<Process> {
    const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
    const userAgent = context.req?.get('user-agent');

    return this.processService.update(
      updateProcessInput,
      currentUser.id,
      ipAddress,
      userAgent,
    );
  }

  @Mutation(() => Process)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async removeProcess(
    @Args('id') id: string,
    @Args('reason') reason: string,
    @CurrentUser() currentUser: PrismaUser,
    @Context() context: any,
  ): Promise<Process> {
    const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
    const userAgent = context.req?.get('user-agent');

    return this.processService.remove(
      id,
      reason,
      currentUser.id,
      ipAddress,
      userAgent,
    );
  }

  // Field resolvers for relationships - optimized with DataLoader
  @ResolveField(() => User, { nullable: true })
  async creator(
    @Parent() process: Process,
    @Context() context: GraphQLContext,
  ): Promise<User | null> {
    // Use DataLoader to prevent N+1 queries
    return context.dataloaders.userLoader.load(process.createdBy);
  }

  @ResolveField(() => ProductionLine, { nullable: true })
  async productionLine(
    @Parent() process: Process,
    @Context() context: GraphQLContext,
  ): Promise<ProductionLine | null> {
    // Use DataLoader to prevent N+1 queries
    return context.dataloaders.productionLineLoader.load(process.productionLineId);
  }
}