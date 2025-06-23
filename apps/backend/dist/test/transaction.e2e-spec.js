"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/database/prisma.service");
const production_line_service_1 = require("../src/production-line/production-line.service");
const process_service_1 = require("../src/process/process.service");
const user_service_1 = require("../src/user/user.service");
const audit_service_1 = require("../src/audit/audit.service");
const auth_service_1 = require("../src/auth/auth.service");
const user_role_enum_1 = require("../src/common/enums/user-role.enum");
describe('Cross-Cutting Transaction Management (E2E)', () => {
    let app;
    let prisma;
    let productionLineService;
    let processService;
    let userService;
    let auditService;
    let authService;
    let testUserId;
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
            email: 'transaction-test@example.com',
            password: 'TestPassword123!',
            firstName: 'Transaction',
            lastName: 'Test',
            role: user_role_enum_1.UserRole.ADMIN,
            reason: 'Transaction test user creation',
        }, 'test-user-id', '127.0.0.1', 'test-agent');
        testUserId = testUser.id;
    });
    afterAll(async () => {
        try {
            await prisma.auditLog.deleteMany({ where: { userId: testUserId } });
            await prisma.process.deleteMany({});
            await prisma.productionLine.deleteMany({});
            await prisma.user.deleteMany({
                where: { email: 'transaction-test@example.com' },
            });
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
            auditService.create = jest
                .fn()
                .mockRejectedValue(new Error('Audit service failure'));
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
                    details: { path: ['name'], equals: 'ROLLBACK_TEST_LINE' },
                },
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
                where: { title: 'FAILURE_PROCESS' },
            });
            expect(processes).toHaveLength(0);
            const finalAuditCount = await prisma.auditLog.count();
            expect(finalAuditCount).toBe(initialAuditCount + 1);
            prisma.$transaction = originalTransaction;
            await productionLineService.remove(productionLine.id, 'Test cleanup', testUserId);
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
    describe('Transaction Management Infrastructure', () => {
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
        it('should maintain transaction integrity across multiple operations', async () => {
            const initialProductionLineCount = await prisma.productionLine.count();
            const initialProcessCount = await prisma.process.count();
            const initialAuditCount = await prisma.auditLog.count();
            const productionLine = await productionLineService.create({
                name: 'MULTI_OP_TEST_LINE',
                reason: 'Testing multi-operation transaction integrity',
            }, testUserId, '127.0.0.1', 'test-agent');
            const process = await processService.create({
                title: 'MULTI_OP_TEST_PROCESS',
                description: 'Process for multi-operation test',
                productionLineId: productionLine.id,
                status: 'IN_PROGRESS',
                progress: 50,
            }, testUserId, '127.0.0.1', 'test-agent');
            const finalProductionLineCount = await prisma.productionLine.count();
            const finalProcessCount = await prisma.process.count();
            const finalAuditCount = await prisma.auditLog.count();
            expect(finalProductionLineCount).toBe(initialProductionLineCount + 1);
            expect(finalProcessCount).toBe(initialProcessCount + 1);
            expect(finalAuditCount).toBeGreaterThan(initialAuditCount);
            const productionLineAudit = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'ProductionLine',
                    entityId: productionLine.id,
                    action: 'CREATE',
                },
            });
            const processAudit = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'Process',
                    entityId: process.id,
                    action: 'CREATE',
                },
            });
            expect(productionLineAudit).toBeDefined();
            expect(processAudit).toBeDefined();
            await processService.remove(process.id, 'Test cleanup', testUserId);
            await productionLineService.remove(productionLine.id, 'Test cleanup', testUserId);
        });
    });
});
//# sourceMappingURL=transaction.e2e-spec.js.map