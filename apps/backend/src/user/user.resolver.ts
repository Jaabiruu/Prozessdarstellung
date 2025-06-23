import {
  Resolver,
  Query,
  Mutation,
  Args,
  ObjectType,
  Field,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditContext } from '../common/decorators/audit-context.decorator';
import type { AuditContext as AuditContextType } from '../common/decorators/audit-context.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { User as PrismaUser } from '@prisma/client';

@ObjectType()
export class TransactionTestResult {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}

@Resolver(() => User)
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Mutation(() => User)
  @Roles(UserRole.ADMIN)
  async createUser(
    @Args('input') createUserInput: CreateUserInput,
    @CurrentUser() currentUser: PrismaUser,
    @AuditContext() auditContext: AuditContextType,
  ): Promise<User> {
    return this.userService.create(
      createUserInput,
      currentUser.id,
      auditContext.ipAddress,
      auditContext.userAgent,
    );
  }

  @Query(() => [User])
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async users(
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 100 })
    limit: number,
    @Args('offset', { type: () => Number, nullable: true, defaultValue: 0 })
    offset: number,
    @Args('isActive', { type: () => Boolean, nullable: true })
    isActive?: boolean,
    @Args('role', { type: () => String, nullable: true }) role?: string,
  ): Promise<User[]> {
    return this.userService.findAll({
      limit,
      offset,
      ...(isActive !== undefined && { isActive }),
      ...(role && { role }),
    });
  }

  @Query(() => User)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async user(@Args('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Query(() => User)
  async me(@CurrentUser() currentUser: PrismaUser): Promise<User> {
    return this.userService.findOne(currentUser.id);
  }

  @Mutation(() => User)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async updateUser(
    @Args('input') updateUserInput: UpdateUserInput,
    @CurrentUser() currentUser: PrismaUser,
    @AuditContext() auditContext: AuditContextType,
  ): Promise<User> {
    return this.userService.update(
      updateUserInput,
      currentUser.id,
      currentUser.role,
      auditContext.ipAddress,
      auditContext.userAgent,
    );
  }

  @Mutation(() => User)
  @Roles(UserRole.ADMIN)
  async deactivateUser(
    @Args('id') id: string,
    @Args('reason') reason: string,
    @CurrentUser() currentUser: PrismaUser,
    @AuditContext() auditContext: AuditContextType,
  ): Promise<User> {
    return this.userService.deactivate(
      id,
      reason,
      currentUser.id,
      auditContext.ipAddress,
      auditContext.userAgent,
    );
  }

  @Mutation(() => Boolean)
  async changePassword(
    @Args('userId') userId: string,
    @Args('newPassword') newPassword: string,
    @Args('reason') reason: string,
    @CurrentUser() currentUser: PrismaUser,
    @AuditContext() auditContext: AuditContextType,
  ): Promise<boolean> {
    return this.userService.changePassword(
      userId,
      newPassword,
      reason,
      currentUser.id,
      auditContext.ipAddress,
      auditContext.userAgent,
    );
  }

  @Mutation(() => TransactionTestResult)
  @Roles(UserRole.ADMIN)
  async testTransactionRollback(
    @Args('testUserEmail') testUserEmail: string,
    @Args('shouldFail', { type: () => Boolean, defaultValue: true })
    shouldFail: boolean,
    @CurrentUser() currentUser: PrismaUser,
  ): Promise<TransactionTestResult> {
    return this.userService.testTransactionRollback(
      testUserEmail,
      currentUser.id,
      shouldFail,
    );
  }
}
