import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '../../config/config.service';
import { CacheService } from './cache.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
  ) {
    this.isEnabled = this.configService.redis.cache.enabled;
  }

  async onModuleInit(): Promise<void> {
    if (!this.isEnabled) {
      this.logger.warn('Cache is disabled, skipping cache warming');
      return;
    }

    // Warm cache on application startup with a slight delay
    setTimeout(() => {
      this.warmCriticalData();
    }, 5000); // 5 second delay to allow app to fully initialize
  }

  /**
   * Warms frequently accessed data on application startup and periodically
   */
  @Cron(CronExpression.EVERY_HOUR)
  async warmCriticalData(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    this.logger.log('Starting cache warming process');
    const startTime = Date.now();

    try {
      await Promise.all([
        this.warmProductionLines(),
        this.warmRecentProcesses(),
        this.warmActiveData(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Cache warming completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
    }
  }

  /**
   * Warm production lines cache with common query patterns
   */
  private async warmProductionLines(): Promise<void> {
    try {
      // Common production line queries
      const queries = [
        { isActive: true }, // Active production lines
        { isActive: true, limit: 20 }, // Recent active production lines
        {}, // All production lines (default query)
      ];

      for (const options of queries) {
        const cacheKey = `production-lines:${JSON.stringify(options)}`;
        
        await this.cacheService.getOrSet(
          cacheKey,
          async () => {
            const productionLines = await this.prisma.productionLine.findMany({
              where: {
                ...(options.isActive !== undefined && {
                  isActive: options.isActive,
                }),
              },
              include: {
                creator: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                  },
                },
                _count: {
                  select: {
                    processes: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: options.limit || 100,
            });

            this.logger.debug(
              `Warmed production lines cache: ${productionLines.length} items for ${JSON.stringify(options)}`,
            );
            return productionLines;
          },
          {
            ttl: 1800, // 30 minutes
            tags: ['production-line'],
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to warm production lines cache:', error);
    }
  }

  /**
   * Warm processes cache for active production lines
   */
  private async warmRecentProcesses(): Promise<void> {
    try {
      // Get active production lines first
      const activeLines = await this.prisma.productionLine.findMany({
        where: { isActive: true },
        select: { id: true },
        take: 10, // Limit to top 10 active lines
      });

      // Warm process caches for each active production line
      for (const line of activeLines) {
        const options = { productionLineId: line.id, isActive: true };
        const cacheKey = `processes:line:${line.id}:${JSON.stringify(options)}`;

        await this.cacheService.getOrSet(
          cacheKey,
          async () => {
            const processes = await this.prisma.process.findMany({
              where: {
                productionLineId: line.id,
                isActive: true,
              },
              include: {
                creator: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                  },
                },
                productionLine: {
                  select: {
                    id: true,
                    name: true,
                    status: true,
                    isActive: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 50, // Limit processes per line
            });

            this.logger.debug(
              `Warmed processes cache for line ${line.id}: ${processes.length} items`,
            );
            return processes;
          },
          {
            ttl: 1800, // 30 minutes
            tags: ['process', `processes:line:${line.id}`],
          },
        );
      }
    } catch (error) {
      this.logger.error('Failed to warm processes cache:', error);
    }
  }

  /**
   * Warm cache for most recently accessed individual items
   */
  private async warmActiveData(): Promise<void> {
    try {
      // Warm individual production line caches for recently updated ones
      const recentLines = await this.prisma.productionLine.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: 5, // Top 5 most recently updated
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          processes: {
            select: {
              id: true,
              title: true,
              status: true,
              progress: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          _count: {
            select: {
              processes: true,
            },
          },
        },
      });

      for (const line of recentLines) {
        const cacheKey = `production-line:${line.id}`;
        await this.cacheService.set(
          cacheKey,
          line,
          3600, // 1 hour
          ['production-line', `production-line:${line.id}`],
        );
      }

      // Warm individual process caches for recently updated ones
      const recentProcesses = await this.prisma.process.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
        take: 10, // Top 10 most recently updated
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          productionLine: {
            select: {
              id: true,
              name: true,
              status: true,
              isActive: true,
            },
          },
        },
      });

      for (const process of recentProcesses) {
        const cacheKey = `process:${process.id}`;
        await this.cacheService.set(
          cacheKey,
          process,
          3600, // 1 hour
          ['process', `process:${process.id}`],
        );
      }

      this.logger.debug(
        `Warmed individual item caches: ${recentLines.length} production lines, ${recentProcesses.length} processes`,
      );
    } catch (error) {
      this.logger.error('Failed to warm active data cache:', error);
    }
  }

  /**
   * Background refresh for specific cache keys before they expire
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async backgroundRefresh(): Promise<void> {
    if (!this.isEnabled) {
      return;
    }

    this.logger.debug('Starting background cache refresh');

    try {
      // Refresh most critical caches that are likely to be accessed soon
      const criticalQueries = [
        { isActive: true }, // Most common query
        { isActive: true, limit: 20 }, // Dashboard query
      ];

      for (const options of criticalQueries) {
        const cacheKey = `production-lines:${JSON.stringify(options)}`;
        
        // Force refresh by deleting and re-warming
        await this.cacheService.del(cacheKey);
        
        // Re-warm with fresh data
        await this.cacheService.getOrSet(
          cacheKey,
          async () => {
            return await this.prisma.productionLine.findMany({
              where: {
                ...(options.isActive !== undefined && {
                  isActive: options.isActive,
                }),
              },
              include: {
                creator: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                  },
                },
                _count: {
                  select: {
                    processes: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: options.limit || 100,
            });
          },
          {
            ttl: 1800,
            tags: ['production-line'],
          },
        );
      }

      this.logger.debug('Background cache refresh completed');
    } catch (error) {
      this.logger.error('Background cache refresh failed:', error);
    }
  }

  /**
   * Manually trigger cache warming (useful for testing or after deployments)
   */
  async manualWarm(): Promise<{ success: boolean; duration: number; message: string }> {
    const startTime = Date.now();
    
    try {
      await this.warmCriticalData();
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        duration,
        message: `Cache warming completed successfully in ${duration}ms`,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        success: false,
        duration,
        message: `Cache warming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}