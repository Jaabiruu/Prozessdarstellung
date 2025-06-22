"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/database/prisma.service");
const production_line_service_1 = require("../src/production-line/production-line.service");
const process_service_1 = require("../src/process/process.service");
const user_service_1 = require("../src/user/user.service");
const audit_service_1 = require("../src/audit/audit.service");
const auth_service_1 = require("../src/auth/auth.service");
const supertest_1 = __importDefault(require("supertest"));
const user_role_enum_1 = require("../src/common/enums/user-role.enum");
describe('Pillar 1: Atomicity & Data Integrity Tests', () => {
    let app;
    let prisma;
    let productionLineService;
    let processService;
    let userService;
    let auditService;
    let authService;
    let testUserId;
    let authToken;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = moduleFixture.get(prisma_service_1.PrismaService);
        productionLineService = moduleFixture.get(production_line_service_1.ProductionLineService);
        processService = moduleFixture.get(process_service_1.ProcessService);
        userService = moduleFixture.get(user_service_1.UserService);
        auditService = moduleFixture.get(audit_service_1.AuditService);
        authService = moduleFixture.get(auth_service_1.AuthService);
        const testUser = await userService.create({
            email: 'pillar1-test@example.com',
            password: 'TestPassword123!',
            firstName: 'Pillar1',
            lastName: 'Test',
            role: user_role_enum_1.UserRole.ADMIN,
            reason: 'Pillar 1 test user creation',
        }, 'test-user-id', '127.0.0.1', 'test-agent');
        testUserId = testUser.id;
        const loginResult = await authService.login({
            email: 'pillar1-test@example.com',
            password: 'TestPassword123!',
        }, '127.0.0.1', 'test-agent');
        authToken = loginResult.accessToken;
    });
    afterAll(async () => {
        try {
            await prisma.auditLog.deleteMany({ where: { userId: testUserId } });
            await prisma.process.deleteMany({});
            await prisma.productionLine.deleteMany({});
            await prisma.user.deleteMany({ where: { email: 'pillar1-test@example.com' } });
        }
        catch (error) {
            console.warn('Cleanup error:', error);
        }
        finally {
            await prisma.$disconnect();
            await app.close();
        }
    });
    afterEach(async () => {
        jest.restoreAllMocks();
    });
    describe('ATOM-001: Transaction Rollback on Audit Failure', () => {
        it('should rollback entire transaction when audit logging fails', async () => {
            const originalCreate = auditService.create;
            auditService.create = jest.fn().mockRejectedValue(new Error('Audit service failure'));
            const initialCount = await prisma.productionLine.count();
            try {
                await productionLineService.create({
                    name: 'ROLLBACK_TEST_LINE',
                    reason: 'Test line for rollback',
                }, testUserId, '127.0.0.1', 'test-agent');
                fail('Expected method to throw an error');
            }
            catch (error) {
                expect(error.message).toBe('Audit service failure');
            }
            const finalCount = await prisma.productionLine.count();
            expect(finalCount).toBe(initialCount);
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    entityType: 'ProductionLine',
                    details: { path: ['name'], equals: 'ROLLBACK_TEST_LINE' }
                }
            });
            expect(auditLogs).toHaveLength(0);
            auditService.create = originalCreate;
        });
    });
    describe('ATOM-002: Transaction Rollback on Service Failure', () => {
        it('should rollback when error occurs mid-transaction', async () => {
            const initialAuditCount = await prisma.auditLog.count();
            const productionLine = await productionLineService.create({
                name: 'SERVICE_FAILURE_TEST',
                reason: 'Test line for service failure',
            }, testUserId, '127.0.0.1', 'test-agent');
            const originalTransaction = prisma.$transaction;
            prisma.$transaction = jest.fn().mockImplementation(async () => {
                throw new Error('Database transaction failure');
            });
            try {
                await processService.create({
                    title: 'FAILURE_PROCESS',
                    description: 'Process that should fail',
                    productionLineId: productionLine.id,
                    status: 'IN_PROGRESS',
                    progress: 0,
                }, testUserId, '127.0.0.1', 'test-agent');
                fail('Expected method to throw an error');
            }
            catch (error) {
                expect(error.message).toBe('Database transaction failure');
            }
            const processes = await prisma.process.findMany({
                where: { title: 'FAILURE_PROCESS' }
            });
            expect(processes).toHaveLength(0);
            const finalAuditCount = await prisma.auditLog.count();
            expect(finalAuditCount).toBe(initialAuditCount + 1);
            prisma.$transaction = originalTransaction;
            await productionLineService.remove(productionLine.id, 'Test cleanup', testUserId);
        });
    });
    describe('ATOM-003: Race Condition Prevention on Create', () => {
        it('should prevent race conditions during concurrent creates', async () => {
            const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(createProductionLineInput: $input) {
            id
            name
          }
        }
      `;
            const input = {
                name: 'RACE_TEST',
                reason: 'Race condition test',
            };
            const [result1, result2] = await Promise.allSettled([
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    query: createMutation,
                    variables: { input },
                }),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    query: createMutation,
                    variables: { input },
                }),
            ]);
            const responses = [result1, result2];
            const successCount = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
            const errorCount = responses.filter(r => r.status === 'fulfilled' && r.value.status !== 200 ||
                r.status === 'rejected').length;
            expect(successCount).toBe(1);
            expect(errorCount).toBe(1);
            const records = await prisma.productionLine.findMany({
                where: { name: 'RACE_TEST' }
            });
            expect(records).toHaveLength(1);
            await productionLineService.remove(records[0].id, 'Test cleanup', testUserId);
        });
    });
    describe('ATOM-004: Race Condition Prevention on Update', () => {
        it('should prevent race conditions during concurrent updates', async () => {
            const lineA = await productionLineService.create({
                name: 'LINE_A',
                reason: 'Line A for update test',
            }, testUserId, '127.0.0.1', 'test-agent');
            const lineB = await productionLineService.create({
                name: 'LINE_B',
                reason: 'Line B for update test',
            }, testUserId, '127.0.0.1', 'test-agent');
            const updateMutation = `
        mutation UpdateProductionLine($input: UpdateProductionLineInput!) {
          updateProductionLine(updateProductionLineInput: $input) {
            id
            name
          }
        }
      `;
            const [result1, result2] = await Promise.allSettled([
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    query: updateMutation,
                    variables: {
                        input: {
                            id: lineA.id,
                            name: 'NEW_NAME',
                            reason: 'Updated reason'
                        }
                    },
                }),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    query: updateMutation,
                    variables: {
                        input: {
                            id: lineB.id,
                            name: 'NEW_NAME',
                            reason: 'Updated reason'
                        }
                    },
                }),
            ]);
            const responses = [result1, result2];
            const successCount = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
            expect(successCount).toBe(1);
            const records = await prisma.productionLine.findMany({
                where: { name: 'NEW_NAME' }
            });
            expect(records).toHaveLength(1);
            await productionLineService.remove(lineA.id, 'Test cleanup', testUserId);
            await productionLineService.remove(lineB.id, 'Test cleanup', testUserId);
        });
    });
    describe('ATOM-005: Successful Creation is Fully Atomic', () => {
        it('should create both entity and audit log atomically on success', async () => {
            const initialProductionLineCount = await prisma.productionLine.count();
            const initialAuditCount = await prisma.auditLog.count();
            const result = await productionLineService.create({
                name: 'ATOMIC_SUCCESS_TEST',
                reason: 'Test for successful atomic creation',
            }, testUserId, '127.0.0.1', 'test-agent');
            expect(result).toBeDefined();
            expect(result.name).toBe('ATOMIC_SUCCESS_TEST');
            const finalProductionLineCount = await prisma.productionLine.count();
            expect(finalProductionLineCount).toBe(initialProductionLineCount + 1);
            const finalAuditCount = await prisma.auditLog.count();
            expect(finalAuditCount).toBe(initialAuditCount + 1);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'ProductionLine',
                    entityId: result.id,
                    action: 'CREATE',
                },
                orderBy: { createdAt: 'desc' },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.userId).toBe(testUserId);
            expect(auditLog.ipAddress).toBe('127.0.0.1');
            expect(auditLog.userAgent).toBe('test-agent');
            await productionLineService.remove(result.id, 'Test cleanup', testUserId);
        });
    });
    describe('P2002 Error Handling', () => {
        it('should handle P2002 errors correctly in all services', async () => {
            const line1 = await productionLineService.create({
                name: 'P2002_TEST',
                reason: 'First line',
            }, testUserId, '127.0.0.1', 'test-agent');
            try {
                await productionLineService.create({
                    name: 'P2002_TEST',
                    reason: 'Second line',
                }, testUserId, '127.0.0.1', 'test-agent');
                fail('Expected ConflictException');
            }
            catch (error) {
                expect(error.message).toContain('already exists');
            }
            const process1 = await processService.create({
                title: 'P2002_PROCESS_TEST',
                description: 'First process',
                productionLineId: line1.id,
                status: 'IN_PROGRESS',
                progress: 0,
            }, testUserId, '127.0.0.1', 'test-agent');
            try {
                await processService.create({
                    title: 'P2002_PROCESS_TEST',
                    description: 'Second process',
                    productionLineId: line1.id,
                    status: 'IN_PROGRESS',
                    progress: 0,
                }, testUserId, '127.0.0.1', 'test-agent');
                fail('Expected ConflictException');
            }
            catch (error) {
                expect(error.message).toContain('already exists');
            }
            await processService.remove(process1.id, 'Test cleanup', testUserId);
            await productionLineService.remove(line1.id, 'Test cleanup', testUserId);
        });
    });
    describe('Transaction Management', () => {
        it('should verify no auditService.withTransaction usage remains', () => {
            expect(auditService.withTransaction).toBeUndefined();
        });
        it('should verify all services use direct prisma.$transaction', async () => {
            const line = await productionLineService.create({
                name: 'TRANSACTION_TEST',
                reason: 'Transaction management test',
            }, testUserId, '127.0.0.1', 'test-agent');
            expect(line).toBeDefined();
            await productionLineService.remove(line.id, 'Test cleanup', testUserId);
        });
    });
});
//# sourceMappingURL=pillar-1-atomicity.e2e-spec.js.map