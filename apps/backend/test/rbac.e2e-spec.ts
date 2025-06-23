import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { TestSetup } from './setup';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

describe('Authorization System (RBAC) (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
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

    // Get authentication tokens and user IDs for different roles
    await getAuthTokensAndUserIds();
  });

  afterAll(async () => {
    await app.close();
    await TestSetup.afterAll();
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

  describe('RBAC-001: ADMIN user can access admin-only endpoint', () => {
    it('should allow ADMIN to create a user', async () => {
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            role
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
              email: 'newuser@test.local',
              password: 'password123',
              firstName: 'New',
              lastName: 'User',
              role: 'OPERATOR',
              reason: 'Creating test user for RBAC testing',
            },
          },
        })
        .expect(200);

      expect(response.body.data.createUser).toBeDefined();
      expect(response.body.data.createUser.email).toBe('newuser@test.local');
      expect(response.body.data.createUser.role).toBe('OPERATOR');
    });
  });

  describe('RBAC-002: OPERATOR user is denied access to admin-only endpoint', () => {
    it('should return ForbiddenException for OPERATOR trying to create user', async () => {
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            role
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          query: createUserMutation,
          variables: {
            input: {
              email: 'forbidden@test.local',
              password: 'password123',
              firstName: 'Forbidden',
              lastName: 'User',
              role: 'OPERATOR',
              reason: 'Should be forbidden',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
      expect(response.body.data.createUser).toBeNull();
    });
  });

  describe('RBAC-003: MANAGER is denied access to admin-only endpoint', () => {
    it('should return ForbiddenException for MANAGER trying to create user', async () => {
      const createUserMutation = `
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            role
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
              reason: 'Should be forbidden for manager',
            },
          },
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
      expect(response.body.data.createUser).toBeNull();
    });
  });

  describe('RBAC-004: Unauthenticated user is denied access to protected endpoint', () => {
    it('should return UnauthorizedException without Authorization header', async () => {
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
        .send({
          query: protectedQuery,
        })
        .expect(200);

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
      expect(response.body.data.me).toBeNull();
    });
  });

  describe('RBAC-005: Endpoint with no @Roles decorator accessible by any authenticated user', () => {
    it('should allow OPERATOR to access me query (no specific role requirement)', async () => {
      const meQuery = `
        query Me {
          me {
            id
            email
            role
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({
          query: meQuery,
        })
        .expect(200);

      expect(response.body.data.me).toBeDefined();
      expect(response.body.data.me.email).toBe('operator@test.local');
      expect(response.body.data.me.role).toBe('OPERATOR');
      expect(response.body.errors).toBeUndefined();
    });

    it('should allow MANAGER to access me query', async () => {
      const meQuery = `
        query Me {
          me {
            id
            email
            role
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          query: meQuery,
        })
        .expect(200);

      expect(response.body.data.me).toBeDefined();
      expect(response.body.data.me.email).toBe('manager@test.local');
      expect(response.body.data.me.role).toBe('MANAGER');
      expect(response.body.errors).toBeUndefined();
    });

    it('should allow ADMIN to access me query', async () => {
      const meQuery = `
        query Me {
          me {
            id
            email
            role
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          query: meQuery,
        })
        .expect(200);

      expect(response.body.data.me).toBeDefined();
      expect(response.body.data.me.email).toBe('admin@test.local');
      expect(response.body.data.me.role).toBe('ADMIN');
      expect(response.body.errors).toBeUndefined();
    });
  });
});
