"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
describe('User Management System (E2E)', () => {
    let app;
    let prisma;
    let adminToken;
    let managerToken;
    let adminUserId;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = setup_1.TestSetup.getPrisma();
        const adminUser = await prisma.user.findUnique({
            where: { email: 'admin@test.local' },
        });
        adminUserId = adminUser.id;
        adminToken = await getAuthToken('admin@test.local', 'admin123');
        managerToken = await getAuthToken('manager@test.local', 'manager123');
    });
    afterAll(async () => {
        await app.close();
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
    describe('USER-001: ADMIN can create a new user', () => {
        it('should create user with audit log and no password in response', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            firstName
            lastName
            role
            isActive
            password
          }
        }
      `;
            const userCountBefore = await prisma.user.count();
            const auditCountBefore = await prisma.auditLog.count();
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'newuser@test.local',
                        password: 'securepassword123',
                        firstName: 'New',
                        lastName: 'User',
                        role: 'OPERATOR',
                        reason: 'Creating new user for testing',
                    },
                },
            })
                .expect(200);
            expect(response.body.data.createUser).toBeDefined();
            expect(response.body.data.createUser.email).toBe('newuser@test.local');
            expect(response.body.data.createUser.firstName).toBe('New');
            expect(response.body.data.createUser.lastName).toBe('User');
            expect(response.body.data.createUser.role).toBe('OPERATOR');
            expect(response.body.data.createUser.isActive).toBe(true);
            expect(response.body.data.createUser.password).toBeNull();
            const userId = response.body.data.createUser.id;
            const userCountAfter = await prisma.user.count();
            expect(userCountAfter).toBe(userCountBefore + 1);
            const createdUser = await prisma.user.findUnique({
                where: { id: userId },
            });
            expect(createdUser).toBeDefined();
            expect(createdUser.email).toBe('newuser@test.local');
            expect(createdUser.password).toBeDefined();
            expect(createdUser.password).not.toBe('securepassword123');
            const auditCountAfter = await prisma.auditLog.count();
            expect(auditCountAfter).toBeGreaterThan(auditCountBefore);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'User',
                    entityId: userId,
                    action: 'CREATE',
                },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.userId).toBe(adminUserId);
            expect(auditLog.reason).toBe('Creating new user for testing');
            const details = auditLog.details;
            expect(details.email).toBe('newuser@test.local');
            expect(details.role).toBe('OPERATOR');
        });
    });
    describe('USER-002: MANAGER cannot create a new user', () => {
        it('should return ForbiddenException for MANAGER role', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
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
                        reason: 'Should be forbidden',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
            expect(response.body.data.createUser).toBeNull();
            const testUser = await prisma.user.findUnique({
                where: { email: 'manager-forbidden@test.local' },
            });
            expect(testUser).toBeNull();
        });
    });
    describe('USER-003: Cannot create user with pre-existing email', () => {
        it('should return ConflictException for duplicate email', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'existing@test.local',
                        password: 'password123',
                        firstName: 'Existing',
                        lastName: 'User',
                        role: 'OPERATOR',
                        reason: 'Creating existing user',
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
                        email: 'existing@test.local',
                        password: 'differentpassword',
                        firstName: 'Duplicate',
                        lastName: 'User',
                        role: 'MANAGER',
                        reason: 'Should fail due to duplicate email',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].extensions.code).toBe('CONFLICT');
            expect(response.body.errors[0].message).toContain('User with this email already exists');
            expect(response.body.data.createUser).toBeNull();
        });
    });
    describe('USER-004: GxP Deactivation & Anonymization Test', () => {
        it('should deactivate user and anonymize PII data', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            firstName
            lastName
          }
        }
      `;
            const createResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'pii-test@pharma.local',
                        password: 'password123',
                        firstName: 'PII',
                        lastName: 'TestUser',
                        role: 'OPERATOR',
                        reason: 'Creating user for PII anonymization test',
                    },
                },
            });
            const userId = createResponse.body.data.createUser.id;
            const originalEmail = createResponse.body.data.createUser.email;
            const originalFirstName = createResponse.body.data.createUser.firstName;
            const originalLastName = createResponse.body.data.createUser.lastName;
            const loginToken = await getAuthToken('pii-test@pharma.local', 'password123');
            expect(loginToken).toBeDefined();
            const deactivateUserMutation = `
        mutation DeactivateUser($id: String!, $reason: String!) {
          deactivateUser(id: $id, reason: $reason) {
            id
            email
            firstName
            lastName
            isActive
          }
        }
      `;
            const deactivateResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: deactivateUserMutation,
                variables: {
                    id: userId,
                    reason: 'Testing PII anonymization compliance',
                },
            })
                .expect(200);
            const deactivatedUser = deactivateResponse.body.data.deactivateUser;
            expect(deactivatedUser.isActive).toBe(false);
            expect(deactivatedUser.id).toBe(userId);
            expect(deactivatedUser.email).not.toBe(originalEmail);
            expect(deactivatedUser.firstName).not.toBe(originalFirstName);
            expect(deactivatedUser.lastName).not.toBe(originalLastName);
            expect(deactivatedUser.email).toMatch(/anonymized_.*@deleted\.local/);
            expect(deactivatedUser.firstName).toMatch(/DELETED_USER_.*/);
            expect(deactivatedUser.lastName).toBe('ANONYMIZED');
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'User',
                    entityId: userId,
                    action: 'DELETE',
                },
                orderBy: { createdAt: 'desc' },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.reason).toBe('Testing PII anonymization compliance');
            const details = auditLog.details;
            expect(details.action).toBe('deactivation_with_pii_anonymization');
            expect(details.originalEmail).toBe(originalEmail);
            expect(details.originalFirstName).toBe(originalFirstName);
            expect(details.originalLastName).toBe(originalLastName);
            const failedLoginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
          }
        }
      `;
            const loginResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .send({
                query: failedLoginMutation,
                variables: {
                    input: {
                        email: 'pii-test@pharma.local',
                        password: 'password123',
                    },
                },
            })
                .expect(200);
            expect(loginResponse.body.errors).toBeDefined();
            expect(loginResponse.body.errors[0].message).toContain('Invalid credentials');
            expect(loginResponse.body.data.login).toBeNull();
        });
    });
    describe('Atomicity & Race Condition Tests', () => {
        it('should prevent race conditions during concurrent user creates (ATOM-003)', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;
            const input = {
                email: 'race-test@example.com',
                password: 'TestPassword123!',
                firstName: 'Race',
                lastName: 'Test',
                role: 'OPERATOR',
                reason: 'Race condition test',
            };
            const [result1, result2] = await Promise.allSettled([
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                    query: createUserMutation,
                    variables: { input },
                }),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                    query: createUserMutation,
                    variables: { input },
                }),
            ]);
            const responses = [result1, result2];
            const successCount = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200 && !r.value.body.errors).length;
            const errorCount = responses.filter(r => (r.status === 'fulfilled' && (r.value.status !== 200 || r.value.body.errors)) ||
                r.status === 'rejected').length;
            expect(successCount).toBe(1);
            expect(errorCount).toBe(1);
            const records = await prisma.user.findMany({
                where: { email: 'race-test@example.com' },
            });
            expect(records).toHaveLength(1);
        });
        it('should handle P2002 errors correctly for email uniqueness (ATOM-005)', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'p2002-test@example.com',
                        password: 'password123',
                        firstName: 'P2002',
                        lastName: 'Test',
                        role: 'OPERATOR',
                        reason: 'First user for P2002 test',
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
                        email: 'p2002-test@example.com',
                        password: 'differentpassword',
                        firstName: 'Duplicate',
                        lastName: 'User',
                        role: 'MANAGER',
                        reason: 'Should fail due to duplicate email',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].extensions.code).toBe('CONFLICT');
            expect(response.body.errors[0].message).toContain('already exists');
            expect(response.body.data.createUser).toBeNull();
        });
        it('should maintain transaction integrity during user operations', async () => {
            const initialCount = await prisma.user.count();
            const initialAuditCount = await prisma.auditLog.count();
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            firstName
            lastName
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
                        email: 'transaction-integrity@example.com',
                        password: 'TestPassword123!',
                        firstName: 'Transaction',
                        lastName: 'Integrity',
                        role: 'OPERATOR',
                        reason: 'Testing transaction integrity',
                    },
                },
            })
                .expect(200);
            const userId = response.body.data.createUser.id;
            const finalCount = await prisma.user.count();
            const finalAuditCount = await prisma.auditLog.count();
            expect(finalCount).toBe(initialCount + 1);
            expect(finalAuditCount).toBeGreaterThan(initialAuditCount);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'User',
                    entityId: userId,
                    action: 'CREATE',
                },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.reason).toBe('Testing transaction integrity');
        });
    });
});
//# sourceMappingURL=user.e2e-spec.js.map