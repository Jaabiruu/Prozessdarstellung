import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { CacheService } from './cache.service';
import { PrismaService } from '../../database/prisma.service';
export declare class CacheWarmingService implements OnModuleInit {
    private readonly configService;
    private readonly cacheService;
    private readonly prisma;
    private readonly logger;
    private readonly isEnabled;
    constructor(configService: ConfigService, cacheService: CacheService, prisma: PrismaService);
    onModuleInit(): Promise<void>;
    warmCriticalData(): Promise<void>;
    private warmProductionLines;
    private warmRecentProcesses;
    private warmActiveData;
    backgroundRefresh(): Promise<void>;
    manualWarm(): Promise<{
        success: boolean;
        duration: number;
        message: string;
    }>;
}
