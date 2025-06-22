"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../database/prisma.service");
const config_service_1 = require("../config/config.service");
const bcrypt = require("bcrypt");
const uuid_1 = require("uuid");
const ioredis_1 = require("ioredis");
const user_role_enum_1 = require("../common/enums/user-role.enum");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.JWT_BLOCKLIST_PREFIX = 'jwt:blocklist:';
        this.redis = new ioredis_1.default(this.config.redis.url);
    }
    async login(loginInput, ipAddress, userAgent) {
        const { email, password } = loginInput;
        try {
            const user = await this.validateUser(email, password);
            if (!user.isActive) {
                this.logger.warn('Login attempt for inactive user', { email, ipAddress });
                throw new common_1.UnauthorizedException('Account is inactive');
            }
            const jti = (0, uuid_1.v4)();
            const payload = {
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
                action: user_role_enum_1.AuditAction.VIEW,
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
        }
        catch (error) {
            this.logger.error('Login failed', {
                email,
                error: error instanceof Error ? error.message : 'Unknown error',
                ipAddress,
            });
            throw error;
        }
    }
    async logout(jti, userId) {
        try {
            const key = `${this.JWT_BLOCKLIST_PREFIX}${jti}`;
            const expirationTime = 24 * 60 * 60;
            await this.redis.setex(key, expirationTime, 'blocked');
            await this.createAuditLog({
                userId,
                action: user_role_enum_1.AuditAction.VIEW,
                entityType: 'Authentication',
                entityId: userId,
                reason: 'User logout',
            });
            this.logger.log('User logged out successfully', { userId, jti: jti.substring(0, 8) });
            return true;
        }
        catch (error) {
            this.logger.error('Logout failed', {
                userId,
                jti: jti.substring(0, 8),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }
    async isTokenBlocked(jti) {
        try {
            const key = `${this.JWT_BLOCKLIST_PREFIX}${jti}`;
            const result = await this.redis.get(key);
            return result === 'blocked';
        }
        catch (error) {
            this.logger.error('Error checking token blocklist', {
                jti: jti.substring(0, 8),
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return user;
    }
    async validateJwtPayload(payload) {
        try {
            const isBlocked = await this.isTokenBlocked(payload.jti);
            if (isBlocked) {
                this.logger.warn('Blocked JWT token used', { jti: payload.jti.substring(0, 8) });
                return null;
            }
            const user = await this.prisma.user.findUnique({
                where: { id: payload.sub },
            });
            if (!user || !user.isActive) {
                return null;
            }
            return user;
        }
        catch (error) {
            this.logger.error('JWT validation failed', {
                sub: payload.sub,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
    decodeToken(token) {
        try {
            return this.jwtService.decode(token);
        }
        catch (error) {
            this.logger.error('Token decode failed', { error: error instanceof Error ? error.message : 'Unknown error' });
            return null;
        }
    }
    async createAuditLog(auditData) {
        try {
            await this.prisma.auditLog.create({
                data: auditData,
            });
        }
        catch (error) {
            this.logger.error('Failed to create audit log', {
                userId: auditData.userId,
                action: auditData.action,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_service_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map