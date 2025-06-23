"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
describe('Authorization System (RBAC) (E2E)', () => {
    let app;
    let prisma;
    let adminToken;
    let managerToken;
    let operatorToken;
    let adminUserId;
    let managerUserId;
    let operatorUserId;
    beforeAll(async () => {
        await setup_1.TestSetup.beforeAll();
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = setup_1.TestSetup.getPrisma();
        await getAuthTokensAndUserIds();
    });
    afterAll(async () => {
        await app.close();
        await setup_1.TestSetup.afterAll();
    });
    async function getAuthTokensAndUserIds() {
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
        const adminResponse = await (0, supertest_1.default)(app.getHttpServer())
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
        adminToken = adminResponse.body.data.login.accessToken;
        adminUserId = adminResponse.body.data.login.user.id;
        const managerResponse = await (0, supertest_1.default)(app.getHttpServer())
            .post('/graphql')
            .send({
            query: loginMutation,
            variables: {
                input: {
                    email: 'manager@test.local',
                    password: 'manager123',
                },
            },
        });
        managerToken = managerResponse.body.data.login.accessToken;
        managerUserId = managerResponse.body.data.login.user.id;
        const operatorResponse = await (0, supertest_1.default)(app.getHttpServer())
            .post('/graphql')
            .send({
            query: loginMutation,
            variables: {
                input: {
                    email: 'operator@test.local',
                    password: 'operator123',
                },
            },
        });
        operatorToken = operatorResponse.body.data.login.accessToken;
        operatorUserId = operatorResponse.body.data.login.user.id;
    }
    describe('RBAC-001: ADMIN user can access admin-only endpoint', () => {
        it('should allow ADMIN to create a user', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            role
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'newuser@test.local',
                        password: 'password123',
                        firstName: 'New',
                        lastName: 'User',
                        role: 'OPERATOR',
                        reason: 'Creating test user for RBAC testing',
                    },
                },
            })
                .expect(200);
            expect(response.body.data.createUser).toBeDefined();
            expect(response.body.data.createUser.email).toBe('newuser@test.local');
            expect(response.body.data.createUser.role).toBe('OPERATOR');
        });
    });
    describe('RBAC-002: OPERATOR user is denied access to admin-only endpoint', () => {
        it('should return ForbiddenException for OPERATOR trying to create user', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            role
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'forbidden@test.local',
                        password: 'password123',
                        firstName: 'Forbidden',
                        lastName: 'User',
                        role: 'OPERATOR',
                        reason: 'Should be forbidden',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
            expect(response.body.data.createUser).toBeNull();
        });
    });
    describe('RBAC-003: MANAGER is denied access to admin-only endpoint', () => {
        it('should return ForbiddenException for MANAGER trying to create user', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            role
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'manager-forbidden@test.local',
                        password: 'password123',
                        firstName: 'Manager',
                        lastName: 'Forbidden',
                        role: 'OPERATOR',
                        reason: 'Should be forbidden for manager',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
            expect(response.body.data.createUser).toBeNull();
        });
    });
    describe('RBAC-004: Unauthenticated user is denied access to protected endpoint', () => {
        it('should return UnauthorizedException without Authorization header', async () => {
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
                .send({
                query: protectedQuery,
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
            expect(response.body.data.me).toBeNull();
        });
    });
    describe('RBAC-005: Endpoint with no @Roles decorator accessible by any authenticated user', () => {
        it('should allow OPERATOR to access me query (no specific role requirement)', async () => {
            const meQuery = `
        query Me {
          me {
            id
            email
            role
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: meQuery,
            })
                .expect(200);
            expect(response.body.data.me).toBeDefined();
            expect(response.body.data.me.email).toBe('operator@test.local');
            expect(response.body.data.me.role).toBe('OPERATOR');
            expect(response.body.errors).toBeUndefined();
        });
        it('should allow MANAGER to access me query', async () => {
            const meQuery = `
        query Me {
          me {
            id
            email
            role
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: meQuery,
            })
                .expect(200);
            expect(response.body.data.me).toBeDefined();
            expect(response.body.data.me.email).toBe('manager@test.local');
            expect(response.body.data.me.role).toBe('MANAGER');
            expect(response.body.errors).toBeUndefined();
        });
        it('should allow ADMIN to access me query', async () => {
            const meQuery = `
        query Me {
          me {
            id
            email
            role
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: meQuery,
            })
                .expect(200);
            expect(response.body.data.me).toBeDefined();
            expect(response.body.data.me.email).toBe('admin@test.local');
            expect(response.body.data.me.role).toBe('ADMIN');
            expect(response.body.errors).toBeUndefined();
        });
    });
});
//# sourceMappingURL=rbac.e2e-spec.js.map