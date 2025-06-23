import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global Prisma Module
 *
 * This module provides the PrismaService globally across the application.
 * Following enterprise standards, database access is centralized through
 * this service to ensure:
 * - Consistent connection management
 * - Proper transaction handling
 * - Centralized logging and monitoring
 * - GxP compliance for audit trails
 *
 * Enterprise Pattern: @Global() decorator makes this service available
 * throughout the application without needing to import the module
 * in every feature module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
