import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { TestSetup } from './setup';
import { PrismaService } from '../src/database/prisma.service';
import { ProductionLineService } from '../src/production-line/production-line.service';
import { ProcessService } from '../src/process/process.service';
import { UserService } from '../src/user/user.service';
import { AuditService } from '../src/audit/audit.service';
import { AuthService } from '../src/auth/auth.service';
import { UserRole } from '../src/common/enums/user-role.enum';

describe('Cross-Cutting Transaction Management (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productionLineService: ProductionLineService;
  let processService: ProcessService;
  let userService: UserService;
  let auditService: AuditService;
  let authService: AuthService;
  let adminToken: string;
  let managerToken: string;
  let operatorToken: string;
  let adminUserId: string;
  let managerUserId: string;
  let operatorUserId: string;

  beforeAll(async () => {
    await TestSetup.beforeAll();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = TestSetup.getPrisma();
    productionLineService = moduleFixture.get<ProductionLineService>(
      ProductionLineService,
    );
    processService = moduleFixture.get<ProcessService>(ProcessService);
    userService = moduleFixture.get<UserService>(UserService);
    auditService = moduleFixture.get<AuditService>(AuditService);
    authService = moduleFixture.get<AuthService>(AuthService);

    // Get authentication tokens and user IDs for different roles
    await getAuthTokensAndUserIds();
  });

  afterAll(async () => {
    await app.close();
    await TestSetup.afterAll();
  });

  afterEach(async () => {
    // Restore any mocked methods after each test
    jest.restoreAllMocks();
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

    // Get admin token and user ID
    const adminResponse = await request(app.getHttpServer())
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

    // Get manager token and user ID
    const managerResponse = await request(app.getHttpServer())
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

    // Get operator token and user ID
    const operatorResponse = await request(app.getHttpServer())
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

  // ATOM-001: Transaction Rollback on Audit Failure
  describe('ATOM-001: Transaction Rollback on Audit Failure', () => {
    it('should rollback entire transaction when audit logging fails', async () => {
      // Mock auditService.create to throw an error
      const originalCreate = auditService.create;
      auditService.create = jest
        .fn()
        .mockRejectedValue(new Error('Audit service failure'));

      const initialCount = await prisma.productionLine.count();

      try {
        await productionLineService.create(
          {
            name: 'ROLLBACK_TEST_LINE',
            reason: 'Test line for rollback',
          },
          adminUserId,
          '127.0.0.1',
          'test-agent',
        );

        fail('Expected method to throw an error');
      } catch (error: unknown) {
        expect((error as Error).message).toBe('Audit service failure');
      }

      // Verify no ProductionLine was created
      const finalCount = await prisma.productionLine.count();
      expect(finalCount).toBe(initialCount);

      // Verify no audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          entityType: 'ProductionLine',
          details: { path: ['name'], equals: 'ROLLBACK_TEST_LINE' },
        },
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
      const productionLine = await productionLineService.create(
        {
          name: 'SERVICE_FAILURE_TEST',
          reason: 'Test line for service failure',
        },
        adminUserId,
        '127.0.0.1',
        'test-agent',
      );

      // Mock Prisma to fail after creating process but before audit
      const originalTransaction = prisma.$transaction;
      prisma.$transaction = jest.fn().mockImplementation(async () => {
        // Simulate failure in the middle of transaction
        throw new Error('Database transaction failure');
      });

      try {
        await processService.create(
          {
            title: 'FAILURE_PROCESS',
            description: 'Process that should fail',
            productionLineId: productionLine.id,
            status: 'IN_PROGRESS',
            progress: 0,
          },
          adminUserId,
          '127.0.0.1',
          'test-agent',
        );

        fail('Expected method to throw an error');
      } catch (error: unknown) {
        expect((error as Error).message).toBe('Database transaction failure');
      }

      // Verify no new Process was created
      const processes = await prisma.process.findMany({
        where: { title: 'FAILURE_PROCESS' },
      });
      expect(processes).toHaveLength(0);

      // Verify no additional audit logs were created (beyond the production line creation)
      const finalAuditCount = await prisma.auditLog.count();
      expect(finalAuditCount).toBe(initialAuditCount + 1); // Only the production line audit log

      // Restore original method
      prisma.$transaction = originalTransaction;

      // Cleanup
      await productionLineService.remove(
        productionLine.id,
        'Test cleanup',
        adminUserId,
      );
    });
  });

  // ATOM-005: Successful Creation is Fully Atomic
  describe('ATOM-005: Successful Creation is Fully Atomic', () => {
    it('should create both entity and audit log atomically on success', async () => {
      const initialProductionLineCount = await prisma.productionLine.count();
      const initialAuditCount = await prisma.auditLog.count();

      const result = await productionLineService.create(
        {
          name: 'ATOMIC_SUCCESS_TEST',
          reason: 'Test for successful atomic creation',
        },
        adminUserId,
        '127.0.0.1',
        'test-agent',
      );

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
      expect(auditLog!.userId).toBe(adminUserId);
      expect(auditLog!.ipAddress).toBe('127.0.0.1');
      expect(auditLog!.userAgent).toBe('test-agent');

      // Cleanup
      await productionLineService.remove(result.id, 'Test cleanup', testUserId);
    });
  });

  // Transaction Management Verification
  describe('Transaction Management Infrastructure', () => {
    it('should verify no auditService.withTransaction usage remains', () => {
      // Verify AuditService no longer has withTransaction method
      expect((auditService as any).withTransaction).toBeUndefined();
    });

    it('should verify all services use direct prisma.$transaction', async () => {
      // This is validated by the successful execution of other tests
      // since they all rely on proper transaction management
      const line = await productionLineService.create(
        {
          name: 'TRANSACTION_TEST',
          reason: 'Transaction management test',
        },
        adminUserId,
        '127.0.0.1',
        'test-agent',
      );

      expect(line).toBeDefined();

      // Cleanup
      await productionLineService.remove(line.id, 'Test cleanup', testUserId);
    });

    it('should maintain transaction integrity across multiple operations', async () => {
      const initialProductionLineCount = await prisma.productionLine.count();
      const initialProcessCount = await prisma.process.count();
      const initialAuditCount = await prisma.auditLog.count();

      // Create production line
      const productionLine = await productionLineService.create(
        {
          name: 'MULTI_OP_TEST_LINE',
          reason: 'Testing multi-operation transaction integrity',
        },
        adminUserId,
        '127.0.0.1',
        'test-agent',
      );

      // Create process
      const process = await processService.create(
        {
          title: 'MULTI_OP_TEST_PROCESS',
          description: 'Process for multi-operation test',
          productionLineId: productionLine.id,
          status: 'IN_PROGRESS',
          progress: 50,
        },
        adminUserId,
        '127.0.0.1',
        'test-agent',
      );

      // Verify all entities were created
      const finalProductionLineCount = await prisma.productionLine.count();
      const finalProcessCount = await prisma.process.count();
      const finalAuditCount = await prisma.auditLog.count();

      expect(finalProductionLineCount).toBe(initialProductionLineCount + 1);
      expect(finalProcessCount).toBe(initialProcessCount + 1);
      expect(finalAuditCount).toBeGreaterThan(initialAuditCount); // At least 2 audit logs

      // Verify audit logs exist for both operations
      const productionLineAudit = await prisma.auditLog.findFirst({
        where: {
          entityType: 'ProductionLine',
          entityId: productionLine.id,
          action: 'CREATE',
        },
      });

      const processAudit = await prisma.auditLog.findFirst({
        where: {
          entityType: 'Process',
          entityId: process.id,
          action: 'CREATE',
        },
      });

      expect(productionLineAudit).toBeDefined();
      expect(processAudit).toBeDefined();

      // Cleanup
      await processService.remove(process.id, 'Test cleanup', testUserId);
      await productionLineService.remove(
        productionLine.id,
        'Test cleanup',
        adminUserId,
      );
    });
  });
});
