"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../database/prisma.service");
const config_service_1 = require("../config/config.service");
const bcrypt = __importStar(require("bcrypt"));
const uuid_1 = require("uuid");
const ioredis_1 = __importDefault(require("ioredis"));
const user_role_enum_1 = require("../common/enums/user-role.enum");
const audit_service_1 = require("../audit/audit.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    config;
    auditService;
    logger = new common_1.Logger(AuthService_1.name);
    redis;
    JWT_BLOCKLIST_PREFIX = 'jwt:blocklist:';
    constructor(prisma, jwtService, config, auditService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.auditService = auditService;
        this.redis = new ioredis_1.default(this.config.redis.url);
    }
    async login(loginInput, ipAddress, userAgent) {
        const { email, password } = loginInput;
        try {
            const user = await this.validateUser(email, password);
            if (!user.isActive) {
                this.logger.warn('Login attempt for inactive user', {
                    email,
                    ipAddress,
                });
                throw new common_1.UnauthorizedException('Account is inactive');
            }
            const jti = (0, uuid_1.v4)();
            const payload = {
                sub: user.id,
                email: user.email,
                role: user.role,
                jti,
            };
            const accessToken = this.jwtService.sign(payload);
            await this.auditService.create({
                userId: user.id,
                action: user_role_enum_1.AuditAction.VIEW,
                entityType: 'Authentication',
                entityId: user.id,
                reason: 'User login',
                ipAddress: ipAddress || null,
                userAgent: userAgent || null,
            });
            this.logger.log('User logged in successfully', {
                userId: user.id,
                email,
            });
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
    async logout(jti, userId, ipAddress, userAgent) {
        try {
            const key = `${this.JWT_BLOCKLIST_PREFIX}${jti}`;
            const expirationTime = 24 * 60 * 60;
            await this.redis.setex(key, expirationTime, 'blocked');
            await this.auditService.create({
                userId,
                action: user_role_enum_1.AuditAction.VIEW,
                entityType: 'Authentication',
                entityId: userId,
                reason: 'User logout',
                ipAddress,
                userAgent,
            });
            this.logger.log('User logged out successfully', {
                userId,
                jti: jti.substring(0, 8),
            });
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
        try {
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
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error('Error during user validation', {
                email,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
    }
    async validateJwtPayload(payload) {
        try {
            if (!payload || !payload.sub || !payload.jti || !payload.email) {
                this.logger.warn('Invalid JWT payload structure', {
                    hasSubject: !!payload?.sub,
                    hasJti: !!payload?.jti,
                    hasEmail: !!payload?.email,
                });
                return null;
            }
            const isBlocked = await this.isTokenBlocked(payload.jti);
            if (isBlocked) {
                this.logger.warn('Blocked JWT token used', {
                    jti: payload.jti.substring(0, 8),
                    userId: payload.sub,
                });
                return null;
            }
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
        }
        catch (error) {
            this.logger.error('JWT validation failed', {
                sub: payload?.sub || 'unknown',
                jti: payload?.jti?.substring(0, 8) || 'unknown',
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
            this.logger.error('Token decode failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return null;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_service_1.ConfigService,
        audit_service_1.AuditService])
], AuthService);
//# sourceMappingURL=auth.service.js.map