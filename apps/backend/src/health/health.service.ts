import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicatorResult,
  HealthIndicator,
  HealthCheckError,
} from '@nestjs/terminus';
import { PrismaService } from '../database';
import { CacheService } from '../common/cache/cache.service';

@Injectable()
export class HealthService extends HealthIndicator {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    super();
  }

  /**
   * Checks the database connection health.
   * Uses PrismaService for actual connectivity testing.
   */
  async checkDatabase(): Promise<HealthIndicatorResult> {
    const key = 'database';

    try {
      const healthCheck = await this.prismaService.healthCheck();
      const isHealthy = healthCheck.status === 'healthy';

      if (isHealthy) {
        return this.getStatus(key, true, {
          responseTime: `${healthCheck.responseTime}ms`,
        });
      }

      // Database is unhealthy - let Terminus handle the proper error response
      const message = 'Database connection failed';
      this.logger.error(message, {
        status: healthCheck.status,
        responseTime: healthCheck.responseTime,
      });
      throw new HealthCheckError(
        message,
        this.getStatus(key, false, {
          status: healthCheck.status,
          responseTime: `${healthCheck.responseTime}ms`,
        }),
      );
    } catch (error) {
      // Handle unexpected errors (not from healthCheck)
      if (error instanceof HealthCheckError) {
        throw error; // Re-throw HealthCheckError as-is
      }

      const message = 'Database health check failed';
      this.logger.error(message, error instanceof Error ? error.stack : error);
      throw new HealthCheckError(
        message,
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * Checks the Redis connection health.
   * Uses CacheService for actual connectivity testing.
   */
  async checkRedis(): Promise<HealthIndicatorResult> {
    const key = 'redis';

    try {
      const healthCheck = await this.cacheService.healthCheck();
      const isHealthy = healthCheck.status === 'healthy';

      if (isHealthy) {
        return this.getStatus(key, true, {
          ...healthCheck.details,
        });
      }

      // Redis is unhealthy - let Terminus handle the proper error response
      const message = 'Redis connection failed';
      this.logger.error(message, {
        status: healthCheck.status,
        details: healthCheck.details,
      });
      throw new HealthCheckError(
        message,
        this.getStatus(key, false, {
          status: healthCheck.status,
          details: healthCheck.details,
        }),
      );
    } catch (error) {
      // Handle unexpected errors (not from healthCheck)
      if (error instanceof HealthCheckError) {
        throw error; // Re-throw HealthCheckError as-is
      }

      const message = 'Redis health check failed';
      this.logger.error(message, error instanceof Error ? error.stack : error);
      throw new HealthCheckError(
        message,
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * Gets cache metrics for monitoring.
   */
  async getCacheMetrics(): Promise<HealthIndicatorResult> {
    const key = 'cache';

    try {
      const metrics = this.cacheService.getMetrics();
      return this.getStatus(key, true, metrics);
    } catch (error) {
      const message = 'Cache metrics retrieval failed';
      this.logger.error(message, error instanceof Error ? error.stack : error);
      throw new HealthCheckError(
        message,
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
  }

  /**
   * Checks the Elasticsearch connection health.
   * TODO: Requires Elasticsearch client/service to be injected for real connection testing.
   */
  async checkElasticsearch(): Promise<HealthIndicatorResult> {
    const key = 'elasticsearch';

    // TODO: This requires an Elasticsearch client/service to be injected.
    // Example implementation:
    // try {
    //   await this.elasticsearchService.ping(); // This will throw on failure
    //   return this.getStatus(key, true);
    // } catch (error) {
    //   this.logger.error('Elasticsearch health check failed', error.stack);
    //   throw new HealthCheckError('Elasticsearch connection failed', this.getStatus(key, false, {
    //     message: error.message
    //   }));
    // }

    const message = 'Elasticsearch health check not yet implemented';
    throw new HealthCheckError(
      message,
      this.getStatus(key, false, {
        reason:
          'Implementation pending - Elasticsearch client not yet integrated',
      }),
    );
  }
}
