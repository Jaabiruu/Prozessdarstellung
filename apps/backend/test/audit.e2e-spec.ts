import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TestSetup } from './setup';
import request from 'supertest';

describe('Audit Trail System (E2E)', () => {
  let app: INestApplication;
  let prisma: any;
  let adminToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = TestSetup.getPrisma();

    // Get admin token and user ID
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@test.local' },
    });
    adminUserId = adminUser.id;
    adminToken = await getAuthToken('admin@test.local', 'admin123');
  });

  afterAll(async () => {
    await app.close();
  });

  async function getAuthToken(email: string, password: string): Promise<string> {
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
          input: { email, password },
        },
      });

    return response.body.data.login.accessToken;
  }

  describe('AUDIT-001: Successful mutation creates audit log via interceptor', () => {
    it('should create audit log automatically for updateUser mutation', async () => {
      // First create a user to update
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;

      const createResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'audittest@test.local',
              password: 'password123',
              firstName: 'Audit',
              lastName: 'Test',
              role: 'OPERATOR',
              reason: 'Creating user for audit testing',
            },
          },
        });

      const userId = createResponse.body.data.createUser.id;

      // Count audit logs before update
      const auditCountBefore = await prisma.auditLog.count();

      // Update the user (this should trigger audit logging)
      const updateUserMutation = `
        mutation UpdateUser($input: UpdateUserInput!) {
          updateUser(input: $input) {
            id
            firstName
          }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: updateUserMutation,
          variables: {
            input: {
              id: userId,
              firstName: 'Updated',
              reason: 'Testing audit log creation',
            },
          },
        })
        .expect(200);

      // Check that audit log was created
      const auditCountAfter = await prisma.auditLog.count();
      expect(auditCountAfter).toBeGreaterThan(auditCountBefore);

      // Verify the audit log details
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: 'User',
          entityId: userId,
          action: 'UPDATE',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.userId).toBe(adminUserId);
      expect(auditLog!.reason).toBe('Testing audit log creation');
      expect(auditLog!.entityType).toBe('User');
      expect(auditLog!.action).toBe('UPDATE');
    });
  });

  describe('AUDIT-002: Service-level call to auditService.log() creates detailed log', () => {
    it('should create detailed audit log for user creation with rich context', async () => {
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;

      // Count audit logs before
      const auditCountBefore = await prisma.auditLog.count();

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'detailed-audit@test.local',
              password: 'password123',
              firstName: 'Detailed',
              lastName: 'Audit',
              role: 'OPERATOR',
              reason: 'Testing detailed audit logging',
            },
          },
        })
        .expect(200);

      const userId = response.body.data.createUser.id;

      // Check that audit log was created
      const auditCountAfter = await prisma.auditLog.count();
      expect(auditCountAfter).toBeGreaterThan(auditCountBefore);

      // Find the specific audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: 'User',
          entityId: userId,
          action: 'CREATE',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.userId).toBe(adminUserId);
      expect(auditLog!.reason).toBe('Testing detailed audit logging');
      expect(auditLog!.details).toBeDefined();
      
      // Verify rich context in details
      const details = auditLog!.details as any;
      expect(details.email).toBe('detailed-audit@test.local');
      expect(details.role).toBe('OPERATOR');
      expect(details.firstName).toBe('Detailed');
      expect(details.lastName).toBe('Audit');
    });
  });

  describe('AUDIT-003: Transaction Rollback Test', () => {
    it('should rollback both User and AuditLog when transaction fails', async () => {
      // Count users and audit logs before
      const userCountBefore = await prisma.user.count();
      const auditCountBefore = await prisma.auditLog.count();

      // Use the testTransactionRollback mutation to force a rollback
      const rollbackMutation = `
        mutation TestTransactionRollback($testUserEmail: String!, $shouldFail: Boolean!) {
          testTransactionRollback(testUserEmail: $testUserEmail, shouldFail: $shouldFail) {
            success
            message
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: rollbackMutation,
          variables: {
            testUserEmail: 'rollback-test@test.local',
            shouldFail: true,
          },
        })
        .expect(200);

      // Verify the response indicates rollback
      expect(response.body.data.testTransactionRollback.success).toBe(false);
      expect(response.body.data.testTransactionRollback.message).toContain('rolled back');

      // Verify no new User record was created
      const userCountAfter = await prisma.user.count();
      expect(userCountAfter).toBe(userCountBefore);

      // Verify no new AuditLog record was created
      const auditCountAfter = await prisma.auditLog.count();
      expect(auditCountAfter).toBe(auditCountBefore);

      // Double-check that the test user doesn't exist
      const testUser = await prisma.user.findUnique({
        where: { email: 'rollback-test@test.local' },
      });
      expect(testUser).toBeNull();
    });

    it('should complete successfully when shouldFail is false', async () => {
      // Test the success case to ensure the test method works
      const rollbackMutation = `
        mutation TestTransactionRollback($testUserEmail: String!, $shouldFail: Boolean!) {
          testTransactionRollback(testUserEmail: $testUserEmail, shouldFail: $shouldFail) {
            success
            message
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: rollbackMutation,
          variables: {
            testUserEmail: 'success-test@test.local',
            shouldFail: false,
          },
        })
        .expect(200);

      expect(response.body.data.testTransactionRollback.success).toBe(true);
      expect(response.body.data.testTransactionRollback.message).toContain('completed successfully');

      // Verify the user was created
      const testUser = await prisma.user.findUnique({
        where: { email: 'success-test@test.local' },
      });
      expect(testUser).toBeDefined();

      // Clean up
      await prisma.user.delete({
        where: { email: 'success-test@test.local' },
      });
    });
  });

  describe('AUDIT-004: Mutation requiring reason fails if none provided', () => {
    it('should return BadRequestException when reason is missing', async () => {
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'noreason@test.local',
              password: 'password123',
              firstName: 'No',
              lastName: 'Reason',
              role: 'OPERATOR',
              // reason field intentionally omitted
            },
          },
        })
        .expect(400); // Should return 400 due to validation failure

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Field "reason" of required type "String!" was not provided');

      // Verify no user was created
      const testUser = await prisma.user.findUnique({
        where: { email: 'noreason@test.local' },
      });
      expect(testUser).toBeNull();

      // Verify no audit log was created
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          details: {
            path: ['email'],
            equals: 'noreason@test.local',
          },
        },
      });
      expect(auditLog).toBeNull();
    });

    it('should return validation error when reason is empty string', async () => {
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'emptyreason@test.local',
              password: 'password123',
              firstName: 'Empty',
              lastName: 'Reason',
              role: 'OPERATOR',
              reason: '', // Empty string should fail validation
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Reason is required for user creation (GxP compliance)');

      // Verify no user was created
      const testUser = await prisma.user.findUnique({
        where: { email: 'emptyreason@test.local' },
      });
      expect(testUser).toBeNull();
    });
  });
});