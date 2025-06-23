import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuditContext } from '../common/decorators/audit-context.decorator';
import type { AuditContext as AuditContextType } from '../common/decorators/audit-context.decorator';
import { User } from '@prisma/client';
import { GraphQLContext } from '../common/interfaces/graphql-context.interface';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Args('input') loginInput: LoginInput,
    @AuditContext() auditContext: AuditContextType,
  ): Promise<AuthResponse> {
    try {
      const result = await this.authService.login(
        loginInput,
        auditContext.ipAddress,
        auditContext.userAgent,
      );
      return result;
    } catch (error) {
      // Always return generic error message for security
      if (error instanceof UnauthorizedException) {
        throw error; // AuthService already provides generic message
      }

      // Log unexpected errors but don't expose details
      console.error('Unexpected login error:', error);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: User,
    @Context() context: GraphQLContext,
    @AuditContext() auditContext: AuditContextType,
  ): Promise<boolean> {
    const authHeader = context.req?.headers?.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const payload = this.authService.decodeToken(token);
      if (!payload || !payload.jti) {
        throw new UnauthorizedException('Invalid token');
      }

      const result = await this.authService.logout(
        payload.jti,
        user.id,
        auditContext.ipAddress,
        auditContext.userAgent,
      );
      if (!result) {
        throw new UnauthorizedException('Logout failed');
      }

      return result;
    } catch (error) {
      // Log error details but return generic message
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      console.error('Unexpected logout error:', error);
      throw new UnauthorizedException('Logout failed');
    }
  }
}
