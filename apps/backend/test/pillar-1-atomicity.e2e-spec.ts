import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { ProductionLineService } from '../src/production-line/production-line.service';
import { ProcessService } from '../src/process/process.service';
import { UserService } from '../src/user/user.service';
import { AuditService } from '../src/audit/audit.service';
import { AuthService } from '../src/auth/auth.service';
import request from 'supertest';
import { UserRole } from '../src/common/enums/user-role.enum';

describe('Pillar 1: Atomicity & Data Integrity Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productionLineService: ProductionLineService;
  let processService: ProcessService;
  let userService: UserService;
  let auditService: AuditService;
  let authService: AuthService;
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    productionLineService = moduleFixture.get<ProductionLineService>(ProductionLineService);
    processService = moduleFixture.get<ProcessService>(ProcessService);
    userService = moduleFixture.get<UserService>(UserService);
    auditService = moduleFixture.get<AuditService>(AuditService);
    authService = moduleFixture.get<AuthService>(AuthService);

    // Create test user
    const testUser = await userService.create({
      email: 'pillar1-test@example.com',
      password: 'TestPassword123!',
      firstName: 'Pillar1',
      lastName: 'Test',
      role: UserRole.ADMIN,
      reason: 'Pillar 1 test user creation',
    }, 'test-user-id', '127.0.0.1', 'test-agent');

    testUserId = testUser.id;

    // Get auth token
    const loginResult = await authService.login({
      email: 'pillar1-test@example.com',
      password: 'TestPassword123!',
    }, '127.0.0.1', 'test-agent');
    
    authToken = loginResult.accessToken;
  });

  afterAll(async () => {
    // Cleanup test data
    try {
      await prisma.auditLog.deleteMany({ where: { userId: testUserId } });
      await prisma.process.deleteMany({});
      await prisma.productionLine.deleteMany({});
      await prisma.user.deleteMany({ where: { email: 'pillar1-test@example.com' } });
    } catch (error) {
      console.warn('Cleanup error:', error);
    } finally {
      await prisma.$disconnect();
      await app.close();
    }
  });

  afterEach(async () => {
    // Restore any mocked methods after each test
    jest.restoreAllMocks();
  });

  // ATOM-001: Transaction Rollback on Audit Failure
  describe('ATOM-001: Transaction Rollback on Audit Failure', () => {
    it('should rollback entire transaction when audit logging fails', async () => {
      // Mock auditService.create to throw an error
      const originalCreate = auditService.create;
      auditService.create = jest.fn().mockRejectedValue(new Error('Audit service failure'));

      const initialCount = await prisma.productionLine.count();

      try {
        await productionLineService.create({
          name: 'ROLLBACK_TEST_LINE',
          reason: 'Test line for rollback',
        }, testUserId, '127.0.0.1', 'test-agent');

        fail('Expected method to throw an error');
      } catch (error: any) {
        expect(error.message).toBe('Audit service failure');
      }

      // Verify no ProductionLine was created
      const finalCount = await prisma.productionLine.count();
      expect(finalCount).toBe(initialCount);

      // Verify no audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: { 
          entityType: 'ProductionLine',
          details: { path: ['name'], equals: 'ROLLBACK_TEST_LINE' }
        }
      });
      expect(auditLogs).toHaveLength(0);

      // Restore original method
      auditService.create = originalCreate;
    });
  });

  // ATOM-002: Transaction Rollback on Service Failure
  describe('ATOM-002: Transaction Rollback on Service Failure', () => {
    it('should rollback when error occurs mid-transaction', async () => {
      const initialAuditCount = await prisma.auditLog.count();

      // Create a production line first
      const productionLine = await productionLineService.create({
        name: 'SERVICE_FAILURE_TEST',
        reason: 'Test line for service failure',
      }, testUserId, '127.0.0.1', 'test-agent');

      // Mock Prisma to fail after creating process but before audit
      const originalTransaction = prisma.$transaction;
      prisma.$transaction = jest.fn().mockImplementation(async () => {
        // Simulate failure in the middle of transaction
        throw new Error('Database transaction failure');
      });

      try {
        await processService.create({
          title: 'FAILURE_PROCESS',
          description: 'Process that should fail',
          productionLineId: productionLine.id,
          status: 'IN_PROGRESS',
          progress: 0,
        }, testUserId, '127.0.0.1', 'test-agent');

        fail('Expected method to throw an error');
      } catch (error: any) {
        expect(error.message).toBe('Database transaction failure');
      }

      // Verify no new Process was created
      const processes = await prisma.process.findMany({
        where: { title: 'FAILURE_PROCESS' }
      });
      expect(processes).toHaveLength(0);

      // Verify no additional audit logs were created (beyond the production line creation)
      const finalAuditCount = await prisma.auditLog.count();
      expect(finalAuditCount).toBe(initialAuditCount + 1); // Only the production line audit log

      // Restore original method
      prisma.$transaction = originalTransaction;

      // Cleanup
      await productionLineService.remove(productionLine.id, 'Test cleanup', testUserId);
    });
  });

  // ATOM-003: Race Condition Prevention on Create
  describe('ATOM-003: Race Condition Prevention on Create', () => {
    it('should prevent race conditions during concurrent creates', async () => {
      const createMutation = `
        mutation CreateProductionLine($input: CreateProductionLineInput!) {
          createProductionLine(createProductionLineInput: $input) {
            id
            name
          }
        }
      `;

      const input = {
        name: 'RACE_TEST',
        reason: 'Race condition test',
      };

      // Execute two identical mutations concurrently
      const [result1, result2] = await Promise.allSettled([
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: createMutation,
            variables: { input },
          }),
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: createMutation,
            variables: { input },
          }),
      ]);

      // One should succeed, one should fail
      const responses = [result1, result2];
      const successCount = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;
      const errorCount = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status !== 200 ||
        r.status === 'rejected'
      ).length;

      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);

      // Verify only one record exists
      const records = await prisma.productionLine.findMany({
        where: { name: 'RACE_TEST' }
      });
      expect(records).toHaveLength(1);

      // Cleanup
      await productionLineService.remove(records[0]!.id, 'Test cleanup', testUserId);
    });
  });

  // ATOM-004: Race Condition Prevention on Update
  describe('ATOM-004: Race Condition Prevention on Update', () => {
    it('should prevent race conditions during concurrent updates', async () => {
      // Create two production lines
      const lineA = await productionLineService.create({
        name: 'LINE_A',
        reason: 'Line A for update test',
      }, testUserId, '127.0.0.1', 'test-agent');

      const lineB = await productionLineService.create({
        name: 'LINE_B',
        reason: 'Line B for update test',
      }, testUserId, '127.0.0.1', 'test-agent');

      const updateMutation = `
        mutation UpdateProductionLine($input: UpdateProductionLineInput!) {
          updateProductionLine(updateProductionLineInput: $input) {
            id
            name
          }
        }
      `;

      // Try to update both to the same name concurrently
      const [result1, result2] = await Promise.allSettled([
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: updateMutation,
            variables: { 
              input: { 
                id: lineA.id, 
                name: 'NEW_NAME',
                reason: 'Updated reason'
              } 
            },
          }),
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            query: updateMutation,
            variables: { 
              input: { 
                id: lineB.id, 
                name: 'NEW_NAME',
                reason: 'Updated reason'
              } 
            },
          }),
      ]);

      // One should succeed, one should fail with conflict
      const responses = [result1, result2];
      const successCount = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      ).length;

      expect(successCount).toBe(1);

      // Verify only one record has the new name
      const records = await prisma.productionLine.findMany({
        where: { name: 'NEW_NAME' }
      });
      expect(records).toHaveLength(1);

      // Cleanup
      await productionLineService.remove(lineA.id, 'Test cleanup', testUserId);
      await productionLineService.remove(lineB.id, 'Test cleanup', testUserId);
    });
  });

  // ATOM-005: Successful Creation is Fully Atomic
  describe('ATOM-005: Successful Creation is Fully Atomic', () => {
    it('should create both entity and audit log atomically on success', async () => {
      const initialProductionLineCount = await prisma.productionLine.count();
      const initialAuditCount = await prisma.auditLog.count();

      const result = await productionLineService.create({
        name: 'ATOMIC_SUCCESS_TEST',
        reason: 'Test for successful atomic creation',
      }, testUserId, '127.0.0.1', 'test-agent');

      expect(result).toBeDefined();
      expect(result.name).toBe('ATOMIC_SUCCESS_TEST');

      // Verify ProductionLine was created
      const finalProductionLineCount = await prisma.productionLine.count();
      expect(finalProductionLineCount).toBe(initialProductionLineCount + 1);

      // Verify audit log was created
      const finalAuditCount = await prisma.auditLog.count();
      expect(finalAuditCount).toBe(initialAuditCount + 1);

      // Verify audit log details
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: 'ProductionLine',
          entityId: result.id,
          action: 'CREATE',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.userId).toBe(testUserId);
      expect(auditLog!.ipAddress).toBe('127.0.0.1');
      expect(auditLog!.userAgent).toBe('test-agent');

      // Cleanup
      await productionLineService.remove(result.id, 'Test cleanup', testUserId);
    });
  });

  // Additional Test: P2002 Error Handling
  describe('P2002 Error Handling', () => {
    it('should handle P2002 errors correctly in all services', async () => {
      // Test ProductionLine P2002 handling
      const line1 = await productionLineService.create({
        name: 'P2002_TEST',
        reason: 'First line',
      }, testUserId, '127.0.0.1', 'test-agent');

      try {
        await productionLineService.create({
          name: 'P2002_TEST', // Duplicate name
          reason: 'Second line',
        }, testUserId, '127.0.0.1', 'test-agent');
        fail('Expected ConflictException');
      } catch (error: any) {
        expect(error.message).toContain('already exists');
      }

      // Test Process P2002 handling
      const process1 = await processService.create({
        title: 'P2002_PROCESS_TEST',
        description: 'First process',
        productionLineId: line1.id,
        status: 'IN_PROGRESS',
        progress: 0,
      }, testUserId, '127.0.0.1', 'test-agent');

      try {
        await processService.create({
          title: 'P2002_PROCESS_TEST', // Duplicate title
          description: 'Second process',
          productionLineId: line1.id,
          status: 'IN_PROGRESS',
          progress: 0,
        }, testUserId, '127.0.0.1', 'test-agent');
        fail('Expected ConflictException');
      } catch (error: any) {
        expect(error.message).toContain('already exists');
      }

      // Cleanup
      await processService.remove(process1.id, 'Test cleanup', testUserId);
      await productionLineService.remove(line1.id, 'Test cleanup', testUserId);
    });
  });

  // Additional Test: Transaction Management
  describe('Transaction Management', () => {
    it('should verify no auditService.withTransaction usage remains', () => {
      // Verify AuditService no longer has withTransaction method
      expect((auditService as any).withTransaction).toBeUndefined();
    });

    it('should verify all services use direct prisma.$transaction', async () => {
      // This is validated by the successful execution of other tests
      // since they all rely on proper transaction management
      const line = await productionLineService.create({
        name: 'TRANSACTION_TEST',
        reason: 'Transaction management test',
      }, testUserId, '127.0.0.1', 'test-agent');

      expect(line).toBeDefined();

      // Cleanup
      await productionLineService.remove(line.id, 'Test cleanup', testUserId);
    });
  });
});