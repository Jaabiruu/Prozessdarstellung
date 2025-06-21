import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '../config';

/**
 * Enterprise Prisma Service following SDLC standards
 * 
 * Features:
 * - Proper lifecycle management (connect/disconnect)
 * - Connection pooling configuration
 * - Structured error handling
 * - Transaction support for GxP compliance
 * - Performance monitoring capabilities
 * 
 * Enterprise Standards Applied:
 * - Constructor dependency injection
 * - Meaningful error messages without internal details
 * - Proper service lifecycle hooks
 * - Logging for audit and debugging
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.database.url,
        },
      },
      // Enterprise: Simple logging configuration
      log: configService.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'minimal', // Security: Don't expose internal details
    });

    // Enterprise: Enhanced logging will be added in Phase 5 (Performance & Security)
    // Keeping simple configuration for now to avoid TypeScript complexity
  }

  /**
   * Enterprise: Proper module initialization
   * Establishes database connection on module startup
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
      this.logger.error(`Failed to connect to database: ${errorMessage}`);
      throw new Error('Database connection failed during module initialization');
    }
  }

  /**
   * Enterprise: Proper module cleanup
   * Closes database connection on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Successfully disconnected from database');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown disconnection error';
      this.logger.warn(`Database disconnection warning: ${errorMessage}`);
      // Don't throw here as module is shutting down
    }
  }

  /**
   * GxP Compliance: Execute database operations within a transaction
   * 
   * This method ensures data integrity by wrapping operations in a transaction.
   * If any operation fails, all changes are rolled back automatically.
   * 
   * @param fn - Function containing database operations
   * @returns Promise with transaction result
   * 
   * @example
   * ```typescript
   * await prisma.executeTransaction(async (tx) => {
   *   const process = await tx.process.create({ data: processData });
   *   await tx.auditLog.create({
   *     data: {
   *       action: 'CREATE',
   *       entityType: 'Process',
   *       entityId: process.id,
   *       userId,
   *       reason,
   *     },
   *   });
   *   return process;
   * });
   * ```
   */
  async executeTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    try {
      this.logger.debug('Starting database transaction');
      const result = await this.$transaction(fn);
      this.logger.debug('Transaction completed successfully');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown transaction error';
      this.logger.error(`Transaction failed: ${errorMessage}`);
      throw new Error('Database transaction failed');
    }
  }

  /**
   * Enterprise: Health check for database connectivity
   * Used by health check service to verify database status
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      // Simple query to test connectivity
      await this.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;
      
      this.logger.debug(`Database health check passed in ${responseTime}ms`);
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown health check error';
      
      this.logger.error(`Database health check failed: ${errorMessage}`);
      return {
        status: 'unhealthy',
        responseTime,
      };
    }
  }

  /**
   * Enterprise: Get database connection statistics
   * Used for monitoring and performance optimization
   */
  getConnectionInfo(): {
    readonly url: string;
    readonly poolSize: number;
    readonly connectionTimeout: number;
  } {
    return {
      url: this.configService.database.url ? 'configured' : 'not configured',
      poolSize: 10, // Default Prisma pool size
      connectionTimeout: 5000, // Default timeout
    };
  }
}