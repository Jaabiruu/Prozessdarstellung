"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const setup_1 = require("./setup");
const prisma_service_1 = require("../src/database/prisma.service");
const supertest_1 = __importDefault(require("supertest"));
describe('ProductionLine N+1 Query Prevention (PERF-003)', () => {
    let app;
    let prismaService;
    let adminToken;
    let managerToken;
    let operatorToken;
    let adminUserId;
    let managerUserId;
    let operatorUserId;
    let queryCount = 0;
    const originalQuery = prisma_service_1.PrismaService.prototype.$queryRaw;
    beforeAll(async () => {
        await setup_1.TestSetup.beforeAll();
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
        await getAuthTokensAndUserIds();
    });
    afterAll(async () => {
        prisma_service_1.PrismaService.prototype.$queryRaw = originalQuery;
        await app.close();
        await setup_1.TestSetup.afterAll();
    });
    beforeEach(() => {
        queryCount = 0;
        jest.clearAllMocks();
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
    describe('PERF-003: N+1 query prevention remains effective', () => {
        it('should fetch multiple production lines with nested processes using exactly 2 queries', async () => {
            const productionLineIds = [];
            for (let i = 1; i <= 5; i++) {
                const createLineResponse = await (0, supertest_1.default)(app.getHttpServer())
                    .post('/graphql')
                    .set('Authorization', `Bearer ${adminToken}`)
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
                        .set('Authorization', `Bearer ${adminToken}`)
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
                .set('Authorization', `Bearer ${adminToken}`)
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
                .set('Authorization', `Bearer ${adminToken}`)
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
                    .set('Authorization', `Bearer ${adminToken}`)
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
                .set('Authorization', `Bearer ${adminToken}`)
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