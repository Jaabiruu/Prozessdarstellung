"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
const audit_service_1 = require("../src/audit/audit.service");
describe('Audit Trail & Transaction Tests (E2E)', () => {
    let app;
    let prisma;
    let managerToken;
    let testProductionLineId;
    let auditService;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = setup_1.TestSetup.getPrisma();
        auditService = moduleFixture.get(audit_service_1.AuditService);
        await getAuthToken();
        await setupTestData();
    });
    afterAll(async () => {
        await cleanupTestData();
        await app.close();
    });
    beforeEach(async () => {
        await prisma.auditLog.deleteMany({
            where: {
                details: {
                    path: ['testScenario'],
                    not: undefined,
                },
            },
        });
    });
    async function getAuthToken() {
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
                input: {
                    email: 'manager@test.local',
                    password: 'manager123',
                },
            },
        });
        managerToken = response.body.data.login.accessToken;
    }
    async function setupTestData() {
        const productionLine = await prisma.productionLine.create({
            data: {
                name: 'audit-test-production-line',
                status: 'ACTIVE',
                createdBy: 'test-user-id',
                reason: 'Setup for audit tests',
            },
        });
        testProductionLineId = productionLine.id;
    }
    async function cleanupTestData() {
        await prisma.process.deleteMany({
            where: {
                title: { contains: 'audit-test-' },
            },
        });
        await prisma.productionLine.deleteMany({
            where: {
                name: { contains: 'audit-test-' },
            },
        });
    }
    describe('AUDIT-001: A successful mutation creates a correct audit log', () => {
        it('should create audit log with correct user ID, entity ID, action, and reason for ProductionLine creation', async () => {
            const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
            status
          }
        }
      `;
            const input = {
                name: 'audit-test-production-line-001',
                status: 'ACTIVE',
                reason: 'Testing audit trail creation for ProductionLine',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .set('User-Agent', 'audit-test-client/1.0')
                .set('X-Forwarded-For', '192.168.1.100')
                .send({
                query: createMutation,
                variables: { input },
            })
                .expect(200);
            const productionLineId = response.body.data.createProductionLine.id;
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'ProductionLine',
                    entityId: productionLineId,
                    action: 'CREATE',
                },
                include: {
                    user: true,
                },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.userId).toBeDefined();
            expect(auditLog.entityId).toBe(productionLineId);
            expect(auditLog.action).toBe('CREATE');
            expect(auditLog.reason).toBe(input.reason);
            expect(auditLog.entityType).toBe('ProductionLine');
            expect(auditLog.details).toMatchObject({
                name: input.name,
                status: input.status,
            });
            expect(auditLog.ipAddress).toBeDefined();
            expect(auditLog.userAgent).toBeDefined();
            expect(auditLog.userAgent).toContain('audit-test-client');
            expect(auditLog.createdAt).toBeDefined();
            expect(new Date(auditLog.createdAt)).toBeInstanceOf(Date);
            console.log('✅ Audit log created with all required fields for ProductionLine creation');
        });
        it('should create audit log with correct details for Process update', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'audit-test-process-for-update',
                    description: 'Original description',
                    status: 'PENDING',
                    progress: 0.0,
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for audit update test',
                },
            });
            const updateMutation = `
        mutation UpdateProcess($input: UpdateProcessInput!) {
          updateProcess(input: $input) {
            id
            title
            description
            status
          }
        }
      `;
            const input = {
                id: process.id,
                title: 'audit-test-updated-process-title',
                description: 'Updated description for audit test',
                status: 'IN_PROGRESS',
                reason: 'Testing audit trail for Process update',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .set('User-Agent', 'audit-process-test/2.0')
                .send({
                query: updateMutation,
                variables: { input },
            })
                .expect(200);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'Process',
                    entityId: process.id,
                    action: 'UPDATE',
                },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.reason).toBe(input.reason);
            const details = auditLog.details;
            expect(details.changes).toMatchObject({
                title: input.title,
                description: input.description,
                status: input.status,
            });
            expect(details.previousValues).toMatchObject({
                title: 'audit-test-process-for-update',
                description: 'Original description',
                status: 'PENDING',
            });
            console.log('✅ Audit log created with correct changes and previous values for Process update');
        });
        it('should capture different IP addresses and user agents correctly', async () => {
            const createMutation = `
        mutation CreateProcess($input: CreateProcessInput!) {
          createProcess(input: $input) {
            id
            title
          }
        }
      `;
            const testCases = [
                {
                    title: 'audit-test-ip-1',
                    ip: '10.0.0.1',
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                },
                {
                    title: 'audit-test-ip-2',
                    ip: '192.168.1.50',
                    userAgent: 'curl/7.68.0',
                },
                {
                    title: 'audit-test-ip-3',
                    ip: '172.16.0.100',
                    userAgent: 'PostmanRuntime/7.28.4',
                },
            ];
            for (const testCase of testCases) {
                const response = await (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${managerToken}`)
                    .set('User-Agent', testCase.userAgent)
                    .set('X-Forwarded-For', testCase.ip)
                    .send({
                    query: createMutation,
                    variables: {
                        input: {
                            title: testCase.title,
                            description: 'Testing IP and User-Agent capture',
                            productionLineId: testProductionLineId,
                            reason: `Testing with IP ${testCase.ip}`,
                        },
                    },
                })
                    .expect(200);
                const processId = response.body.data.createProcess.id;
                const auditLog = await prisma.auditLog.findFirst({
                    where: {
                        entityType: 'Process',
                        entityId: processId,
                        action: 'CREATE',
                    },
                });
                expect(auditLog.ipAddress).toBe(testCase.ip);
                expect(auditLog.userAgent).toBe(testCase.userAgent);
            }
            console.log('✅ Audit logs correctly capture different IP addresses and user agents');
        });
    });
    describe('AUDIT-002: A failed Audit Log rolls back the parent data change (CRITICAL)', () => {
        it('should rollback Process update when audit log creation fails', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'audit-test-rollback-process',
                    description: 'Original description for rollback test',
                    status: 'PENDING',
                    progress: 0.0,
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for rollback test',
                },
            });
            const originalTitle = process.title;
            const originalDescription = process.description;
            const originalStatus = process.status;
            const originalCreate = auditService.create;
            const mockError = new Error('Simulated audit service failure');
            auditService.create = jest.fn().mockRejectedValue(mockError);
            const processService = app.get('ProcessService');
            await expect(processService.update({
                id: process.id,
                title: 'should-not-be-saved',
                description: 'this-should-not-persist',
                status: 'IN_PROGRESS',
                reason: 'Testing transaction rollback',
            }, 'test-user-id', '192.168.1.1', 'test-client')).rejects.toThrow('Simulated audit service failure');
            auditService.create = originalCreate;
            const unchangedProcess = await prisma.process.findUnique({
                where: { id: process.id },
            });
            expect(unchangedProcess).toBeDefined();
            expect(unchangedProcess.title).toBe(originalTitle);
            expect(unchangedProcess.description).toBe(originalDescription);
            expect(unchangedProcess.status).toBe(originalStatus);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'Process',
                    entityId: process.id,
                    action: 'UPDATE',
                    reason: 'Testing transaction rollback',
                },
            });
            expect(auditLog).toBeNull();
            console.log('✅ CRITICAL TEST PASSED: Failed audit log correctly rolled back parent data change');
        });
        it('should rollback ProductionLine creation when audit log creation fails', async () => {
            const originalCreate = auditService.create;
            auditService.create = jest
                .fn()
                .mockRejectedValue(new Error('Audit failure during creation'));
            const productionLineService = app.get('ProductionLineService');
            await expect(productionLineService.create({
                name: 'audit-test-should-not-exist',
                status: 'ACTIVE',
                reason: 'Testing creation rollback',
            }, 'test-user-id', '192.168.1.1', 'test-client')).rejects.toThrow('Audit failure during creation');
            auditService.create = originalCreate;
            const nonExistentLine = await prisma.productionLine.findFirst({
                where: {
                    name: 'audit-test-should-not-exist',
                },
            });
            expect(nonExistentLine).toBeNull();
            console.log('✅ CRITICAL TEST PASSED: Failed audit log correctly prevented ProductionLine creation');
        });
        it('should handle partial transaction failures correctly', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'audit-test-partial-failure',
                    description: 'Testing partial failure scenarios',
                    status: 'PENDING',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for partial failure test',
                },
            });
            const originalCreate = auditService.create;
            let callCount = 0;
            auditService.create = jest.fn().mockImplementation((...args) => {
                callCount++;
                if (callCount === 1) {
                    return originalCreate.apply(auditService, args);
                }
                else {
                    throw new Error('Second audit call failed');
                }
            });
            const processService = app.get('ProcessService');
            await expect(processService.update({
                id: process.id,
                title: 'partial-failure-test',
                description: 'This should not persist due to transaction rollback',
                reason: 'Testing partial failure',
            }, 'test-user-id', '192.168.1.1', 'test-client')).rejects.toThrow();
            auditService.create = originalCreate;
            const unchangedProcess = await prisma.process.findUnique({
                where: { id: process.id },
            });
            expect(unchangedProcess.title).toBe('audit-test-partial-failure');
            expect(unchangedProcess.description).toBe('Testing partial failure scenarios');
            console.log('✅ Partial transaction failures handled correctly with proper rollback');
        });
    });
    describe('Transaction Integrity and Error Handling', () => {
        it('should maintain transaction integrity across service boundaries', async () => {
            const createMutation = `
        mutation CreateProcess($input: CreateProcessInput!) {
          createProcess(input: $input) {
            id
            title
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        title: 'audit-test-transaction-integrity',
                        description: 'Testing transaction boundaries',
                        productionLineId: testProductionLineId,
                        reason: 'Testing service boundary transactions',
                    },
                },
            })
                .expect(200);
            const processId = response.body.data.createProcess.id;
            const createdProcess = await prisma.process.findUnique({
                where: { id: processId },
            });
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'Process',
                    entityId: processId,
                    action: 'CREATE',
                },
            });
            expect(createdProcess).toBeDefined();
            expect(auditLog).toBeDefined();
            expect(auditLog.reason).toBe('Testing service boundary transactions');
            console.log('✅ Transaction integrity maintained across service boundaries');
        });
        it('should handle concurrent transaction conflicts gracefully', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'audit-test-concurrent-updates',
                    description: 'Testing concurrent update scenarios',
                    status: 'PENDING',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for concurrency test',
                },
            });
            const updateMutation = `
        mutation UpdateProcess($input: UpdateProcessInput!) {
          updateProcess(input: $input) {
            id
            title
            description
          }
        }
      `;
            const concurrentUpdates = [
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${managerToken}`)
                    .send({
                    query: updateMutation,
                    variables: {
                        input: {
                            id: process.id,
                            title: 'concurrent-update-1',
                            description: 'First concurrent update',
                            reason: 'Concurrent test 1',
                        },
                    },
                }),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${managerToken}`)
                    .send({
                    query: updateMutation,
                    variables: {
                        input: {
                            id: process.id,
                            title: 'concurrent-update-2',
                            description: 'Second concurrent update',
                            reason: 'Concurrent test 2',
                        },
                    },
                }),
            ];
            const responses = await Promise.all(concurrentUpdates);
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.errors).toBeUndefined();
            });
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    entityType: 'Process',
                    entityId: process.id,
                    action: 'UPDATE',
                },
                orderBy: {
                    createdAt: 'asc',
                },
            });
            expect(auditLogs).toHaveLength(2);
            expect(auditLogs[0].reason).toBe('Concurrent test 1');
            expect(auditLogs[1].reason).toBe('Concurrent test 2');
            console.log('✅ Concurrent transactions handled gracefully with proper audit trails');
        });
    });
});
//# sourceMappingURL=audit-transaction.e2e-spec.js.map