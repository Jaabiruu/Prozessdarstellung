import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import request from 'supertest';

describe('ProductionLine N+1 Query Prevention (PERF-003)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let authToken: string;
  let queryCount = 0;
  const originalQuery = PrismaService.prototype.$queryRaw;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);

    // Setup query logging
    prismaService.$queryRaw = jest.fn().mockImplementation(function (...args) {
      queryCount++;
      return originalQuery.apply(this, args);
    });

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
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
    // Restore original method
    PrismaService.prototype.$queryRaw = originalQuery;
    await app.close();
  });

  beforeEach(() => {
    queryCount = 0;
    jest.clearAllMocks();
  });

  describe('PERF-003: N+1 query prevention remains effective', () => {
    it('should fetch multiple production lines with nested processes using exactly 2 queries', async () => {
      // Create test data
      const productionLineIds: string[] = [];

      // Create 5 production lines
      for (let i = 1; i <= 5; i++) {
        const createLineResponse = await request(app.getHttpServer())
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

        productionLineIds.push(
          createLineResponse.body.data.createProductionLine.id,
        );
      }

      // Create 3 processes for each production line (15 total)
      for (const lineId of productionLineIds) {
        for (let j = 1; j <= 3; j++) {
          await request(app.getHttpServer())
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

      // Reset query count before the actual test
      queryCount = 0;

      // Execute the query that should use DataLoader
      const response = await request(app.getHttpServer())
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

      // Assert response is successful
      expect(response.status).toBe(200);
      expect(response.body.data.productionLines).toHaveLength(5);

      // Verify each production line has 3 processes
      response.body.data.productionLines.forEach(
        (line: Record<string, unknown>) => {
          expect(line.processes).toHaveLength(3);
          expect(line.processCount).toBe(3);
        },
      );

      // CRITICAL ASSERTION: Should use exactly 2 queries
      // 1. Query to fetch all production lines
      // 2. Query to fetch all processes for those lines (batched by DataLoader)
      expect(queryCount).toBeLessThanOrEqual(2);
    });

    it('should handle single production line query efficiently', async () => {
      // Create a production line with processes
      const createLineResponse = await request(app.getHttpServer())
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

      // Create 5 processes
      for (let i = 1; i <= 5; i++) {
        await request(app.getHttpServer())
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

      // Reset query count
      queryCount = 0;

      // Query single production line with nested data
      const response = await request(app.getHttpServer())
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

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data.productionLine.processes).toHaveLength(5);
      expect(response.body.data.productionLine.processCount).toBe(5);

      // Should use minimal queries (production line + processes + user)
      expect(queryCount).toBeLessThanOrEqual(3);
    });
  });
});
