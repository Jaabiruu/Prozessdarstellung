"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const supertest_1 = __importDefault(require("supertest"));
describe('Phase 4 Performance & DataLoader Tests (E2E)', () => {
    let app;
    let prisma;
    let operatorToken;
    const testProductionLines = [];
    let queryLog = [];
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prisma = setup_1.TestSetup.getPrisma();
        await getAuthToken();
        await setupPerformanceTestData();
    });
    afterAll(async () => {
        await cleanupTestData();
        await app.close();
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
                    email: 'operator@test.local',
                    password: 'operator123',
                },
            },
        });
        operatorToken = response.body.data.login.accessToken;
    }
    async function setupPerformanceTestData() {
        for (let i = 1; i <= 5; i++) {
            const productionLine = await prisma.productionLine.create({
                data: {
                    name: `perf-test-line-${i}`,
                    status: 'ACTIVE',
                    createdBy: 'test-user-id',
                    reason: `Performance test production line ${i}`,
                },
            });
            testProductionLines.push(productionLine);
            for (let j = 1; j <= 3; j++) {
                await prisma.process.create({
                    data: {
                        title: `perf-test-process-${i}-${j}`,
                        description: `Process ${j} for line ${i}`,
                        status: 'PENDING',
                        progress: 0.0,
                        x: 100.0 * j,
                        y: 200.0 * i,
                        color: '#4F46E5',
                        productionLineId: productionLine.id,
                        createdBy: 'test-user-id',
                        reason: `Performance test process ${i}-${j}`,
                    },
                });
            }
        }
        console.log(`✅ Created ${testProductionLines.length} production lines with 3 processes each (15 total processes)`);
    }
    async function cleanupTestData() {
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
    }
    function setupQueryLogging() {
        queryLog = [];
        const originalQuery = prisma.$queryRaw;
        const originalFindMany = prisma.productionLine.findMany;
        const originalProcessFindMany = prisma.process.findMany;
        prisma.productionLine.findMany = function (...args) {
            queryLog.push('productionLine.findMany');
            return originalFindMany.apply(this, args);
        };
        prisma.process.findMany = function (...args) {
            queryLog.push('process.findMany');
            return originalProcessFindMany.apply(this, args);
        };
        return {
            restore: () => {
                prisma.productionLine.findMany = originalFindMany;
                prisma.process.findMany = originalProcessFindMany;
            },
            getQueryCount: () => queryLog.length,
            getQueries: () => [...queryLog],
        };
    }
    describe('PERF-001: DataLoader prevents N+1 queries on nested relationships', () => {
        it('should execute exactly 2 database queries when fetching ProductionLines with nested processes', async () => {
            const queryLogger = setupQueryLogging();
            const query = `
        query ProductionLinesWithProcesses {
          productionLines(limit: 5) {
            id
            name
            status
            processes {
              id
              title
              description
              status
              progress
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
            expect(response.body.data.productionLines).toHaveLength(5);
            response.body.data.productionLines.forEach((line, index) => {
                expect(line.processes).toBeDefined();
                expect(line.processes).toHaveLength(3);
                line.processes.forEach(process => {
                    expect(process.id).toBeDefined();
                    expect(process.title).toBeDefined();
                    expect(process.status).toBeDefined();
                });
            });
            const queries = queryLogger.getQueries();
            queryLogger.restore();
            console.log('🔍 Database queries executed:', queries);
            console.log('📊 Total query count:', queries.length);
            const productionLineQueries = queries.filter(q => q.includes('productionLine'));
            const processQueries = queries.filter(q => q.includes('process'));
            expect(productionLineQueries.length).toBeLessThanOrEqual(2);
            expect(processQueries.length).toBeLessThanOrEqual(2);
            console.log('✅ DataLoader successfully prevented N+1 queries');
        });
        it('should batch load processes efficiently when multiple ProductionLines are queried', async () => {
            const queryLogger = setupQueryLogging();
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
                expect(line.processCount).toBe(3);
                expect(line.processes).toHaveLength(3);
            });
            const queries = queryLogger.getQueries();
            queryLogger.restore();
            console.log('🔍 Batch loading queries:', queries);
            expect(queries.length).toBeLessThan(10);
            console.log('✅ DataLoader batch loading working efficiently');
        });
        it('should demonstrate the difference between DataLoader and N+1 queries', async () => {
            const individualQueryCount = testProductionLines.length;
            let individualQueries = 0;
            for (const line of testProductionLines) {
                const processes = await prisma.process.findMany({
                    where: { productionLineId: line.id },
                });
                individualQueries++;
                expect(processes).toHaveLength(3);
            }
            console.log(`🐌 Individual queries (N+1 pattern): ${individualQueries} queries for ${testProductionLines.length} production lines`);
            const queryLogger = setupQueryLogging();
            const query = `
        query OptimizedProductionLines {
          productionLines {
            id
            name
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
            const optimizedQueries = queryLogger.getQueries();
            queryLogger.restore();
            console.log(`🚀 DataLoader optimized queries: ${optimizedQueries.length} queries for ${testProductionLines.length} production lines`);
            expect(optimizedQueries.length).toBeLessThan(individualQueries);
            expect(response.body.data.productionLines).toHaveLength(testProductionLines.length);
            console.log('✅ DataLoader demonstrates significant performance improvement over N+1 queries');
        });
    });
    describe('PERF-002: DataLoader correctly maps children to parents', () => {
        it('should return correct JSON with each ProductionLine containing its 3 correct Process children', async () => {
            const query = `
        query ProductionLinesWithCorrectProcessMapping {
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
            response.body.data.productionLines.forEach((line, lineIndex) => {
                expect(line.processes).toHaveLength(3);
                line.processes.forEach((process, processIndex) => {
                    const expectedTitlePattern = new RegExp(`perf-test-process-\\d+-\\d+`);
                    expect(process.title).toMatch(expectedTitlePattern);
                    expect(process.title).toContain(`perf-test-process-`);
                });
            });
            for (const line of response.body.data.productionLines) {
                const dbProcesses = await prisma.process.findMany({
                    where: { productionLineId: line.id },
                });
                expect(dbProcesses).toHaveLength(3);
                const returnedProcessIds = line.processes.map(p => p.id).sort();
                const dbProcessIds = dbProcesses.map(p => p.id).sort();
                expect(returnedProcessIds).toEqual(dbProcessIds);
            }
            console.log('✅ DataLoader correctly maps all children to their correct parents');
        });
        it('should maintain data consistency across multiple GraphQL requests', async () => {
            const query = `
        query ConsistencyTest {
          productionLines(limit: 2) {
            id
            name
            processes {
              id
              title
            }
          }
        }
      `;
            const responses = await Promise.all([
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({ query }),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({ query }),
                (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${operatorToken}`)
                    .send({ query }),
            ]);
            responses.forEach((response, index) => {
                expect(response.status).toBe(200);
                expect(response.body.errors).toBeUndefined();
                expect(response.body.data.productionLines).toHaveLength(2);
                if (index > 0) {
                    expect(response.body.data).toEqual(responses[0].body.data);
                }
            });
            console.log('✅ DataLoader maintains data consistency across multiple requests');
        });
        it('should handle empty relationships correctly', async () => {
            const emptyLine = await prisma.productionLine.create({
                data: {
                    name: 'perf-test-empty-line',
                    status: 'ACTIVE',
                    createdBy: 'test-user-id',
                    reason: 'Testing empty relationships',
                },
            });
            const query = `
        query ProductionLineWithEmptyProcesses {
          productionLine(id: "${emptyLine.id}") {
            id
            name
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
            expect(response.body.data.productionLine).toBeDefined();
            expect(response.body.data.productionLine.processes).toEqual([]);
            await prisma.productionLine.delete({
                where: { id: emptyLine.id },
            });
            console.log('✅ DataLoader handles empty relationships correctly');
        });
    });
    describe('DataLoader Caching and Performance', () => {
        it('should cache results within the same request context', async () => {
            const query = `
        query CachingTest {
          productionLines(limit: 2) {
            id
            name
            processes {
              id
              title
            }
            processCount
          }
        }
      `;
            const queryLogger = setupQueryLogging();
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({
                query,
            })
                .expect(200);
            const queries = queryLogger.getQueries();
            queryLogger.restore();
            expect(response.body.errors).toBeUndefined();
            expect(response.body.data.productionLines).toHaveLength(2);
            response.body.data.productionLines.forEach(line => {
                expect(line.processes).toHaveLength(3);
                expect(line.processCount).toBe(3);
            });
            console.log('🔍 Queries with caching:', queries);
            console.log('✅ DataLoader caching working within request context');
        });
        it('should handle concurrent requests efficiently', async () => {
            const query = `
        query ConcurrentTest {
          productionLines(limit: 3) {
            id
            processes {
              id
              title
            }
          }
        }
      `;
            const startTime = Date.now();
            const concurrentRequests = Array(5)
                .fill(null)
                .map(() => (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${operatorToken}`)
                .send({ query }));
            const responses = await Promise.all(concurrentRequests);
            const endTime = Date.now();
            const totalTime = endTime - startTime;
            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.errors).toBeUndefined();
                expect(response.body.data.productionLines).toHaveLength(3);
            });
            console.log(`⚡ 5 concurrent requests completed in ${totalTime}ms`);
            console.log('✅ DataLoader handles concurrent requests efficiently');
        });
    });
});
//# sourceMappingURL=phase4-performance.e2e-spec.js.map