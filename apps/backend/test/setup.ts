import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

const prisma = new PrismaClient();
const redis = new Redis(process.env['REDIS_URL'] || 'redis://localhost:6379/1');

export class TestSetup {
  static async beforeAll(): Promise<void> {
    try {
      // Clear Redis test database
      await redis.flushdb();

      // Always ensure test users exist (upsert handles duplicates safely)
      await this.seedTestDatabase();

      console.log('✅ Test environment setup completed');
    } catch (error) {
      console.error('❌ Test setup failed:', error);
      throw error;
    }
  }

  static async afterAll(): Promise<void> {
    try {
      // Clean up test data
      await this.cleanupDatabase();

      // Close connections safely
      await prisma.$disconnect();

      // Only quit Redis if connection is still open
      if (redis.status === 'ready' || redis.status === 'connect') {
        await redis.quit();
      }

      console.log('✅ Test environment cleanup completed');
    } catch (error) {
      console.error('❌ Test cleanup failed:', error);
    }
  }

  static async beforeEach(): Promise<void> {
    // Clear Redis before each test
    await redis.flushdb();
  }

  static async afterEach(): Promise<void> {
    // Clean up test data after each test
    await this.cleanupTestData();
  }

  private static async resetDatabase(): Promise<void> {
    // Apply migrations to test database
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    // Generate Prisma client
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Seed test database with minimal data
    await this.seedTestDatabase();
  }

  private static async cleanupDatabase(): Promise<void> {
    // Clean up all test data
    const tableNames = [
      'audit_logs',
      'process_versions',
      'production_line_versions',
      'processes',
      'production_lines',
      'users',
    ];

    for (const tableName of tableNames) {
      await prisma.$executeRawUnsafe(`DELETE FROM "${tableName}";`);
    }
  }

  private static async cleanupTestData(): Promise<void> {
    // Remove only test data (keep seed data)
    // Delete in proper order to respect foreign key constraints

    // First, delete processes (they reference production lines)
    await prisma.process.deleteMany({
      where: {
        title: {
          contains: 'test-',
        },
      },
    });

    // Then delete production lines (they reference users via createdBy)
    await prisma.productionLine.deleteMany({
      where: {
        name: {
          contains: 'test-',
        },
      },
    });

    // Then delete audit logs that reference test users
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { ipAddress: '127.0.0.1' },
          { ipAddress: '::ffff:127.0.0.1' },
          { userAgent: 'test-agent' },
          { userAgent: 'Test-Agent/1.0' },
          { reason: { contains: 'test' } },
        ],
      },
    });

    // Finally delete test users (but NOT the seeded users)
    await prisma.user.deleteMany({
      where: {
        AND: [
          {
            email: {
              contains: 'test',
            },
          },
          {
            email: {
              not: {
                in: [
                  'admin@test.local',
                  'manager@test.local',
                  'operator@test.local',
                ],
              },
            },
          },
        ],
      },
    });
  }

  private static async seedTestDatabase(): Promise<void> {
    const bcrypt = await import('bcrypt');

    try {
      // Use transaction to ensure atomicity and handle race conditions
      await prisma.$transaction(async tx => {
        // Create test admin user
        await tx.user.upsert({
          where: { email: 'admin@test.local' },
          update: {},
          create: {
            email: 'admin@test.local',
            password: await bcrypt.hash('admin123', 12),
            firstName: 'Test',
            lastName: 'Admin',
            role: 'ADMIN',
            isActive: true,
          },
        });

        // Create test manager user
        await tx.user.upsert({
          where: { email: 'manager@test.local' },
          update: {},
          create: {
            email: 'manager@test.local',
            password: await bcrypt.hash('manager123', 12),
            firstName: 'Test',
            lastName: 'Manager',
            role: 'MANAGER',
            isActive: true,
          },
        });

        // Create test operator user
        await tx.user.upsert({
          where: { email: 'operator@test.local' },
          update: {},
          create: {
            email: 'operator@test.local',
            password: await bcrypt.hash('operator123', 12),
            firstName: 'Test',
            lastName: 'Operator',
            role: 'OPERATOR',
            isActive: true,
          },
        });

        // Create inactive user for testing deactivated account
        await tx.user.upsert({
          where: { email: 'deactivated@test.local' },
          update: {},
          create: {
            email: 'deactivated@test.local',
            password: await bcrypt.hash('deactivated123', 12),
            firstName: 'Test',
            lastName: 'Deactivated',
            role: 'OPERATOR',
            isActive: false,
          },
        });
      });

      console.log('✅ Test database seeded with test users');
    } catch (error) {
      // Ignore duplicate key errors - users already exist
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint')
      ) {
        console.log('✅ Test users already exist, skipping seed');
      } else {
        throw error;
      }
    }
  }

  static getPrisma(): PrismaClient {
    return prisma;
  }

  static getRedis(): Redis {
    return redis;
  }
}

// Global test setup hooks
beforeAll(async () => {
  await TestSetup.beforeAll();
});

afterAll(async () => {
  await TestSetup.afterAll();
});

beforeEach(async () => {
  await TestSetup.beforeEach();
});

afterEach(async () => {
  await TestSetup.afterEach();
});
