import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { ConfigService } from '../config/config.service';
import { LoginInput } from './dto/login.input';
import { AuthenticationResult, JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '@prisma/client';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly config;
    private readonly logger;
    private readonly redis;
    private readonly JWT_BLOCKLIST_PREFIX;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService);
    login(loginInput: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthenticationResult>;
    logout(jti: string, userId: string): Promise<boolean>;
    isTokenBlocked(jti: string): Promise<boolean>;
    validateUser(email: string, password: string): Promise<User>;
    validateJwtPayload(payload: JwtPayload): Promise<User | null>;
    decodeToken(token: string): JwtPayload | null;
    private createAuditLog;
}
