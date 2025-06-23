"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
describe('Audit Trail System (E2E)', () => {
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
    describe('AUDIT-001: Successful mutation creates audit log via interceptor', () => {
        it('should create audit log automatically for updateUser mutation', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
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
                        email: 'audittest@test.local',
                        password: 'password123',
                        firstName: 'Audit',
                        lastName: 'Test',
                        role: 'OPERATOR',
                        reason: 'Creating user for audit testing',
                    },
                },
            });
            const userId = createResponse.body.data.createUser.id;
            const auditCountBefore = await prisma.auditLog.count();
            const updateUserMutation = `
        mutation UpdateUser($input: UpdateUserInput!) {
          updateUser(input: $input) {
            id
            firstName
          }
        }
      `;
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: updateUserMutation,
                variables: {
                    input: {
                        id: userId,
                        firstName: 'Updated',
                        reason: 'Testing audit log creation',
                    },
                },
            })
                .expect(200);
            const auditCountAfter = await prisma.auditLog.count();
            expect(auditCountAfter).toBeGreaterThan(auditCountBefore);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'User',
                    entityId: userId,
                    action: 'UPDATE',
                },
                orderBy: { createdAt: 'desc' },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.userId).toBe(adminUserId);
            expect(auditLog.reason).toBe('Testing audit log creation');
            expect(auditLog.entityType).toBe('User');
            expect(auditLog.action).toBe('UPDATE');
        });
    });
    describe('AUDIT-002: Service-level call to auditService.log() creates detailed log', () => {
        it('should create detailed audit log for user creation with rich context', async () => {
            const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;
            const auditCountBefore = await prisma.auditLog.count();
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'detailed-audit@test.local',
                        password: 'password123',
                        firstName: 'Detailed',
                        lastName: 'Audit',
                        role: 'OPERATOR',
                        reason: 'Testing detailed audit logging',
                    },
                },
            })
                .expect(200);
            const userId = response.body.data.createUser.id;
            const auditCountAfter = await prisma.auditLog.count();
            expect(auditCountAfter).toBeGreaterThan(auditCountBefore);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'User',
                    entityId: userId,
                    action: 'CREATE',
                },
                orderBy: { createdAt: 'desc' },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.userId).toBe(adminUserId);
            expect(auditLog.reason).toBe('Testing detailed audit logging');
            expect(auditLog.details).toBeDefined();
            const details = auditLog.details;
            expect(details.email).toBe('detailed-audit@test.local');
            expect(details.role).toBe('OPERATOR');
            expect(details.firstName).toBe('Detailed');
            expect(details.lastName).toBe('Audit');
        });
    });
    describe('AUDIT-003: Transaction Rollback Test', () => {
        it('should rollback both User and AuditLog when transaction fails', async () => {
            const userCountBefore = await prisma.user.count();
            const auditCountBefore = await prisma.auditLog.count();
            const rollbackMutation = `
        mutation TestTransactionRollback($testUserEmail: String!, $shouldFail: Boolean!) {
          testTransactionRollback(testUserEmail: $testUserEmail, shouldFail: $shouldFail) {
            success
            message
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: rollbackMutation,
                variables: {
                    testUserEmail: 'rollback-test@test.local',
                    shouldFail: true,
                },
            })
                .expect(200);
            expect(response.body.data.testTransactionRollback.success).toBe(false);
            expect(response.body.data.testTransactionRollback.message).toContain('rolled back');
            const userCountAfter = await prisma.user.count();
            expect(userCountAfter).toBe(userCountBefore);
            const auditCountAfter = await prisma.auditLog.count();
            expect(auditCountAfter).toBe(auditCountBefore);
            const testUser = await prisma.user.findUnique({
                where: { email: 'rollback-test@test.local' },
            });
            expect(testUser).toBeNull();
        });
        it('should complete successfully when shouldFail is false', async () => {
            const rollbackMutation = `
        mutation TestTransactionRollback($testUserEmail: String!, $shouldFail: Boolean!) {
          testTransactionRollback(testUserEmail: $testUserEmail, shouldFail: $shouldFail) {
            success
            message
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: rollbackMutation,
                variables: {
                    testUserEmail: 'success-test@test.local',
                    shouldFail: false,
                },
            })
                .expect(200);
            expect(response.body.data.testTransactionRollback.success).toBe(true);
            expect(response.body.data.testTransactionRollback.message).toContain('completed successfully');
            const testUser = await prisma.user.findUnique({
                where: { email: 'success-test@test.local' },
            });
            expect(testUser).toBeDefined();
            await prisma.user.delete({
                where: { email: 'success-test@test.local' },
            });
        });
    });
    describe('AUDIT-004: Mutation requiring reason fails if none provided', () => {
        it('should return BadRequestException when reason is missing', async () => {
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
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'noreason@test.local',
                        password: 'password123',
                        firstName: 'No',
                        lastName: 'Reason',
                        role: 'OPERATOR',
                    },
                },
            })
                .expect(400);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('Field "reason" of required type "String!" was not provided');
            const testUser = await prisma.user.findUnique({
                where: { email: 'noreason@test.local' },
            });
            expect(testUser).toBeNull();
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    details: {
                        path: ['email'],
                        equals: 'noreason@test.local',
                    },
                },
            });
            expect(auditLog).toBeNull();
        });
        it('should return validation error when reason is empty string', async () => {
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
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createUserMutation,
                variables: {
                    input: {
                        email: 'emptyreason@test.local',
                        password: 'password123',
                        firstName: 'Empty',
                        lastName: 'Reason',
                        role: 'OPERATOR',
                        reason: '',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('Reason is required for user creation (GxP compliance)');
            const testUser = await prisma.user.findUnique({
                where: { email: 'emptyreason@test.local' },
            });
            expect(testUser).toBeNull();
        });
    });
});
//# sourceMappingURL=audit.e2e-spec.js.map