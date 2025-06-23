import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TestSetup } from './setup';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

describe('User Management System (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminToken: string;
  let managerToken: string;
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
    managerToken = await getAuthToken('manager@test.local', 'manager123');
  });

  afterAll(async () => {
    await app.close();
  });

  async function getAuthToken(
    email: string,
    password: string,
  ): Promise<string> {
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

  describe('USER-001: ADMIN can create a new user', () => {
    it('should create user with audit log and no password in response', async () => {
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            firstName
            lastName
            role
            isActive
            password
          }
        }
      `;

      // Count users and audit logs before
      const userCountBefore = await prisma.user.count();
      const auditCountBefore = await prisma.auditLog.count();

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'newuser@test.local',
              password: 'securepassword123',
              firstName: 'New',
              lastName: 'User',
              role: 'OPERATOR',
              reason: 'Creating new user for testing',
            },
          },
        })
        .expect(200);

      // Verify user creation
      expect(response.body.data.createUser).toBeDefined();
      expect(response.body.data.createUser.email).toBe('newuser@test.local');
      expect(response.body.data.createUser.firstName).toBe('New');
      expect(response.body.data.createUser.lastName).toBe('User');
      expect(response.body.data.createUser.role).toBe('OPERATOR');
      expect(response.body.data.createUser.isActive).toBe(true);

      // Verify password hash is NOT in response
      expect(response.body.data.createUser.password).toBeNull();

      const userId = response.body.data.createUser.id;

      // Verify user was created in database
      const userCountAfter = await prisma.user.count();
      expect(userCountAfter).toBe(userCountBefore + 1);

      const createdUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      expect(createdUser).toBeDefined();
      expect(createdUser!.email).toBe('newuser@test.local');
      expect(createdUser!.password).toBeDefined(); // Password should exist in DB
      expect(createdUser!.password).not.toBe('securepassword123'); // Should be hashed

      // Verify audit log was created
      const auditCountAfter = await prisma.auditLog.count();
      expect(auditCountAfter).toBeGreaterThan(auditCountBefore);

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: 'User',
          entityId: userId,
          action: 'CREATE',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.userId).toBe(adminUserId);
      expect(auditLog!.reason).toBe('Creating new user for testing');

      // Verify audit details
      const details = auditLog!.details as Record<string, unknown>;
      expect(details.email).toBe('newuser@test.local');
      expect(details.role).toBe('OPERATOR');
    });
  });

  describe('USER-002: MANAGER cannot create a new user', () => {
    it('should return ForbiddenException for MANAGER role', async () => {
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
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'manager-forbidden@test.local',
              password: 'password123',
              firstName: 'Manager',
              lastName: 'Forbidden',
              role: 'OPERATOR',
              reason: 'Should be forbidden',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
      expect(response.body.data.createUser).toBeNull();

      // Verify no user was created
      const testUser = await prisma.user.findUnique({
        where: { email: 'manager-forbidden@test.local' },
      });
      expect(testUser).toBeNull();
    });
  });

  describe('USER-003: Cannot create user with pre-existing email', () => {
    it('should return ConflictException for duplicate email', async () => {
      // First, create a user
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'existing@test.local',
              password: 'password123',
              firstName: 'Existing',
              lastName: 'User',
              role: 'OPERATOR',
              reason: 'Creating existing user',
            },
          },
        });

      // Try to create another user with the same email
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'existing@test.local', // Same email
              password: 'differentpassword',
              firstName: 'Duplicate',
              lastName: 'User',
              role: 'MANAGER',
              reason: 'Should fail due to duplicate email',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('CONFLICT');
      expect(response.body.errors[0].message).toContain(
        'User with this email already exists',
      );
      expect(response.body.data.createUser).toBeNull();
    });
  });

  describe('USER-004: GxP Deactivation & Anonymization Test', () => {
    it('should deactivate user and anonymize PII data', async () => {
      // First create a user with PII
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            firstName
            lastName
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
              email: 'pii-test@pharma.local',
              password: 'password123',
              firstName: 'PII',
              lastName: 'TestUser',
              role: 'OPERATOR',
              reason: 'Creating user for PII anonymization test',
            },
          },
        });

      const userId = createResponse.body.data.createUser.id;
      const originalEmail = createResponse.body.data.createUser.email;
      const originalFirstName = createResponse.body.data.createUser.firstName;
      const originalLastName = createResponse.body.data.createUser.lastName;

      // Verify original user can log in
      const loginToken = await getAuthToken(
        'pii-test@pharma.local',
        'password123',
      );
      expect(loginToken).toBeDefined();

      // Now deactivate and anonymize the user
      const deactivateUserMutation = `
        mutation DeactivateUser($id: String!, $reason: String!) {
          deactivateUser(id: $id, reason: $reason) {
            id
            email
            firstName
            lastName
            isActive
          }
        }
      `;

      const deactivateResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: deactivateUserMutation,
          variables: {
            id: userId,
            reason: 'Testing PII anonymization compliance',
          },
        })
        .expect(200);

      const deactivatedUser = deactivateResponse.body.data.deactivateUser;

      // Verify deactivation and anonymization
      expect(deactivatedUser.isActive).toBe(false);
      expect(deactivatedUser.id).toBe(userId); // ID should remain unchanged

      // Verify PII fields are anonymized
      expect(deactivatedUser.email).not.toBe(originalEmail);
      expect(deactivatedUser.firstName).not.toBe(originalFirstName);
      expect(deactivatedUser.lastName).not.toBe(originalLastName);

      // Verify anonymized values follow expected pattern
      expect(deactivatedUser.email).toMatch(/anonymized_.*@deleted\.local/);
      expect(deactivatedUser.firstName).toMatch(/DELETED_USER_.*/);
      expect(deactivatedUser.lastName).toBe('ANONYMIZED');

      // Verify audit log was created with PII anonymization details
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: 'User',
          entityId: userId,
          action: 'DELETE', // Deactivation uses DELETE action
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.reason).toBe('Testing PII anonymization compliance');

      const details = auditLog!.details as Record<string, unknown>;
      expect(details.action).toBe('deactivation_with_pii_anonymization');
      expect(details.originalEmail).toBe(originalEmail);
      expect(details.originalFirstName).toBe(originalFirstName);
      expect(details.originalLastName).toBe(originalLastName);

      // Verify login with original credentials now fails
      const failedLoginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
          }
        }
      `;

      const loginResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: failedLoginMutation,
          variables: {
            input: {
              email: 'pii-test@pharma.local',
              password: 'password123',
            },
          },
        })
        .expect(200);

      expect(loginResponse.body.errors).toBeDefined();
      expect(loginResponse.body.errors[0].message).toContain(
        'Invalid credentials',
      );
      expect(loginResponse.body.data.login).toBeNull();
    });
  });

  describe('Atomicity & Race Condition Tests', () => {
    it('should prevent race conditions during concurrent user creates (ATOM-003)', async () => {
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;

      const input = {
        email: 'race-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Race',
        lastName: 'Test',
        role: 'OPERATOR',
        reason: 'Race condition test',
      };

      // Execute two identical mutations concurrently
      const [result1, result2] = await Promise.allSettled([
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            query: createUserMutation,
            variables: { input },
          }),
        request(app.getHttpServer())
          .post('/graphql')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            query: createUserMutation,
            variables: { input },
          }),
      ]);

      // One should succeed, one should fail
      const responses = [result1, result2];
      const successCount = responses.filter(
        r => r.status === 'fulfilled' && r.value.status === 200 && !r.value.body.errors,
      ).length;
      const errorCount = responses.filter(
        r =>
          (r.status === 'fulfilled' && (r.value.status !== 200 || r.value.body.errors)) ||
          r.status === 'rejected',
      ).length;

      expect(successCount).toBe(1);
      expect(errorCount).toBe(1);

      // Verify only one record exists
      const records = await prisma.user.findMany({
        where: { email: 'race-test@example.com' },
      });
      expect(records).toHaveLength(1);
    });

    it('should handle P2002 errors correctly for email uniqueness (ATOM-005)', async () => {
      // First create a user
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'p2002-test@example.com',
              password: 'password123',
              firstName: 'P2002',
              lastName: 'Test',
              role: 'OPERATOR',
              reason: 'First user for P2002 test',
            },
          },
        });

      // Try to create another user with the same email
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'p2002-test@example.com', // Duplicate email
              password: 'differentpassword',
              firstName: 'Duplicate',
              lastName: 'User',
              role: 'MANAGER',
              reason: 'Should fail due to duplicate email',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('CONFLICT');
      expect(response.body.errors[0].message).toContain('already exists');
      expect(response.body.data.createUser).toBeNull();
    });

    it('should maintain transaction integrity during user operations', async () => {
      const initialCount = await prisma.user.count();
      const initialAuditCount = await prisma.auditLog.count();

      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            firstName
            lastName
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
              email: 'transaction-integrity@example.com',
              password: 'TestPassword123!',
              firstName: 'Transaction',
              lastName: 'Integrity',
              role: 'OPERATOR',
              reason: 'Testing transaction integrity',
            },
          },
        })
        .expect(200);

      const userId = response.body.data.createUser.id;

      // Verify both user and audit log were created atomically
      const finalCount = await prisma.user.count();
      const finalAuditCount = await prisma.auditLog.count();

      expect(finalCount).toBe(initialCount + 1);
      expect(finalAuditCount).toBeGreaterThan(initialAuditCount);

      // Verify audit log details
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: 'User',
          entityId: userId,
          action: 'CREATE',
        },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.reason).toBe('Testing transaction integrity');
    });
  });
});
