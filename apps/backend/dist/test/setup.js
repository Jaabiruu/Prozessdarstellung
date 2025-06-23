"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestSetup = void 0;
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const ioredis_1 = __importDefault(require("ioredis"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env.test' });
const prisma = new client_1.PrismaClient();
const redis = new ioredis_1.default(process.env['REDIS_URL'] || 'redis://localhost:6379/1');
class TestSetup {
    static async beforeAll() {
        try {
            await redis.flushdb();
            await this.seedTestDatabase();
            console.log('✅ Test environment setup completed');
        }
        catch (error) {
            console.error('❌ Test setup failed:', error);
            throw error;
        }
    }
    static async afterAll() {
        try {
            await this.cleanupDatabase();
            await prisma.$disconnect();
            if (redis.status === 'ready' || redis.status === 'connect') {
                await redis.quit();
            }
            console.log('✅ Test environment cleanup completed');
        }
        catch (error) {
            console.error('❌ Test cleanup failed:', error);
        }
    }
    static async beforeEach() {
        await redis.flushdb();
    }
    static async afterEach() {
        await this.cleanupTestData();
    }
    static async resetDatabase() {
        (0, child_process_1.execSync)('npx prisma migrate deploy', { stdio: 'inherit' });
        (0, child_process_1.execSync)('npx prisma generate', { stdio: 'inherit' });
        await this.seedTestDatabase();
    }
    static async cleanupDatabase() {
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
    static async cleanupTestData() {
        await prisma.process.deleteMany({
            where: {
                title: {
                    contains: 'test-',
                },
            },
        });
        await prisma.productionLine.deleteMany({
            where: {
                name: {
                    contains: 'test-',
                },
            },
        });
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
    static async seedTestDatabase() {
        const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
        try {
            await prisma.$transaction(async (tx) => {
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
        }
        catch (error) {
            if (error instanceof Error &&
                error.message.includes('Unique constraint')) {
                console.log('✅ Test users already exist, skipping seed');
            }
            else {
                throw error;
            }
        }
    }
    static getPrisma() {
        return prisma;
    }
    static getRedis() {
        return redis;
    }
}
exports.TestSetup = TestSetup;
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
//# sourceMappingURL=setup.js.map