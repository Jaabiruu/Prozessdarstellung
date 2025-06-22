"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
describe('Authentication System (E2E)', () => {
    let app;
    let prisma;
    let redis;
    beforeAll(async () => {
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
            const jwt = require('jsonwebtoken');
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
            expect(response.body.data.login).toBeNull();
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
            expect(response.body.data.login).toBeNull();
        });
    });
    describe('AUTH-004: User cannot log in with deactivated account', () => {
        it('should return UnauthorizedException for inactive user', async () => {
            const deactivatedUser = await prisma.user.create({
                data: {
                    email: 'deactivated@test.local',
                    password: await require('bcrypt').hash('password123', 12),
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
            expect(response.body.data.login).toBeNull();
        });
    });
    describe('AUTH-005: Login attempts are rate-limited', () => {
        it('should return 429 Too Many Requests after 5 failed attempts', async () => {
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
                if (i < 5) {
                    expect(response.body.errors).toBeDefined();
                    expect(response.body.errors[0].message).toContain('Invalid credentials');
                }
                else {
                    expect(response.body.errors).toBeDefined();
                    expect(response.body.errors[0].message).toContain('ThrottlerException');
                }
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
            const jwt = require('jsonwebtoken');
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
            const jwt = require('jsonwebtoken');
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
            expect(response.body.errors[0].message).toContain('jwt expired');
        });
    });
});
//# sourceMappingURL=auth.e2e-spec.js.map