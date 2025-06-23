"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
describe('Process Entity CRUD Operations (E2E)', () => {
    let app;
    let prisma;
    let adminToken;
    let managerToken;
    let operatorToken;
    let testProductionLineId;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = setup_1.TestSetup.getPrisma();
        await getAuthTokens();
        await setupTestProductionLine();
    });
    afterAll(async () => {
        await app.close();
    });
    beforeEach(async () => {
        await prisma.process.deleteMany({
            where: {
                title: {
                    contains: 'test-',
                },
            },
        });
    });
    async function getAuthTokens() {
        const loginMutation = `
      mutation Login($input: LoginInput!) {
        login(input: $input) {
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
    }
    async function setupTestProductionLine() {
        const productionLine = await prisma.productionLine.create({
            data: {
                name: 'test-production-line-for-processes',
                status: 'ACTIVE',
                createdBy: 'test-user-id',
                reason: 'Setup for process tests',
            },
        });
        testProductionLineId = productionLine.id;
    }
    describe('CRUD-002: A user can update a Process', () => {
        it('should return 200 OK and update Process with new data and updatedAt timestamp', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'test-process-to-update',
                    description: 'Original description',
                    duration: 120,
                    progress: 0.0,
                    status: 'PENDING',
                    x: 100.0,
                    y: 200.0,
                    color: '#FF0000',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for update test',
                },
            });
            const initialUpdatedAt = process.updatedAt;
            await new Promise(resolve => setTimeout(resolve, 10));
            const updateMutation = `
        mutation UpdateProcess($input: UpdateProcessInput!) {
          updateProcess(input: $input) {
            id
            title
            description
            duration
            progress
            status
            x
            y
            color
            updatedAt
          }
        }
      `;
            const updateData = {
                id: process.id,
                title: 'test-updated-process-title',
                description: 'Updated description',
                duration: 180,
                progress: 0.5,
                status: 'IN_PROGRESS',
                x: 150.0,
                y: 250.0,
                color: '#00FF00',
                reason: 'Testing process update functionality',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: updateMutation,
                variables: { input: updateData },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.updateProcess).toBeDefined();
            expect(response.body.data.updateProcess).toMatchObject({
                id: process.id,
                title: updateData.title,
                description: updateData.description,
                duration: updateData.duration,
                progress: updateData.progress,
                status: updateData.status,
                x: updateData.x,
                y: updateData.y,
                color: updateData.color,
            });
            const updatedTimestamp = new Date(response.body.data.updateProcess.updatedAt);
            expect(updatedTimestamp.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
            const dbRecord = await prisma.process.findUnique({
                where: { id: process.id },
            });
            expect(dbRecord.title).toBe(updateData.title);
            expect(dbRecord.description).toBe(updateData.description);
            expect(dbRecord.duration).toBe(updateData.duration);
            expect(dbRecord.progress).toBe(updateData.progress);
            expect(dbRecord.status).toBe(updateData.status);
            expect(dbRecord.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
        });
        it('should allow ADMIN to update Process', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'test-admin-update-process',
                    description: 'Process for admin update test',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for admin update test',
                },
            });
            const updateMutation = `
        mutation UpdateProcess($input: UpdateProcessInput!) {
          updateProcess(input: $input) {
            id
            title
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: updateMutation,
                variables: {
                    input: {
                        id: process.id,
                        title: 'admin-updated-title',
                        reason: 'Admin updating process',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.updateProcess.title).toBe('admin-updated-title');
        });
        it('should allow OPERATOR to update Process', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'test-operator-update-process',
                    description: 'Process for operator update test',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for operator update test',
                },
            });
            const updateMutation = `
        mutation UpdateProcess($input: UpdateProcessInput!) {
          updateProcess(input: $input) {
            id
            title
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: updateMutation,
                variables: {
                    input: {
                        id: process.id,
                        title: 'operator-updated-title',
                        reason: 'Operator updating process',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.updateProcess.title).toBe('operator-updated-title');
        });
    });
    describe('CRUD-004: Attempting to update a non-existent entity fails gracefully', () => {
        it('should return NotFoundException when updating non-existent Process', async () => {
            const updateMutation = `
        mutation UpdateProcess($input: UpdateProcessInput!) {
          updateProcess(input: $input) {
            id
            title
          }
        }
      `;
            const input = {
                id: 'non-existent-process-id-12345',
                title: 'Updated Title',
                reason: 'Testing non-existent update',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: updateMutation,
                variables: { input },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('not found');
            expect(response.body.data.updateProcess).toBeNull();
            const nonExistentRecord = await prisma.process.findUnique({
                where: { id: input.id },
            });
            expect(nonExistentRecord).toBeNull();
        });
    });
    describe('RBAC-001: A MANAGER can update a Process', () => {
        it('should return 200 OK when MANAGER updates Process', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'test-manager-rbac-process',
                    description: 'Process for RBAC test',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for RBAC test',
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
            const updateData = {
                id: process.id,
                title: 'manager-updated-title',
                description: 'Manager successfully updated this process',
                reason: 'Testing MANAGER role permissions',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: updateMutation,
                variables: { input: updateData },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.updateProcess).toBeDefined();
            expect(response.body.data.updateProcess.title).toBe(updateData.title);
            expect(response.body.data.updateProcess.description).toBe(updateData.description);
            const dbRecord = await prisma.process.findUnique({
                where: { id: process.id },
            });
            expect(dbRecord.title).toBe(updateData.title);
        });
    });
    describe('RBAC-002: An OPERATOR is denied from updating a Process', () => {
        it('should return ForbiddenException (403) when OPERATOR tries to update Process', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'test-operator-denied-process',
                    description: 'Process for RBAC denial test',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for RBAC denial test',
                },
            });
            const updateMutation = `
        mutation UpdateProcess($input: UpdateProcessInput!) {
          updateProcess(input: $input) {
            id
            title
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: updateMutation,
                variables: {
                    input: {
                        id: process.id,
                        title: 'operator-attempted-update',
                        reason: 'Operator should not be able to update',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.updateProcess).toBeDefined();
        });
    });
    describe('Process Validation and Business Logic', () => {
        it('should prevent creating Process with duplicate title in same ProductionLine', async () => {
            await prisma.process.create({
                data: {
                    title: 'test-duplicate-title',
                    description: 'First process with this title',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for duplicate test',
                },
            });
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
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        title: 'test-duplicate-title',
                        description: 'Attempt to create duplicate',
                        productionLineId: testProductionLineId,
                        reason: 'Testing duplicate prevention',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('already exists');
            expect(response.body.data.createProcess).toBeNull();
        });
        it('should validate ProductionLine exists when creating Process', async () => {
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
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        title: 'test-invalid-production-line',
                        description: 'Process with invalid production line',
                        productionLineId: 'non-existent-production-line-id',
                        reason: 'Testing production line validation',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('not found');
            expect(response.body.data.createProcess).toBeNull();
        });
        it('should prevent creating Process on inactive ProductionLine', async () => {
            const inactiveProductionLine = await prisma.productionLine.create({
                data: {
                    name: 'test-inactive-production-line',
                    status: 'INACTIVE',
                    isActive: false,
                    createdBy: 'test-user-id',
                    reason: 'Setup for inactive test',
                },
            });
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
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        title: 'test-process-on-inactive-line',
                        description: 'Should not be allowed',
                        productionLineId: inactiveProductionLine.id,
                        reason: 'Testing inactive line restriction',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('inactive production line');
            expect(response.body.data.createProcess).toBeNull();
        });
    });
    describe('Process Relationships and Queries', () => {
        it('should query processes by production line with pagination', async () => {
            for (let i = 1; i <= 5; i++) {
                await prisma.process.create({
                    data: {
                        title: `test-query-process-${i}`,
                        description: `Process ${i} for query test`,
                        productionLineId: testProductionLineId,
                        createdBy: 'test-user-id',
                        reason: `Setup process ${i} for query test`,
                    },
                });
            }
            const query = `
        query ProcessesByProductionLine($productionLineId: String!, $limit: Int, $offset: Int) {
          processesByProductionLine(productionLineId: $productionLineId, limit: $limit, offset: $offset) {
            id
            title
            description
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query,
                variables: {
                    productionLineId: testProductionLineId,
                    limit: 3,
                    offset: 1,
                },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.processesByProductionLine).toBeDefined();
            expect(response.body.data.processesByProductionLine).toHaveLength(3);
        });
        it('should filter processes by status', async () => {
            await prisma.process.create({
                data: {
                    title: 'test-pending-process',
                    status: 'PENDING',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup pending process',
                },
            });
            await prisma.process.create({
                data: {
                    title: 'test-in-progress-process',
                    status: 'IN_PROGRESS',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup in-progress process',
                },
            });
            const query = `
        query Processes($status: ProcessStatus) {
          processes(status: $status) {
            id
            title
            status
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query,
                variables: {
                    status: 'PENDING',
                },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.processes).toBeDefined();
            expect(response.body.data.processes.length).toBeGreaterThan(0);
            response.body.data.processes.forEach(process => {
                expect(process.status).toBe('PENDING');
            });
        });
    });
    describe('Audit Trail Integration', () => {
        it('should create audit log when Process is created', async () => {
            const createMutation = `
        mutation CreateProcess($input: CreateProcessInput!) {
          createProcess(input: $input) {
            id
            title
          }
        }
      `;
            const input = {
                title: 'test-audit-creation-process',
                description: 'Process for audit test',
                productionLineId: testProductionLineId,
                reason: 'Testing audit trail creation',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createMutation,
                variables: { input },
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
            expect(auditLog).toBeDefined();
            expect(auditLog.reason).toBe(input.reason);
            expect(auditLog.details).toMatchObject({
                title: input.title,
                description: input.description,
                productionLineId: input.productionLineId,
            });
        });
        it('should create audit log when Process is updated', async () => {
            const process = await prisma.process.create({
                data: {
                    title: 'test-audit-update-process',
                    description: 'Original description',
                    productionLineId: testProductionLineId,
                    createdBy: 'test-user-id',
                    reason: 'Setup for audit update test',
                },
            });
            const updateMutation = `
        mutation UpdateProcess($input: UpdateProcessInput!) {
          updateProcess(input: $input) {
            id
          }
        }
      `;
            const reason = 'Testing audit trail for update';
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: updateMutation,
                variables: {
                    input: {
                        id: process.id,
                        title: 'Updated title for audit test',
                        reason,
                    },
                },
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
            expect(auditLog.reason).toBe(reason);
            const details = auditLog.details;
            expect(details.changes).toMatchObject({
                title: 'Updated title for audit test',
            });
            expect(details.previousValues).toMatchObject({
                title: 'test-audit-update-process',
            });
        });
    });
    describe('Atomicity & Race Condition Tests', () => {
        it('should prevent race conditions during concurrent Process creates (ATOM-004)', async () => {
            const createMutation = `
        mutation CreateProcess($input: CreateProcessInput!) {
          createProcess(input: $input) {
            id
            title
          }
        }
      `;
            const input = {
                title: 'RACE_TEST_PROCESS',
                description: 'Race condition test process',
                productionLineId: testProductionLineId,
                status: 'PENDING',
                progress: 0,
                reason: 'Race condition test',
            };
            const [result1, result2] = await Promise.allSettled([
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({
                    query: createMutation,
                    variables: { input },
                }),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({
                    query: createMutation,
                    variables: { input },
                }),
            ]);
            const responses = [result1, result2];
            const successCount = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200 && !r.value.body.errors).length;
            const errorCount = responses.filter(r => (r.status === 'fulfilled' && (r.value.status !== 200 || r.value.body.errors)) ||
                r.status === 'rejected').length;
            expect(successCount).toBe(1);
            expect(errorCount).toBe(1);
            const records = await prisma.process.findMany({
                where: { title: 'RACE_TEST_PROCESS' },
            });
            expect(records).toHaveLength(1);
        });
        it('should handle P2002 errors correctly for title uniqueness (ATOM-005)', async () => {
            const createMutation = `
        mutation CreateProcess($input: CreateProcessInput!) {
          createProcess(input: $input) {
            id
            title
          }
        }
      `;
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        title: 'P2002_TEST_PROCESS',
                        description: 'First process for P2002 test',
                        productionLineId: testProductionLineId,
                        status: 'PENDING',
                        progress: 0,
                        reason: 'First process for P2002 test',
                    },
                },
            });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        title: 'P2002_TEST_PROCESS',
                        description: 'Should fail due to duplicate title',
                        productionLineId: testProductionLineId,
                        status: 'IN_PROGRESS',
                        progress: 50,
                        reason: 'Should fail due to duplicate title',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('already exists');
            expect(response.body.data.createProcess).toBeNull();
        });
        it('should maintain transaction integrity during Process operations', async () => {
            const initialCount = await prisma.process.count();
            const initialAuditCount = await prisma.auditLog.count();
            const createMutation = `
        mutation CreateProcess($input: CreateProcessInput!) {
          createProcess(input: $input) {
            id
            title
            description
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        title: 'TRANSACTION_INTEGRITY_PROCESS',
                        description: 'Testing transaction integrity',
                        productionLineId: testProductionLineId,
                        status: 'PENDING',
                        progress: 0,
                        reason: 'Testing transaction integrity',
                    },
                },
            })
                .expect(200);
            const processId = response.body.data.createProcess.id;
            const finalCount = await prisma.process.count();
            const finalAuditCount = await prisma.auditLog.count();
            expect(finalCount).toBe(initialCount + 1);
            expect(finalAuditCount).toBeGreaterThan(initialAuditCount);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'Process',
                    entityId: processId,
                    action: 'CREATE',
                },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.reason).toBe('Testing transaction integrity');
        });
        it('should handle transaction rollback on process creation failure', async () => {
            const initialCount = await prisma.process.count();
            const initialAuditCount = await prisma.auditLog.count();
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
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        title: 'INVALID_FK_PROCESS',
                        description: 'Should fail due to invalid production line',
                        productionLineId: 'non-existent-production-line-id',
                        status: 'PENDING',
                        progress: 0,
                        reason: 'Testing transaction rollback',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.data.createProcess).toBeNull();
            const finalCount = await prisma.process.count();
            const finalAuditCount = await prisma.auditLog.count();
            expect(finalCount).toBe(initialCount);
            expect(finalAuditCount).toBe(initialAuditCount);
        });
    });
});
//# sourceMappingURL=process.e2e-spec.js.map