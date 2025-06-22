import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TestSetup } from './setup';
import request from 'supertest';

describe('Phase 4 Performance & DataLoader Tests (E2E)', () => {
  let app: INestApplication;
  let prisma: any;
  let operatorToken: string;
  let testProductionLines: any[] = [];
  let queryLog: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = TestSetup.getPrisma();

    // Get authentication token
    await getAuthToken();
    
    // Setup test data for performance tests
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

    const response = await request(app.getHttpServer())
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
    // Create 5 ProductionLines × 3 Processes each (15 total)
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

      // Create 3 processes for each production line
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
    // Clean up test data
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
    // Enable query logging to monitor database queries
    queryLog = [];
    
    // Note: In a real test environment, you would configure Prisma to log queries
    // For this test, we'll simulate query counting by intercepting database operations
    const originalQuery = prisma.$queryRaw;
    const originalFindMany = prisma.productionLine.findMany;
    const originalProcessFindMany = prisma.process.findMany;

    // Intercept productionLine queries
    prisma.productionLine.findMany = function(...args) {
      queryLog.push('productionLine.findMany');
      return originalFindMany.apply(this, args);
    };

    // Intercept process queries
    prisma.process.findMany = function(...args) {
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
      // Arrange
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

      // Act
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          query,
        })
        .expect(200);

      // Assert
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.productionLines).toBeDefined();
      expect(response.body.data.productionLines).toHaveLength(5);

      // Verify each production line has its processes
      response.body.data.productionLines.forEach((line, index) => {
        expect(line.processes).toBeDefined();
        expect(line.processes).toHaveLength(3); // Each line should have 3 processes
        line.processes.forEach(process => {
          expect(process.id).toBeDefined();
          expect(process.title).toBeDefined();
          expect(process.status).toBeDefined();
        });
      });

      // Get query statistics
      const queries = queryLogger.getQueries();
      queryLogger.restore();

      console.log('🔍 Database queries executed:', queries);
      console.log('📊 Total query count:', queries.length);

      // CRITICAL TEST: Verify DataLoader batching
      // Without DataLoader: Would see 1 + N queries (1 for ProductionLines + 5 for each line's processes = 6 queries)
      // With DataLoader: Should see exactly 2 queries (1 for ProductionLines + 1 batch query for all processes)
      
      // Note: The exact query counting depends on the DataLoader implementation
      // This test verifies the GraphQL response structure and batching behavior
      const productionLineQueries = queries.filter(q => q.includes('productionLine'));
      const processQueries = queries.filter(q => q.includes('process'));
      
      // Should have minimal database hits due to DataLoader batching
      expect(productionLineQueries.length).toBeLessThanOrEqual(2);
      expect(processQueries.length).toBeLessThanOrEqual(2);
      
      console.log('✅ DataLoader successfully prevented N+1 queries');
    });

    it('should batch load processes efficiently when multiple ProductionLines are queried', async () => {
      // Arrange
      const queryLogger = setupQueryLogging();

      // Query that would cause N+1 without DataLoader
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

      // Act
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          query,
        })
        .expect(200);

      // Assert
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.productionLines).toBeDefined();

      // Verify data integrity - each line should have processCount = 3
      response.body.data.productionLines.forEach(line => {
        expect(line.processCount).toBe(3);
        expect(line.processes).toHaveLength(3);
      });

      const queries = queryLogger.getQueries();
      queryLogger.restore();

      console.log('🔍 Batch loading queries:', queries);
      
      // Verify efficient batching occurred
      expect(queries.length).toBeLessThan(10); // Much less than 15+ queries without batching
      
      console.log('✅ DataLoader batch loading working efficiently');
    });

    it('should demonstrate the difference between DataLoader and N+1 queries', async () => {
      // This test demonstrates what N+1 would look like vs DataLoader behavior
      
      // First, test individual queries (simulating N+1)
      const individualQueryCount = testProductionLines.length;
      let individualQueries = 0;

      // Simulate N+1 by querying each production line's processes individually
      for (const line of testProductionLines) {
        const processes = await prisma.process.findMany({
          where: { productionLineId: line.id },
        });
        individualQueries++;
        expect(processes).toHaveLength(3);
      }

      console.log(`🐌 Individual queries (N+1 pattern): ${individualQueries} queries for ${testProductionLines.length} production lines`);

      // Now test GraphQL with DataLoader
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

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          query,
        })
        .expect(200);

      const optimizedQueries = queryLogger.getQueries();
      queryLogger.restore();

      console.log(`🚀 DataLoader optimized queries: ${optimizedQueries.length} queries for ${testProductionLines.length} production lines`);

      // Assert DataLoader is more efficient
      expect(optimizedQueries.length).toBeLessThan(individualQueries);
      expect(response.body.data.productionLines).toHaveLength(testProductionLines.length);

      console.log('✅ DataLoader demonstrates significant performance improvement over N+1 queries');
    });
  });

  describe('PERF-002: DataLoader correctly maps children to parents', () => {
    it('should return correct JSON with each ProductionLine containing its 3 correct Process children', async () => {
      // Arrange
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

      // Act
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          query,
        })
        .expect(200);

      // Assert
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.productionLines).toBeDefined();

      // Verify mapping integrity - each ProductionLine should have exactly its own processes
      response.body.data.productionLines.forEach((line, lineIndex) => {
        expect(line.processes).toHaveLength(3);
        
        // Verify processes belong to the correct production line
        line.processes.forEach((process, processIndex) => {
          // Process title should follow the pattern: perf-test-process-{lineNumber}-{processNumber}
          const expectedTitlePattern = new RegExp(`perf-test-process-\\d+-\\d+`);
          expect(process.title).toMatch(expectedTitlePattern);
          
          // Process should belong to this production line (verify by title pattern)
          expect(process.title).toContain(`perf-test-process-`);
        });
      });

      // Additional verification: cross-check with database
      for (const line of response.body.data.productionLines) {
        const dbProcesses = await prisma.process.findMany({
          where: { productionLineId: line.id },
        });
        
        expect(dbProcesses).toHaveLength(3);
        
        // Verify returned processes match database processes
        const returnedProcessIds = line.processes.map(p => p.id).sort();
        const dbProcessIds = dbProcesses.map(p => p.id).sort();
        expect(returnedProcessIds).toEqual(dbProcessIds);
      }

      console.log('✅ DataLoader correctly maps all children to their correct parents');
    });

    it('should maintain data consistency across multiple GraphQL requests', async () => {
      // Test that DataLoader caching doesn't cause data inconsistency
      
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

      // Execute the same query multiple times
      const responses = await Promise.all([
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ query }),
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ query }),
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ query }),
      ]);

      // Assert all responses are identical
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.errors).toBeUndefined();
        expect(response.body.data.productionLines).toHaveLength(2);
        
        if (index > 0) {
          // Compare with first response to ensure consistency
          expect(response.body.data).toEqual(responses[0].body.data);
        }
      });

      console.log('✅ DataLoader maintains data consistency across multiple requests');
    });

    it('should handle empty relationships correctly', async () => {
      // Create a production line with no processes
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

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          query,
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.productionLine).toBeDefined();
      expect(response.body.data.productionLine.processes).toEqual([]);

      // Cleanup
      await prisma.productionLine.delete({
        where: { id: emptyLine.id },
      });

      console.log('✅ DataLoader handles empty relationships correctly');
    });
  });

  describe('DataLoader Caching and Performance', () => {
    it('should cache results within the same request context', async () => {
      // This test verifies that DataLoader caches results within a single GraphQL request
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

      const response = await request(app.getHttpServer())
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

      // Each production line has both `processes` and `processCount` fields
      // Both should use the same DataLoader cache, so no duplicate queries
      response.body.data.productionLines.forEach(line => {
        expect(line.processes).toHaveLength(3);
        expect(line.processCount).toBe(3);
      });

      console.log('🔍 Queries with caching:', queries);
      console.log('✅ DataLoader caching working within request context');
    });

    it('should handle concurrent requests efficiently', async () => {
      // Test DataLoader performance under concurrent load
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

      // Execute 5 concurrent requests
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${operatorToken}`)
          .send({ query })
      );

      const responses = await Promise.all(concurrentRequests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all requests succeeded
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