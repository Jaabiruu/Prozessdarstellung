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
      // Reset the test database
      await this.resetDatabase();
      
      // Clear Redis test database
      await redis.flushdb();
      
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
      
      // Close connections
      await prisma.$disconnect();
      await redis.quit();
      
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
    // Use IP address and user agent to identify test audit logs
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { ipAddress: '127.0.0.1' },
          { userAgent: 'test-agent' },
          { reason: { contains: 'test' } },
        ],
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'test',
        },
      },
    });
  }

  private static async seedTestDatabase(): Promise<void> {
    const bcrypt = await import('bcrypt');
    
    // Create test admin user
    await prisma.user.upsert({
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
    await prisma.user.upsert({
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
    await prisma.user.upsert({
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

    console.log('✅ Test database seeded with test users');
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