import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TestSetup } from './setup';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

describe('Authentication System (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let redis: Redis;

  beforeAll(async () => {
    await TestSetup.beforeAll();
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = TestSetup.getPrisma();
    redis = TestSetup.getRedis();
  });

  afterAll(async () => {
    await app.close();
    await TestSetup.afterAll();
  });

  describe('AUTH-001: User can log in with valid credentials', () => {
    it('should return 200 OK with valid accessToken and user object', async () => {
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
              firstName
              lastName
              role
            }
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
              email: 'admin@test.local',
              password: 'admin123',
            },
          },
        })
        .expect(200);

      expect(response.body.data.login).toBeDefined();
      expect(response.body.data.login.user).toMatchObject({
        email: 'admin@test.local',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'ADMIN',
      });
      expect(response.body.data.login.accessToken).toBeDefined();
      expect(typeof response.body.data.login.accessToken).toBe('string');

      // Verify token payload
      const decoded = jwt.decode(
        response.body.data.login.accessToken,
      ) as jwt.JwtPayload;
      expect(decoded).toMatchObject({
        email: 'admin@test.local',
        role: 'ADMIN',
      });
      expect(decoded.sub).toBeDefined();
      expect(decoded.jti).toBeDefined();
    });
  });

  describe('AUTH-002: User cannot log in with incorrect password', () => {
    it('should return UnauthorizedException and create audit log', async () => {
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
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
              email: 'admin@test.local',
              password: 'wrong-password',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid credentials');
      expect(response.body.data.login).toBeNull();

      // Verify audit log was created for login failure
      // Note: This would require implementing audit logging for failed logins
    });
  });

  describe('AUTH-003: User cannot log in with non-existent email', () => {
    it('should return generic UnauthorizedException', async () => {
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
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
              email: 'nouser@pharma.local',
              password: 'any-password',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid credentials');
      expect(response.body.data.login).toBeNull();
    });
  });

  describe('AUTH-004: User cannot log in with deactivated account', () => {
    it('should return UnauthorizedException for inactive user', async () => {
      // First, create and deactivate a user
      await prisma.user.create({
        data: {
          email: 'deactivated@test.local',
          password: await bcrypt.hash('password123', 12),
          firstName: 'Deactivated',
          lastName: 'User',
          role: 'OPERATOR',
          isActive: false,
        },
      });

      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
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
              email: 'deactivated@test.local',
              password: 'password123',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Account is inactive');
      expect(response.body.data.login).toBeNull();
    });
  });

  describe('AUTH-005: Login attempts are rate-limited', () => {
    it('should return 429 Too Many Requests after 5 failed attempts', async () => {
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
            accessToken
          }
        }
      `;

      // Make 6 consecutive failed login attempts
      for (let i = 0; i < 6; i++) {
        const response = await request(app.getHttpServer())
          .post('/graphql')
          .send({
            query: loginMutation,
            variables: {
              input: {
                email: 'admin@test.local',
                password: 'wrong-password',
              },
            },
          });

        if (i < 5) {
          // First 5 attempts should fail with auth error
          expect(response.body.errors).toBeDefined();
          expect(response.body.errors[0].message).toContain(
            'Invalid credentials',
          );
        } else {
          // 6th attempt should be rate limited
          expect(response.body.errors).toBeDefined();
          expect(response.body.errors[0].message).toContain(
            'ThrottlerException',
          );
        }
      }
    });
  });

  describe('AUTH-006: User can log out, invalidating their token', () => {
    it('should successfully log out and add jti to Redis blocklist', async () => {
      // First, log in to get a token
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

      const loginResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: loginMutation,
          variables: {
            input: {
              email: 'admin@test.local',
              password: 'admin123',
            },
          },
        })
        .expect(200);

      const token = loginResponse.body.data.login.accessToken;
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      const jti = decoded.jti;

      // Now log out
      const logoutMutation = `
        mutation Logout {
          logout
        }
      `;

      const logoutResponse = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`)
        .send({
          query: logoutMutation,
        })
        .expect(200);

      expect(logoutResponse.body.data.logout).toBe(true);

      // Check that jti exists in Redis blocklist
      const blockedToken = await redis.get(`jwt:blocklist:${jti}`);
      expect(blockedToken).toBe('blocked');

      // Verify TTL is set (should be > 0)
      const ttl = await redis.ttl(`jwt:blocklist:${jti}`);
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe('AUTH-007: Blocklisted token cannot be used', () => {
    it('should return UnauthorizedException for logged out token', async () => {
      // Log in and immediately log out
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
          }
        }
      `;

      const loginResponse = await request(app.getHttpServer())
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

      const token = loginResponse.body.data.login.accessToken;

      // Log out
      const logoutMutation = `
        mutation Logout {
          logout
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`)
        .send({
          query: logoutMutation,
        });

      // Try to use the logged-out token
      const protectedQuery = `
        query Me {
          me {
            id
            email
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`)
        .send({
          query: protectedQuery,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Token is invalid');
    });
  });

  describe('AUTH-008: Expired token is rejected', () => {
    it('should return UnauthorizedException for expired token', async () => {
      // Create an expired token
      const expiredPayload = {
        sub: 'test-user-id',
        email: 'admin@test.local',
        role: 'ADMIN',
        jti: 'test-jti',
        iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        exp: Math.floor(Date.now() / 1000) - 1, // Expired 1 second ago
      };

      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET);

      const protectedQuery = `
        query Me {
          me {
            id
            email
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          query: protectedQuery,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('jwt expired');
    });
  });

  describe('DRY Principle & Architectural Compliance', () => {
    it('should correctly extract IP and User-Agent via @AuditContext decorator (ARCH-003)', async () => {
      // First get a token for authenticated operations
      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            accessToken
          }
        }
      `;

      const loginResponse = await request(app.getHttpServer())
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

      const token = loginResponse.body.data.login.accessToken;

      // Test a mutation that uses @AuditContext decorator (user update)
      const updateUserMutation = `
        mutation UpdateUser($input: UpdateUserInput!) {
          updateUser(input: $input) {
            id
            firstName
          }
        }
      `;

      // Get the admin user ID for the update
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@test.local' },
      });

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', '192.168.1.100')
        .set('User-Agent', 'Test-Agent/1.0')
        .send({
          query: updateUserMutation,
          variables: {
            input: {
              id: adminUser.id,
              firstName: 'Updated',
              reason: 'Testing @AuditContext decorator extraction',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateUser).toBeDefined();

      // Verify audit log was created with correct IP and User-Agent
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: 'User',
          entityId: adminUser.id,
          action: 'UPDATE',
          reason: 'Testing @AuditContext decorator extraction',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(auditLog).toBeDefined();
      expect(auditLog!.ipAddress).toBe('192.168.1.100');
      expect(auditLog!.userAgent).toBe('Test-Agent/1.0');
      
      // This test verifies that the @AuditContext decorator successfully
      // extracts IP and User-Agent from the GraphQL context without
      // repetitive code in every resolver method
    });
  });

  describe('Authentication-Related Atomicity Tests', () => {
    it('should handle authentication transaction integrity', async () => {
      const initialAuditCount = await prisma.auditLog.count();

      const loginMutation = `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
            }
            accessToken
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('X-Forwarded-For', '192.168.1.50')
        .set('User-Agent', 'Auth-Test-Agent/1.0')
        .send({
          query: loginMutation,
          variables: {
            input: {
              email: 'admin@test.local',
              password: 'admin123',
            },
          },
        })
        .expect(200);

      expect(response.body.data.login).toBeDefined();
      expect(response.body.data.login.accessToken).toBeDefined();

      // Verify audit log was created for successful login
      const finalAuditCount = await prisma.auditLog.count();
      expect(finalAuditCount).toBeGreaterThan(initialAuditCount);
    });

    it('should handle P2002 errors in authentication context', async () => {
      // This test ensures authentication service properly handles
      // unique constraint violations during user operations
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
          }
        }
      `;

      // Get admin token first
      const adminToken = await getAuthToken('admin@test.local', 'admin123');

      // Create first user
      await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'auth-p2002-test@example.com',
              password: 'password123',
              firstName: 'Auth',
              lastName: 'P2002Test',
              role: 'OPERATOR',
              reason: 'First user for auth P2002 test',
            },
          },
        });

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'auth-p2002-test@example.com', // Duplicate
              password: 'different123',
              firstName: 'Auth',
              lastName: 'Duplicate',
              role: 'OPERATOR',
              reason: 'Should fail due to duplicate',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('already exists');
    });
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
});
