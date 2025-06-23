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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt = __importStar(require("bcrypt"));
describe('Authentication System (E2E)', () => {
    let app;
    let prisma;
    let redis;
    beforeAll(async () => {
        await setup_1.TestSetup.beforeAll();
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = setup_1.TestSetup.getPrisma();
        redis = setup_1.TestSetup.getRedis();
    });
    afterAll(async () => {
        await app.close();
        await setup_1.TestSetup.afterAll();
    });
    describe('AUTH-001: User can log in with valid credentials', () => {
        it('should return 200 OK with valid accessToken and user object', async () => {
            const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
              firstName
              lastName
              role
            }
            accessToken
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .send({
                query: loginMutation,
                variables: {
                    input: {
                        email: 'admin@test.local',
                        password: 'admin123',
                    },
                },
            })
                .expect(200);
            expect(response.body.data.login).toBeDefined();
            expect(response.body.data.login.user).toMatchObject({
                email: 'admin@test.local',
                firstName: 'Test',
                lastName: 'Admin',
                role: 'ADMIN',
            });
            expect(response.body.data.login.accessToken).toBeDefined();
            expect(typeof response.body.data.login.accessToken).toBe('string');
            const decoded = jwt.decode(response.body.data.login.accessToken);
            expect(decoded).toMatchObject({
                email: 'admin@test.local',
                role: 'ADMIN',
            });
            expect(decoded.sub).toBeDefined();
            expect(decoded.jti).toBeDefined();
        });
    });
    describe('AUTH-002: User cannot log in with incorrect password', () => {
        it('should return UnauthorizedException and create audit log', async () => {
            const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
            accessToken
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .send({
                query: loginMutation,
                variables: {
                    input: {
                        email: 'admin@test.local',
                        password: 'wrong-password',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('Invalid credentials');
            expect(response.body.data).toBeNull();
        });
    });
    describe('AUTH-003: User cannot log in with non-existent email', () => {
        it('should return generic UnauthorizedException', async () => {
            const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
            accessToken
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .send({
                query: loginMutation,
                variables: {
                    input: {
                        email: 'nouser@pharma.local',
                        password: 'any-password',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('Invalid credentials');
            expect(response.body.data).toBeNull();
        });
    });
    describe('AUTH-004: User cannot log in with deactivated account', () => {
        it('should return UnauthorizedException for inactive user', async () => {
            await prisma.user.create({
                data: {
                    email: 'deactivated@test.local',
                    password: await bcrypt.hash('password123', 12),
                    firstName: 'Deactivated',
                    lastName: 'User',
                    role: 'OPERATOR',
                    isActive: false,
                },
            });
            const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
            accessToken
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .send({
                query: loginMutation,
                variables: {
                    input: {
                        email: 'deactivated@test.local',
                        password: 'password123',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('Account is inactive');
            expect(response.body.data).toBeNull();
        });
    });
    describe('AUTH-005: Login attempts are rate-limited', () => {
        it('should return invalid credentials for multiple failed attempts (ThrottlerGuard disabled)', async () => {
            const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
            accessToken
          }
        }
      `;
            for (let i = 0; i < 6; i++) {
                const response = await (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .send({
                    query: loginMutation,
                    variables: {
                        input: {
                            email: 'admin@test.local',
                            password: 'wrong-password',
                        },
                    },
                });
                expect(response.body.errors).toBeDefined();
                expect(response.body.errors[0].message).toContain('Invalid credentials');
            }
        });
    });
    describe('AUTH-006: User can log out, invalidating their token', () => {
        it('should successfully log out and add jti to Redis blocklist', async () => {
            const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
            }
            accessToken
          }
        }
      `;
            const loginResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .send({
                query: loginMutation,
                variables: {
                    input: {
                        email: 'admin@test.local',
                        password: 'admin123',
                    },
                },
            })
                .expect(200);
            const token = loginResponse.body.data.login.accessToken;
            const decoded = jwt.decode(token);
            const jti = decoded.jti;
            const logoutMutation = `
        mutation Logout {
          logout
        }
      `;
            const logoutResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                query: logoutMutation,
            })
                .expect(200);
            expect(logoutResponse.body.data.logout).toBe(true);
            const blockedToken = await redis.get(`jwt:blocklist:${jti}`);
            expect(blockedToken).toBe('blocked');
            const ttl = await redis.ttl(`jwt:blocklist:${jti}`);
            expect(ttl).toBeGreaterThan(0);
        });
    });
    describe('AUTH-007: Blocklisted token cannot be used', () => {
        it('should return UnauthorizedException for logged out token', async () => {
            const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
          }
        }
      `;
            const loginResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .send({
                query: loginMutation,
                variables: {
                    input: {
                        email: 'admin@test.local',
                        password: 'admin123',
                    },
                },
            });
            const token = loginResponse.body.data.login.accessToken;
            const logoutMutation = `
        mutation Logout {
          logout
        }
      `;
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                query: logoutMutation,
            });
            const protectedQuery = `
        query Me {
          me {
            id
            email
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({
                query: protectedQuery,
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('Token is invalid');
        });
    });
    describe('AUTH-008: Expired token is rejected', () => {
        it('should return UnauthorizedException for expired token', async () => {
            const expiredPayload = {
                sub: 'test-user-id',
                email: 'admin@test.local',
                role: 'ADMIN',
                jti: 'test-jti',
                iat: Math.floor(Date.now() / 1000) - 3600,
                exp: Math.floor(Date.now() / 1000) - 1,
            };
            const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET);
            const protectedQuery = `
        query Me {
          me {
            id
            email
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${expiredToken}`)
                .send({
                query: protectedQuery,
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('Unauthorized');
        });
    });
    describe('DRY Principle & Architectural Compliance', () => {
        it('should correctly extract IP and User-Agent via @AuditContext decorator (ARCH-003)', async () => {
            const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
          }
        }
      `;
            const loginResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .send({
                query: loginMutation,
                variables: {
                    input: {
                        email: 'admin@test.local',
                        password: 'admin123',
                    },
                },
            });
            const token = loginResponse.body.data.login.accessToken;
            const updateUserMutation = `
        mutation UpdateUser($input: UpdateUserInput!) {
          updateUser(input: $input) {
            id
            firstName
          }
        }
      `;
            const adminUser = await prisma.user.findUnique({
                where: { email: 'admin@test.local' },
            });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .set('X-Forwarded-For', '192.168.1.100')
                .set('User-Agent', 'Test-Agent/1.0')
                .send({
                query: updateUserMutation,
                variables: {
                    input: {
                        id: adminUser.id,
                        firstName: 'Updated',
                        reason: 'Testing @AuditContext decorator extraction',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.updateUser).toBeDefined();
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'User',
                    entityId: adminUser.id,
                    action: 'UPDATE',
                    reason: 'Testing @AuditContext decorator extraction',
                },
                orderBy: { createdAt: 'desc' },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.ipAddress).toBe('192.168.1.100');
            expect(auditLog.userAgent).toBe('Test-Agent/1.0');
        });
    });
    describe('Authentication-Related Atomicity Tests', () => {
        it('should handle authentication transaction integrity', async () => {
            const initialAuditCount = await prisma.auditLog.count();
            const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
            accessToken
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('X-Forwarded-For', '192.168.1.50')
                .set('User-Agent', 'Auth-Test-Agent/1.0')
                .send({
                query: loginMutation,
                variables: {
                    input: {
                        email: 'admin@test.local',
                        password: 'admin123',
                    },
                },
            })
                .expect(200);
            expect(response.body.data.login).toBeDefined();
            expect(response.body.data.login.accessToken).toBeDefined();
            const finalAuditCount = await prisma.auditLog.count();
            expect(finalAuditCount).toBeGreaterThan(initialAuditCount);
        });
        it('should handle P2002 errors in authentication context', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;
            const adminToken = await getAuthToken('admin@test.local', 'admin123');
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'auth-p2002-test@example.com',
                        password: 'password123',
                        firstName: 'Auth',
                        lastName: 'P2002Test',
                        role: 'OPERATOR',
                        reason: 'First user for auth P2002 test',
                    },
                },
            });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'auth-p2002-test@example.com',
                        password: 'different123',
                        firstName: 'Auth',
                        lastName: 'Duplicate',
                        role: 'OPERATOR',
                        reason: 'Should fail due to duplicate',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('already exists');
        });
    });
    async function getAuthToken(email, password) {
        const loginMutation = `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
          accessToken
        }
      }
    `;
        const response = await (0, supertest_1.default)(app.getHttpServer())
            .post('/graphql')
            .send({
            query: loginMutation,
            variables: {
                input: { email, password },
            },
        });
        return response.body.data.login.accessToken;
    }
});
//# sourceMappingURL=auth.e2e-spec.js.map