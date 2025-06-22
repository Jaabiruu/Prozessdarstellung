import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
export declare class TestSetup {
    static beforeAll(): Promise<void>;
    static afterAll(): Promise<void>;
    static beforeEach(): Promise<void>;
    static afterEach(): Promise<void>;
    private static resetDatabase;
    private static cleanupDatabase;
    private static cleanupTestData;
    private static seedTestDatabase;
    static getPrisma(): PrismaClient;
    static getRedis(): Redis;
}
