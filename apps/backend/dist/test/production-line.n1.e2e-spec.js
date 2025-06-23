"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const prisma_service_1 = require("../src/database/prisma.service");
const supertest_1 = __importDefault(require("supertest"));
describe('ProductionLine N+1 Query Prevention (PERF-003)', () => {
    let app;
    let prismaService;
    let authToken;
    let queryCount = 0;
    const originalQuery = prisma_service_1.PrismaService.prototype.$queryRaw;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        await app.init();
        prismaService = app.get(prisma_service_1.PrismaService);
        prismaService.$queryRaw = jest.fn().mockImplementation(function (...args) {
            queryCount++;
            return originalQuery.apply(this, args);
        });
        const loginResponse = await (0, supertest_1.default)(app.getHttpServer())
            .post('/graphql')
            .send({
            query: `
          mutation {
            login(input: { email: "admin@pharma.com", password: "SecurePass123!" }) {
              access_token
              user {
                id
              }
            }
          }
        `,
        });
        authToken = loginResponse.body.data.login.access_token;
    });
    afterAll(async () => {
        prisma_service_1.PrismaService.prototype.$queryRaw = originalQuery;
        await app.close();
    });
    beforeEach(() => {
        queryCount = 0;
        jest.clearAllMocks();
    });
    describe('PERF-003: N+1 query prevention remains effective', () => {
        it('should fetch multiple production lines with nested processes using exactly 2 queries', async () => {
            const productionLineIds = [];
            for (let i = 1; i <= 5; i++) {
                const createLineResponse = await (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    query: `
              mutation {
                createProductionLine(input: {
                  name: "Test Line ${i}",
                  status: ACTIVE,
                  reason: "N+1 test"
                }) {
                  id
                }
              }
            `,
                });
                productionLineIds.push(createLineResponse.body.data.createProductionLine.id);
            }
            for (const lineId of productionLineIds) {
                for (let j = 1; j <= 3; j++) {
                    await (0, supertest_1.default)(app.getHttpServer())
                        .post('/graphql')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send({
                        query: `
                mutation {
                  createProcess(input: {
                    title: "Process ${j} for ${lineId}",
                    description: "Test process",
                    productionLineId: "${lineId}",
                    reason: "N+1 test"
                  }) {
                    id
                  }
                }
              `,
                    });
                }
            }
            queryCount = 0;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                query: `
            query {
              productionLines(limit: 5) {
                id
                name
                status
                processes {
                  id
                  title
                  status
                }
                processCount
              }
            }
          `,
            });
            expect(response.status).toBe(200);
            expect(response.body.data.productionLines).toHaveLength(5);
            response.body.data.productionLines.forEach((line) => {
                expect(line.processes).toHaveLength(3);
                expect(line.processCount).toBe(3);
            });
            expect(queryCount).toBeLessThanOrEqual(2);
        });
        it('should handle single production line query efficiently', async () => {
            const createLineResponse = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                query: `
            mutation {
              createProductionLine(input: {
                name: "Single Line Test",
                status: ACTIVE,
                reason: "Single query test"
              }) {
                id
              }
            }
          `,
            });
            const lineId = createLineResponse.body.data.createProductionLine.id;
            for (let i = 1; i <= 5; i++) {
                await (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    query: `
              mutation {
                createProcess(input: {
                  title: "Process ${i}",
                  description: "Test process",
                  productionLineId: "${lineId}",
                  reason: "Single query test"
                }) {
                  id
                }
              }
            `,
                });
            }
            queryCount = 0;
            const response = await (0, supertest_1.default)(app.getHttpServer())
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                query: `
            query {
              productionLine(id: "${lineId}") {
                id
                name
                status
                creator {
                  id
                  email
                }
                processes {
                  id
                  title
                  status
                }
                processCount
              }
            }
          `,
            });
            expect(response.status).toBe(200);
            expect(response.body.data.productionLine.processes).toHaveLength(5);
            expect(response.body.data.productionLine.processCount).toBe(5);
            expect(queryCount).toBeLessThanOrEqual(3);
        });
    });
});
//# sourceMappingURL=production-line.n1.e2e-spec.js.map