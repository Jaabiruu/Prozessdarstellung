import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../config';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    executeTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        responseTime: number;
    }>;
    getConnectionInfo(): {
        readonly url: string;
        readonly poolSize: number;
        readonly connectionTimeout: number;
    };
}
