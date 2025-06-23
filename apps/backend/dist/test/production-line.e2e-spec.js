"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
describe('ProductionLine Entity CRUD Operations (E2E)', () => {
    let app;
    let prisma;
    let adminToken;
    let managerToken;
    let operatorToken;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = setup_1.TestSetup.getPrisma();
        await getAuthTokens();
    });
    afterAll(async () => {
        await app.close();
    });
    beforeEach(async () => {
        await prisma.productionLine.deleteMany({
            where: {
                name: {
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
    describe('CRUD-001: A user can create a ProductionLine', () => {
        it('should return 200 OK with new ProductionLine when MANAGER creates with valid input', async () => {
            const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
            status
            isActive
            createdAt
            updatedAt
            createdBy
          }
        }
      `;
            const input = {
                name: 'test-production-line-001',
                status: 'ACTIVE',
                reason: 'Testing production line creation',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: createMutation,
                variables: { input },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.createProductionLine).toBeDefined();
            expect(response.body.data.createProductionLine).toMatchObject({
                name: input.name,
                status: input.status,
                isActive: true,
            });
            expect(response.body.data.createProductionLine.id).toBeDefined();
            expect(response.body.data.createProductionLine.createdAt).toBeDefined();
            expect(response.body.data.createProductionLine.updatedAt).toBeDefined();
            expect(response.body.data.createProductionLine.createdBy).toBeDefined();
            const dbRecord = await prisma.productionLine.findUnique({
                where: { id: response.body.data.createProductionLine.id },
            });
            expect(dbRecord).toBeDefined();
            expect(dbRecord.name).toBe(input.name);
            expect(dbRecord.isActive).toBe(true);
        });
        it('should return 200 OK when ADMIN creates ProductionLine', async () => {
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
                name: 'test-admin-production-line',
                status: 'ACTIVE',
                reason: 'Admin creating production line',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                query: createMutation,
                variables: { input },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.createProductionLine).toBeDefined();
            expect(response.body.data.createProductionLine.name).toBe(input.name);
        });
        it('should return ForbiddenException when OPERATOR tries to create ProductionLine', async () => {
            const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
          }
        }
      `;
            const input = {
                name: 'test-forbidden-line',
                status: 'ACTIVE',
                reason: 'Operator should not be able to create',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: createMutation,
                variables: { input },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('Forbidden');
            expect(response.body.data.createProductionLine).toBeNull();
        });
        it('should return ConflictException when creating ProductionLine with duplicate name', async () => {
            const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
          }
        }
      `;
            const input = {
                name: 'test-duplicate-line',
                status: 'ACTIVE',
                reason: 'First creation',
            };
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: createMutation,
                variables: { input },
            });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        ...input,
                        reason: 'Attempted duplicate creation',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('already exists');
            expect(response.body.data.createProductionLine).toBeNull();
        });
    });
    describe('CRUD-003: A user can deactivate (soft-delete) a ProductionLine', () => {
        it('should return 200 OK and set isActive to false when MANAGER deactivates ProductionLine', async () => {
            const productionLine = await prisma.productionLine.create({
                data: {
                    name: 'test-line-to-deactivate',
                    status: 'ACTIVE',
                    createdBy: 'test-user-id',
                    reason: 'Setup for deactivation test',
                },
            });
            const removeMutation = `
        mutation RemoveProductionLine($id: String!, $reason: String!) {
          removeProductionLine(id: $id, reason: $reason) {
            id
            name
            isActive
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: removeMutation,
                variables: {
                    id: productionLine.id,
                    reason: 'Testing deactivation functionality',
                },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.removeProductionLine).toBeDefined();
            expect(response.body.data.removeProductionLine.isActive).toBe(false);
            const updatedRecord = await prisma.productionLine.findUnique({
                where: { id: productionLine.id },
            });
            expect(updatedRecord.isActive).toBe(false);
            const activeLines = await prisma.productionLine.findMany({
                where: { isActive: true },
            });
            expect(activeLines.find(line => line.id === productionLine.id)).toBeUndefined();
        });
        it('should return ConflictException when trying to deactivate already inactive ProductionLine', async () => {
            const productionLine = await prisma.productionLine.create({
                data: {
                    name: 'test-already-inactive',
                    status: 'ACTIVE',
                    isActive: false,
                    createdBy: 'test-user-id',
                    reason: 'Pre-deactivated for test',
                },
            });
            const removeMutation = `
        mutation RemoveProductionLine($id: String!, $reason: String!) {
          removeProductionLine(id: $id, reason: $reason) {
            id
            isActive
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: removeMutation,
                variables: {
                    id: productionLine.id,
                    reason: 'Attempting to deactivate inactive line',
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('already deactivated');
            expect(response.body.data.removeProductionLine).toBeNull();
        });
    });
    describe('CRUD-004: Attempting to update a non-existent entity fails gracefully', () => {
        it('should return NotFoundException when updating non-existent ProductionLine', async () => {
            const updateMutation = `
        mutation UpdateProductionLine($input: UpdateProductionLineInput!) {
          updateProductionLine(input: $input) {
            id
            name
          }
        }
      `;
            const input = {
                id: 'non-existent-id-12345',
                name: 'Updated Name',
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
            expect(response.body.data.updateProductionLine).toBeNull();
            const nonExistentRecord = await prisma.productionLine.findUnique({
                where: { id: input.id },
            });
            expect(nonExistentRecord).toBeNull();
        });
    });
    describe('CRUD-005: findAll query respects pagination parameters', () => {
        it('should return exactly 5 records starting from 11th when limit=5, offset=10', async () => {
            const productionLines = [];
            for (let i = 1; i <= 15; i++) {
                const line = await prisma.productionLine.create({
                    data: {
                        name: `test-pagination-line-${i.toString().padStart(2, '0')}`,
                        status: 'ACTIVE',
                        createdBy: 'test-user-id',
                        reason: `Setup for pagination test ${i}`,
                    },
                });
                productionLines.push(line);
            }
            productionLines.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            const query = `
        query ProductionLines($limit: Int, $offset: Int) {
          productionLines(limit: $limit, offset: $offset) {
            id
            name
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query,
                variables: {
                    limit: 5,
                    offset: 10,
                },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.productionLines).toBeDefined();
            expect(response.body.data.productionLines).toHaveLength(5);
            const returnedNames = response.body.data.productionLines.map(line => line.name);
            const expectedNames = productionLines
                .slice(10, 15)
                .map(line => line.name);
            expect(returnedNames).toEqual(expectedNames);
        });
        it('should return empty array when offset exceeds total records', async () => {
            for (let i = 1; i <= 5; i++) {
                await prisma.productionLine.create({
                    data: {
                        name: `test-offset-line-${i}`,
                        status: 'ACTIVE',
                        createdBy: 'test-user-id',
                        reason: `Setup for offset test ${i}`,
                    },
                });
            }
            const query = `
        query ProductionLines($limit: Int, $offset: Int) {
          productionLines(limit: $limit, offset: $offset) {
            id
            name
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query,
                variables: {
                    limit: 5,
                    offset: 10,
                },
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.productionLines).toBeDefined();
            expect(response.body.data.productionLines).toHaveLength(0);
        });
    });
    describe('Audit Trail Integration', () => {
        it('should create audit log when ProductionLine is created', async () => {
            const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
          }
        }
      `;
            const input = {
                name: 'test-audit-creation',
                status: 'ACTIVE',
                reason: 'Testing audit trail creation',
            };
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
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
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.reason).toBe(input.reason);
            expect(auditLog.details).toMatchObject({
                name: input.name,
                status: input.status,
            });
        });
        it('should create audit log when ProductionLine is deactivated', async () => {
            const productionLine = await prisma.productionLine.create({
                data: {
                    name: 'test-audit-deactivation',
                    status: 'ACTIVE',
                    createdBy: 'test-user-id',
                    reason: 'Setup for audit test',
                },
            });
            const removeMutation = `
        mutation RemoveProductionLine($id: String!, $reason: String!) {
          removeProductionLine(id: $id, reason: $reason) {
            id
          }
        }
      `;
            const reason = 'Testing audit trail for deactivation';
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: removeMutation,
                variables: {
                    id: productionLine.id,
                    reason,
                },
            })
                .expect(200);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'ProductionLine',
                    entityId: productionLine.id,
                    action: 'DELETE',
                },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.reason).toBe(reason);
            expect(auditLog.details).toMatchObject({
                action: 'deactivation',
                previouslyActive: true,
            });
        });
    });
    describe('Atomicity & Race Condition Tests', () => {
        it('should prevent race conditions during concurrent ProductionLine creates (ATOM-004)', async () => {
            const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
          }
        }
      `;
            const input = {
                name: 'RACE_TEST_LINE',
                status: 'ACTIVE',
                reason: 'Race condition test',
            };
            const [result1, result2] = await Promise.allSettled([
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${managerToken}`)
                    .send({
                    query: createMutation,
                    variables: { input },
                }),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${managerToken}`)
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
            const records = await prisma.productionLine.findMany({
                where: { name: 'RACE_TEST_LINE' },
            });
            expect(records).toHaveLength(1);
        });
        it('should handle P2002 errors correctly for name uniqueness (ATOM-005)', async () => {
            const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
          }
        }
      `;
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        name: 'P2002_TEST_LINE',
                        status: 'ACTIVE',
                        reason: 'First line for P2002 test',
                    },
                },
            });
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: createMutation,
                variables: {
                    input: {
                        name: 'P2002_TEST_LINE',
                        status: 'INACTIVE',
                        reason: 'Should fail due to duplicate name',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('already exists');
            expect(response.body.data.createProductionLine).toBeNull();
        });
        it('should maintain transaction integrity during ProductionLine operations', async () => {
            const initialCount = await prisma.productionLine.count();
            const initialAuditCount = await prisma.auditLog.count();
            const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
            status
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
                        name: 'TRANSACTION_INTEGRITY_TEST',
                        status: 'ACTIVE',
                        reason: 'Testing transaction integrity',
                    },
                },
            })
                .expect(200);
            const productionLineId = response.body.data.createProductionLine.id;
            const finalCount = await prisma.productionLine.count();
            const finalAuditCount = await prisma.auditLog.count();
            expect(finalCount).toBe(initialCount + 1);
            expect(finalAuditCount).toBeGreaterThan(initialAuditCount);
            const auditLog = await prisma.auditLog.findFirst({
                where: {
                    entityType: 'ProductionLine',
                    entityId: productionLineId,
                    action: 'CREATE',
                },
            });
            expect(auditLog).toBeDefined();
            expect(auditLog.reason).toBe('Testing transaction integrity');
        });
    });
    describe('Performance & DataLoader Tests', () => {
        beforeEach(async () => {
            for (let i = 1; i <= 3; i++) {
                const line = await prisma.productionLine.create({
                    data: {
                        name: `perf-test-line-${i}`,
                        status: 'ACTIVE',
                        createdBy: 'test-user-id',
                        reason: `Performance test line ${i}`,
                    },
                });
                for (let j = 1; j <= 2; j++) {
                    await prisma.process.create({
                        data: {
                            title: `perf-test-process-${i}-${j}`,
                            description: `Process ${j} for line ${i}`,
                            status: 'PENDING',
                            progress: 0.0,
                            x: 100.0 * j,
                            y: 200.0 * i,
                            color: '#4F46E5',
                            productionLineId: line.id,
                            createdBy: 'test-user-id',
                            reason: `Performance test process ${i}-${j}`,
                        },
                    });
                }
            }
        });
        afterEach(async () => {
            await prisma.process.deleteMany({
                where: {
                    title: {
                        contains: 'perf-test-',
                    },
                },
            });
            await prisma.productionLine.deleteMany({
                where: {
                    name: {
                        contains: 'perf-test-',
                    },
                },
            });
        });
        it('should prevent N+1 queries with DataLoader (PERF-001)', async () => {
            const query = `
        query ProductionLinesWithProcesses {
          productionLines(limit: 3) {
            id
            name
            status
            processes {
              id
              title
              status
            }
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query,
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.productionLines).toBeDefined();
            expect(response.body.data.productionLines).toHaveLength(3);
            response.body.data.productionLines.forEach((line, index) => {
                expect(line.processes).toBeDefined();
                expect(line.processes).toHaveLength(2);
                line.processes.forEach(process => {
                    expect(process.id).toBeDefined();
                    expect(process.title).toBeDefined();
                    expect(process.status).toBeDefined();
                });
            });
        });
        it('should correctly map children to parents with DataLoader (PERF-002)', async () => {
            const query = `
        query ProductionLinesWithCorrectMapping {
          productionLines {
            id
            name
            processes {
              id
              title
              description
            }
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query,
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.productionLines).toBeDefined();
            for (const line of response.body.data.productionLines) {
                if (line.name.includes('perf-test-')) {
                    expect(line.processes).toHaveLength(2);
                    line.processes.forEach((process) => {
                        expect(process.title).toMatch(/perf-test-process-\d+-\d+/);
                    });
                    const dbProcesses = await prisma.process.findMany({
                        where: { productionLineId: line.id },
                    });
                    expect(dbProcesses).toHaveLength(2);
                    const returnedProcessIds = line.processes.map(p => p.id).sort();
                    const dbProcessIds = dbProcesses.map(p => p.id).sort();
                    expect(returnedProcessIds).toEqual(dbProcessIds);
                }
            }
        });
        it('should handle processCount field resolver efficiently', async () => {
            const query = `
        query ProductionLinesWithProcessCount {
          productionLines {
            id
            name
            processCount
            processes {
              id
              title
            }
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query,
            })
                .expect(200);
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.productionLines).toBeDefined();
            response.body.data.productionLines.forEach(line => {
                if (line.name.includes('perf-test-')) {
                    expect(line.processCount).toBe(2);
                    expect(line.processes).toHaveLength(2);
                }
            });
        });
    });
    describe('Architecture Compliance - SRP (Single Responsibility Principle)', () => {
        it('should not have cross-entity methods in ProductionLineService (ARCH-001)', () => {
            const productionLineService = app.get('ProductionLineService');
            expect(productionLineService.findProcessesByProductionLine).toBeUndefined();
            expect(productionLineService.createProcess).toBeUndefined();
            expect(productionLineService.updateProcess).toBeUndefined();
            expect(productionLineService.removeProcess).toBeUndefined();
            expect(productionLineService.getProcessCount).toBeUndefined();
            expect(productionLineService.findAll).toBeDefined();
            expect(productionLineService.findOne).toBeDefined();
            expect(productionLineService.create).toBeDefined();
            expect(productionLineService.update).toBeDefined();
            expect(productionLineService.remove).toBeDefined();
        });
        it('should not have cross-entity top-level queries in ProductionLineResolver (ARCH-002)', async () => {
            const invalidQuery = `
        query {
          processesByProductionLine(productionLineId: "test-id") {
            id
            title
          }
        }
      `;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: invalidQuery,
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('Cannot query field');
            const validQuery = `
        query {
          productionLines(limit: 1) {
            id
            name
            processes {
              id
              title
            }
          }
        }
      `;
            const validResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: validQuery,
            })
                .expect(200);
            expect(validResponse.body.errors).toBeUndefined();
            expect(validResponse.body.data.productionLines).toBeDefined();
        });
    });
});
//# sourceMappingURL=production-line.e2e-spec.js.map