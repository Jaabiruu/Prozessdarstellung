import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '@prisma/client';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthResponse)
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Args('input') loginInput: LoginInput,
    @Context() context: any,
  ): Promise<AuthResponse> {
    const ipAddress = context.req?.ip || context.req?.connection?.remoteAddress;
    const userAgent = context.req?.get('user-agent');

    try {
      const result = await this.authService.login(loginInput, ipAddress, userAgent);
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
    @Context() context: any,
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

      const result = await this.authService.logout(payload.jti, user.id);
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
