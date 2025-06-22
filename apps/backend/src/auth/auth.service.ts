import { Injectable, UnauthorizedException, Logger, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '../config/config.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { LoginInput } from './dto/login.input';
import { AuthenticationResult, JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '@prisma/client';
import { AuditAction } from '../common/enums/user-role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly redis: Redis;
  private readonly JWT_BLOCKLIST_PREFIX = 'jwt:blocklist:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(this.config.redis.url);
  }

  async login(loginInput: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthenticationResult> {
    const { email, password } = loginInput;

    try {
      const user = await this.validateUser(email, password);
      
      if (!user.isActive) {
        this.logger.warn('Login attempt for inactive user', { email, ipAddress });
        throw new UnauthorizedException('Account is inactive');
      }

      const jti = uuidv4();
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        jti,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
      };

      const accessToken = this.jwtService.sign(payload);

      await this.createAuditLog({
        userId: user.id,
        action: AuditAction.VIEW,
        entityType: 'Authentication',
        entityId: user.id,
        reason: 'User login',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      });

      this.logger.log('User logged in successfully', { userId: user.id, email });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        accessToken,
      };
    } catch (error) {
      this.logger.error('Login failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress,
      });
      throw error;
    }
  }

  async logout(jti: string, userId: string): Promise<boolean> {
    try {
      const key = `${this.JWT_BLOCKLIST_PREFIX}${jti}`;
      const expirationTime = 24 * 60 * 60;
      
      await this.redis.setex(key, expirationTime, 'blocked');

      await this.createAuditLog({
        userId,
        action: AuditAction.VIEW,
        entityType: 'Authentication',
        entityId: userId,
        reason: 'User logout',
      });

      this.logger.log('User logged out successfully', { userId, jti: jti.substring(0, 8) });
      return true;
    } catch (error) {
      this.logger.error('Logout failed', {
        userId,
        jti: jti.substring(0, 8),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async isTokenBlocked(jti: string): Promise<boolean> {
    try {
      const key = `${this.JWT_BLOCKLIST_PREFIX}${jti}`;
      const result = await this.redis.get(key);
      return result === 'blocked';
    } catch (error) {
      this.logger.error('Error checking token blocklist', {
        jti: jti.substring(0, 8),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  async validateUser(email: string, password: string): Promise<User> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Generic error message - don't reveal if user exists
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        // Generic error message - don't reveal if password is wrong
        throw new UnauthorizedException('Invalid credentials');
      }

      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      // Log internal errors but return generic message
      this.logger.error('Error during user validation', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async validateJwtPayload(payload: JwtPayload): Promise<User | null> {
    try {
      // Validate payload structure
      if (!payload || !payload.sub || !payload.jti || !payload.email) {
        this.logger.warn('Invalid JWT payload structure', { 
          hasSubject: !!payload?.sub,
          hasJti: !!payload?.jti,
          hasEmail: !!payload?.email,
        });
        return null;
      }

      // Check token blocklist
      const isBlocked = await this.isTokenBlocked(payload.jti);
      if (isBlocked) {
        this.logger.warn('Blocked JWT token used', { 
          jti: payload.jti.substring(0, 8),
          userId: payload.sub,
        });
        return null;
      }

      // Validate user exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        this.logger.warn('JWT token for non-existent user', { 
          userId: payload.sub,
          jti: payload.jti.substring(0, 8),
        });
        return null;
      }

      if (!user.isActive) {
        this.logger.warn('JWT token for inactive user', { 
          userId: payload.sub,
          email: user.email,
          jti: payload.jti.substring(0, 8),
        });
        return null;
      }

      // Validate email matches (prevent token reuse)
      if (user.email !== payload.email) {
        this.logger.warn('JWT token email mismatch', { 
          userId: payload.sub,
          tokenEmail: payload.email,
          userEmail: user.email,
          jti: payload.jti.substring(0, 8),
        });
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error('JWT validation failed', {
        sub: payload?.sub || 'unknown',
        jti: payload?.jti?.substring(0, 8) || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode(token) as JwtPayload;
    } catch (error) {
      this.logger.error('Token decode failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  private async createAuditLog(auditData: {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    reason: string;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: auditData,
      });
    } catch (error: any) {
      // Handle Prisma P2002 unique constraint violation
      if (error.code === 'P2002') {
        this.logger.warn('Audit log constraint violation', {
          userId: auditData.userId,
          action: auditData.action,
          constraint: error.meta?.target,
        });
        throw new ConflictException('Audit log already exists for this operation');
      }
      
      this.logger.error('Failed to create audit log', {
        userId: auditData.userId,
        action: auditData.action,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
