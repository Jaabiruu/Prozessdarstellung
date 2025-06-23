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
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const request = __importStar(require("supertest"));
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const production_line_service_1 = require("../src/production-line/production-line.service");
const process_service_1 = require("../src/process/process.service");
const user_service_1 = require("../src/user/user.service");
const audit_service_1 = require("../src/audit/audit.service");
const auth_service_1 = require("../src/auth/auth.service");
describe('Cross-Cutting Transaction Management (E2E)', () => {
    let app;
    let prisma;
    let productionLineService;
    let processService;
    let userService;
    let auditService;
    let authService;
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
        productionLineService = moduleFixture.get(production_line_service_1.ProductionLineService);
        processService = moduleFixture.get(process_service_1.ProcessService);
        userService = moduleFixture.get(user_service_1.UserService);
        auditService = moduleFixture.get(audit_service_1.AuditService);
        authService = moduleFixture.get(auth_service_1.AuthService);
        await getAuthTokensAndUserIds();
    });
    afterAll(async () => {
        await app.close();
        await setup_1.TestSetup.afterAll();
    });
    afterEach(async () => {
        jest.restoreAllMocks();
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
        const adminResponse = await request(app.getHttpServer())
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
        const managerResponse = await request(app.getHttpServer())
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
        const operatorResponse = await request(app.getHttpServer())
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
                }, adminUserId, '127.0.0.1', 'test-agent');
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
            }, adminUserId, '127.0.0.1', 'test-agent');
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
                }, adminUserId, '127.0.0.1', 'test-agent');
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
            await productionLineService.remove(productionLine.id, 'Test cleanup', adminUserId);
        });
    });
    describe('ATOM-005: Successful Creation is Fully Atomic', () => {
        it('should create both entity and audit log atomically on success', async () => {
            const initialProductionLineCount = await prisma.productionLine.count();
            const initialAuditCount = await prisma.auditLog.count();
            const result = await productionLineService.create({
                name: 'ATOMIC_SUCCESS_TEST',
                reason: 'Test for successful atomic creation',
            }, adminUserId, '127.0.0.1', 'test-agent');
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
            expect(auditLog.userId).toBe(adminUserId);
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
            }, adminUserId, '127.0.0.1', 'test-agent');
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
            }, adminUserId, '127.0.0.1', 'test-agent');
            const process = await processService.create({
                title: 'MULTI_OP_TEST_PROCESS',
                description: 'Process for multi-operation test',
                productionLineId: productionLine.id,
                status: 'IN_PROGRESS',
                progress: 50,
            }, adminUserId, '127.0.0.1', 'test-agent');
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
            await productionLineService.remove(productionLine.id, 'Test cleanup', adminUserId);
        });
    });
});
//# sourceMappingURL=transaction.e2e-spec.js.map