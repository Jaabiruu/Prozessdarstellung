"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
describe('Integration & End-to-End Workflow Tests (E2E)', () => {
    let app;
    let prisma;
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
        await prisma.process.deleteMany({
            where: {
                title: { contains: 'workflow-test-' },
            },
        });
        await prisma.productionLine.deleteMany({
            where: {
                name: { contains: 'workflow-test-' },
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
    describe('Complete Business Workflow: Create ProductionLine → Add Processes → Update → Deactivate', () => {
        it('should execute complete pharmaceutical production workflow successfully', async () => {
            console.log('🏭 Step 1: Creating ProductionLine...');
            const createProductionLineMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(input: $input) {
            id
            name
            status
            isActive
            createdAt
          }
        }
      `;
            const productionLineResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: createProductionLineMutation,
                variables: {
                    input: {
                        name: 'workflow-test-pharmaceutical-line',
                        status: 'ACTIVE',
                        reason: 'Creating production line for complete workflow test',
                    },
                },
            })
                .expect(200);
            expect(productionLineResponse.body.errors).toBeUndefined();
            const productionLine = productionLineResponse.body.data.createProductionLine;
            expect(productionLine.name).toBe('workflow-test-pharmaceutical-line');
            expect(productionLine.isActive).toBe(true);
            const productionLineId = productionLine.id;
            console.log(`✅ ProductionLine created with ID: ${productionLineId}`);
            console.log('⚗️ Step 2: Adding processes to ProductionLine...');
            const createProcessMutation = `
        mutation CreateProcess($input: CreateProcessInput!) {
          createProcess(input: $input) {
            id
            title
            status
            progress
            productionLineId
          }
        }
      `;
            const processes = [
                {
                    title: 'workflow-test-raw-material-preparation',
                    description: 'Prepare and validate raw materials',
                    status: 'PENDING',
                    progress: 0.0,
                    x: 100.0,
                    y: 100.0,
                    color: '#FF6B6B',
                },
                {
                    title: 'workflow-test-mixing-process',
                    description: 'Mix ingredients according to formula',
                    status: 'PENDING',
                    progress: 0.0,
                    x: 300.0,
                    y: 100.0,
                    color: '#4ECDC4',
                },
                {
                    title: 'workflow-test-quality-control',
                    description: 'Quality control and testing',
                    status: 'PENDING',
                    progress: 0.0,
                    x: 500.0,
                    y: 100.0,
                    color: '#45B7D1',
                },
            ];
            const createdProcesses = [];
            for (const processData of processes) {
                const processResponse = await (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({
                    query: createProcessMutation,
                    variables: {
                        input: {
                            ...processData,
                            productionLineId,
                            reason: `Creating ${processData.title} for workflow test`,
                        },
                    },
                })
                    .expect(200);
                expect(processResponse.body.errors).toBeUndefined();
                const process = processResponse.body.data.createProcess;
                expect(process.productionLineId).toBe(productionLineId);
                createdProcesses.push(process);
            }
            console.log(`✅ Created ${createdProcesses.length} processes`);
            console.log('🔍 Step 3: Querying ProductionLine with nested processes...');
            const queryProductionLineWithProcesses = `
        query ProductionLineWithProcesses($id: String!) {
          productionLine(id: $id) {
            id
            name
            status
            isActive
            processes {
              id
              title
              description
              status
              progress
              x
              y
              color
            }
            processCount
          }
        }
      `;
            const queryResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: queryProductionLineWithProcesses,
                variables: { id: productionLineId },
            })
                .expect(200);
            expect(queryResponse.body.errors).toBeUndefined();
            const queriedProductionLine = queryResponse.body.data.productionLine;
            expect(queriedProductionLine.processes).toHaveLength(3);
            expect(queriedProductionLine.processCount).toBe(3);
            console.log('✅ Successfully queried ProductionLine with nested processes');
            console.log('🔄 Step 4: Updating processes to simulate production progress...');
            const updateProcessMutation = `
        mutation UpdateProcess($input: UpdateProcessInput!) {
          updateProcess(input: $input) {
            id
            title
            status
            progress
          }
        }
      `;
            const updateResponse1 = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: updateProcessMutation,
                variables: {
                    input: {
                        id: createdProcesses[0].id,
                        status: 'IN_PROGRESS',
                        progress: 0.5,
                        reason: 'Starting raw material preparation',
                    },
                },
            })
                .expect(200);
            expect(updateResponse1.body.data.updateProcess.status).toBe('IN_PROGRESS');
            expect(updateResponse1.body.data.updateProcess.progress).toBe(0.5);
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: updateProcessMutation,
                variables: {
                    input: {
                        id: createdProcesses[0].id,
                        status: 'COMPLETED',
                        progress: 1.0,
                        reason: 'Raw material preparation completed',
                    },
                },
            })
                .expect(200);
            await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: updateProcessMutation,
                variables: {
                    input: {
                        id: createdProcesses[1].id,
                        status: 'IN_PROGRESS',
                        progress: 0.3,
                        reason: 'Starting mixing process',
                    },
                },
            })
                .expect(200);
            console.log('✅ Successfully updated processes to simulate production flow');
            console.log('🏭 Step 5: Updating ProductionLine...');
            const updateProductionLineMutation = `
        mutation UpdateProductionLine($input: UpdateProductionLineInput!) {
          updateProductionLine(input: $input) {
            id
            name
            status
          }
        }
      `;
            const updatePLResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: updateProductionLineMutation,
                variables: {
                    input: {
                        id: productionLineId,
                        name: 'workflow-test-pharmaceutical-line-updated',
                        status: 'ACTIVE',
                        reason: 'Updating production line name for workflow test',
                    },
                },
            })
                .expect(200);
            expect(updatePLResponse.body.data.updateProductionLine.name).toBe('workflow-test-pharmaceutical-line-updated');
            console.log('✅ Successfully updated ProductionLine');
            console.log('📋 Step 6: Querying all processes by ProductionLine...');
            const queryProcessesByProductionLine = `
        query ProcessesByProductionLine($productionLineId: String!) {
          processesByProductionLine(productionLineId: $productionLineId) {
            id
            title
            status
            progress
          }
        }
      `;
            const processesResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: queryProcessesByProductionLine,
                variables: { productionLineId },
            })
                .expect(200);
            expect(processesResponse.body.data.processesByProductionLine).toHaveLength(3);
            const processStatuses = processesResponse.body.data.processesByProductionLine.map(p => p.status);
            expect(processStatuses).toContain('COMPLETED');
            expect(processStatuses).toContain('IN_PROGRESS');
            expect(processStatuses).toContain('PENDING');
            console.log('✅ Successfully queried processes by ProductionLine');
            console.log('🚫 Step 7: Testing deactivation protection with active processes...');
            const removeProductionLineMutation = `
        mutation RemoveProductionLine($id: String!, $reason: String!) {
          removeProductionLine(id: $id, reason: $reason) {
            id
            isActive
          }
        }
      `;
            const failedDeactivationResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: removeProductionLineMutation,
                variables: {
                    id: productionLineId,
                    reason: 'Attempting to deactivate with active processes',
                },
            })
                .expect(200);
            expect(failedDeactivationResponse.body.errors).toBeDefined();
            expect(failedDeactivationResponse.body.errors[0].message).toContain('active processes');
            console.log('✅ ProductionLine correctly protected from deactivation with active processes');
            console.log('✅ Step 8: Completing all remaining processes...');
            for (const process of createdProcesses.slice(1)) {
                await (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({
                    query: updateProcessMutation,
                    variables: {
                        input: {
                            id: process.id,
                            status: 'COMPLETED',
                            progress: 1.0,
                            reason: `Completing ${process.title} for workflow test`,
                        },
                    },
                })
                    .expect(200);
            }
            console.log('✅ All processes completed');
            console.log('🏭 Step 9: Deactivating ProductionLine...');
            const successfulDeactivationResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                query: removeProductionLineMutation,
                variables: {
                    id: productionLineId,
                    reason: 'Workflow test completed, deactivating production line',
                },
            })
                .expect(200);
            expect(successfulDeactivationResponse.body.errors).toBeUndefined();
            expect(successfulDeactivationResponse.body.data.removeProductionLine.isActive).toBe(false);
            console.log('✅ ProductionLine successfully deactivated');
            console.log('🔍 Step 10: Verifying final workflow state...');
            const finalStateResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query: queryProductionLineWithProcesses,
                variables: { id: productionLineId },
            })
                .expect(200);
            const finalProductionLine = finalStateResponse.body.data.productionLine;
            expect(finalProductionLine.isActive).toBe(false);
            expect(finalProductionLine.processes).toHaveLength(3);
            finalProductionLine.processes.forEach(process => {
                expect(process.status).toBe('COMPLETED');
                expect(process.progress).toBe(1.0);
            });
            console.log('✅ Final workflow state verified');
            console.log('📝 Step 11: Verifying complete audit trail...');
            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    OR: [
                        { entityType: 'ProductionLine', entityId: productionLineId },
                        { entityId: { in: createdProcesses.map(p => p.id) } },
                    ],
                },
                orderBy: { timestamp: 'asc' },
            });
            expect(auditLogs.length).toBeGreaterThanOrEqual(8);
            const actionTypes = auditLogs.map(log => log.action);
            expect(actionTypes).toContain('CREATE');
            expect(actionTypes).toContain('UPDATE');
            expect(actionTypes).toContain('DELETE');
            console.log(`✅ Complete audit trail verified with ${auditLogs.length} audit entries`);
            console.log('🎉 COMPLETE WORKFLOW TEST PASSED: End-to-end pharmaceutical production workflow executed successfully');
        });
    });
    describe('Cascade Effects and Relationship Constraints', () => {
        it('should prevent cascade deletion and maintain referential integrity', async () => {
            const productionLine = await prisma.productionLine.create({
                data: {
                    name: 'workflow-test-cascade-protection',
                    status: 'ACTIVE',
                    createdBy: 'test-user-id',
                    reason: 'Testing cascade protection',
                },
            });
            const process = await prisma.process.create({
                data: {
                    title: 'workflow-test-cascade-process',
                    description: 'Process for cascade testing',
                    productionLineId: productionLine.id,
                    createdBy: 'test-user-id',
                    reason: 'Testing cascade relationships',
                },
            });
            const removeProductionLineMutation = `
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
                query: removeProductionLineMutation,
                variables: {
                    id: productionLine.id,
                    reason: 'Testing cascade protection',
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('active processes');
            const unchangedPL = await prisma.productionLine.findUnique({
                where: { id: productionLine.id },
            });
            expect(unchangedPL.isActive).toBe(true);
            const unchangedProcess = await prisma.process.findUnique({
                where: { id: process.id },
            });
            expect(unchangedProcess).toBeDefined();
            expect(unchangedProcess.isActive).toBe(true);
            console.log('✅ Cascade deletion properly prevented, referential integrity maintained');
        });
        it('should handle orphaned process prevention', async () => {
            const createProcessMutation = `
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
                query: createProcessMutation,
                variables: {
                    input: {
                        title: 'workflow-test-orphaned-process',
                        description: 'This should fail',
                        productionLineId: 'non-existent-production-line-id',
                        reason: 'Testing orphan prevention',
                    },
                },
            })
                .expect(200);
            expect(response.body.errors).toBeDefined();
            expect(response.body.errors[0].message).toContain('not found');
            console.log('✅ Orphaned process creation properly prevented');
        });
    });
    describe('Pagination Edge Cases and Data Consistency', () => {
        it('should handle pagination boundaries correctly', async () => {
            const productionLines = [];
            for (let i = 1; i <= 12; i++) {
                const pl = await prisma.productionLine.create({
                    data: {
                        name: `workflow-test-pagination-${i.toString().padStart(2, '0')}`,
                        status: 'ACTIVE',
                        createdBy: 'test-user-id',
                        reason: `Pagination test ${i}`,
                    },
                });
                productionLines.push(pl);
            }
            const query = `
        query ProductionLines($limit: Int, $offset: Int) {
          productionLines(limit: $limit, offset: $offset) {
            id
            name
          }
        }
      `;
            const testCases = [
                { limit: 5, offset: 0, expectedCount: 5 },
                { limit: 5, offset: 5, expectedCount: 5 },
                { limit: 5, offset: 10, expectedCount: 2 },
                { limit: 10, offset: 15, expectedCount: 0 },
                { limit: 100, offset: 0, expectedCount: 12 },
            ];
            for (const testCase of testCases) {
                const response = await (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({
                    query,
                    variables: {
                        limit: testCase.limit,
                        offset: testCase.offset,
                    },
                })
                    .expect(200);
                expect(response.body.data.productionLines).toHaveLength(testCase.expectedCount);
            }
            console.log('✅ Pagination boundaries handled correctly');
        });
        it('should maintain data consistency under high load', async () => {
            const productionLine = await prisma.productionLine.create({
                data: {
                    name: 'workflow-test-load-consistency',
                    status: 'ACTIVE',
                    createdBy: 'test-user-id',
                    reason: 'Load testing',
                },
            });
            const operations = [];
            for (let i = 1; i <= 5; i++) {
                operations.push((0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({
                    query: `
                mutation CreateProcess($input: CreateProcessInput!) {
                  createProcess(input: $input) {
                    id
                    title
                  }
                }
              `,
                    variables: {
                        input: {
                            title: `workflow-test-concurrent-${i}`,
                            description: `Concurrent process ${i}`,
                            productionLineId: productionLine.id,
                            reason: `Concurrent creation ${i}`,
                        },
                    },
                }));
            }
            for (let i = 1; i <= 3; i++) {
                operations.push((0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({
                    query: `
                query ProductionLineQuery($id: String!) {
                  productionLine(id: $id) {
                    id
                    name
                    processes {
                      id
                      title
                    }
                  }
                }
              `,
                    variables: { id: productionLine.id },
                }));
            }
            const results = await Promise.all(operations);
            results.forEach((result, index) => {
                expect(result.status).toBe(200);
                expect(result.body.errors).toBeUndefined();
            });
            const finalProcesses = await prisma.process.findMany({
                where: { productionLineId: productionLine.id },
            });
            expect(finalProcesses).toHaveLength(5);
            finalProcesses.forEach((process, index) => {
                expect(process.title).toBe(`workflow-test-concurrent-${index + 1}`);
            });
            console.log('✅ Data consistency maintained under concurrent load');
        });
    });
});
//# sourceMappingURL=integration-workflow.e2e-spec.js.map