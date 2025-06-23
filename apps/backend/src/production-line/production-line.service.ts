import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductionLineInput } from './dto/create-production-line.input';
import { UpdateProductionLineInput } from './dto/update-production-line.input';
import { ProductionLine, ProductionLineStatus, Prisma } from '@prisma/client';
import { AuditAction } from '../common/enums/user-role.enum';

@Injectable()
export class ProductionLineService {
  private readonly logger = new Logger(ProductionLineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createProductionLineInput: CreateProductionLineInput,
    currentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ProductionLine> {
    try {
      return await this.prisma.$transaction(async tx => {
        const productionLine = await tx.productionLine.create({
          data: {
            name: createProductionLineInput.name,
            status:
              createProductionLineInput.status || ProductionLineStatus.ACTIVE,
            createdBy: currentUserId,
            reason:
              createProductionLineInput.reason || 'Production line created',
          },
        });

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.CREATE,
            entityType: 'ProductionLine',
            entityId: productionLine.id,
            reason:
              createProductionLineInput.reason || 'Production line created',
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            details: {
              name: productionLine.name,
              status: productionLine.status,
              version: productionLine.version,
            },
          },
          tx,
        );

        this.logger.log('Production line created successfully', {
          productionLineId: productionLine.id,
          name: productionLine.name,
          status: productionLine.status,
          createdBy: currentUserId,
        });

        return productionLine;
      });
    } catch (error) {
      // Handle Prisma unique constraint violation (P2002)
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(
          'Production line with this name already exists',
        );
      }

      this.logger.error('Failed to create production line', {
        name: createProductionLineInput.name,
        status: createProductionLineInput.status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    isActive?: boolean;
    status?: ProductionLineStatus;
  }): Promise<ProductionLine[]> {
    try {
      const productionLines = await this.prisma.productionLine.findMany({
        where: {
          ...(options?.isActive !== undefined && {
            isActive: options.isActive,
          }),
          ...(options?.status && { status: options.status }),
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
        take: options?.limit || 100,
        skip: options?.offset || 0,
      });

      return productionLines;
    } catch (error) {
      this.logger.error('Failed to fetch production lines', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findOne(id: string): Promise<ProductionLine> {
    try {
      const productionLine = await this.prisma.productionLine.findUnique({
        where: { id },
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

      if (!productionLine) {
        throw new NotFoundException(`Production line with ID ${id} not found`);
      }

      return productionLine;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Failed to fetch production line', {
        productionLineId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async update(
    updateProductionLineInput: UpdateProductionLineInput,
    currentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ProductionLine> {
    try {
      return await this.prisma.$transaction(async tx => {
        // Fetch existing production line within transaction to get "before" state for audit
        const existingProductionLine = await tx.productionLine.findUnique({
          where: { id: updateProductionLineInput.id },
        });

        if (!existingProductionLine) {
          throw new NotFoundException(
            `Production line with ID ${updateProductionLineInput.id} not found`,
          );
        }

        const updateData: Prisma.ProductionLineUpdateInput = {};

        if (updateProductionLineInput.name !== undefined) {
          updateData.name = updateProductionLineInput.name;
        }
        if (updateProductionLineInput.status !== undefined) {
          updateData.status = updateProductionLineInput.status;
        }

        // No version increment needed for display-only app

        const productionLine = await tx.productionLine.update({
          where: { id: updateProductionLineInput.id },
          data: updateData,
        });

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.UPDATE,
            entityType: 'ProductionLine',
            entityId: productionLine.id,
            reason:
              updateProductionLineInput.reason || 'Production line updated',
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            details: {
              changes: updateData,
              previousValues: {
                name: existingProductionLine.name,
                status: existingProductionLine.status,
              },
            },
          },
          tx,
        );

        this.logger.log('Production line updated successfully', {
          productionLineId: productionLine.id,
          updatedBy: currentUserId,
          changes: Object.keys(updateData),
        });

        return productionLine;
      });
    } catch (error) {
      // Handle Prisma unique constraint violation (P2002)
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(
          'Production line with this name already exists',
        );
      }

      this.logger.error('Failed to update production line', {
        productionLineId: updateProductionLineInput.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async remove(
    id: string,
    reason: string,
    currentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ProductionLine> {
    try {
      return await this.prisma.$transaction(async tx => {
        // Fetch existing production line within transaction to get "before" state for audit
        const existingProductionLine = await tx.productionLine.findUnique({
          where: { id },
        });

        if (!existingProductionLine) {
          throw new NotFoundException(
            `Production line with ID ${id} not found`,
          );
        }

        if (!existingProductionLine.isActive) {
          throw new ConflictException('Production line is already deactivated');
        }

        // Check if production line has active processes within transaction
        const activeProcesses = await tx.process.count({
          where: {
            productionLineId: id,
            isActive: true,
            status: { not: 'COMPLETED' },
          },
        });

        if (activeProcesses > 0) {
          throw new ConflictException(
            `Cannot deactivate production line with ${activeProcesses} active processes. Please complete or cancel all processes first.`,
          );
        }

        const productionLine = await tx.productionLine.update({
          where: { id },
          data: {
            isActive: false,
          },
        });

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.DELETE,
            entityType: 'ProductionLine',
            entityId: productionLine.id,
            reason,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            details: {
              action: 'deactivation',
              previouslyActive: existingProductionLine.isActive,
              name: existingProductionLine.name,
              status: existingProductionLine.status,
              processCount: activeProcesses,
            },
          },
          tx,
        );

        this.logger.log('Production line deactivated successfully', {
          productionLineId: productionLine.id,
          deactivatedBy: currentUserId,
        });

        return productionLine;
      });
    } catch (error) {
      this.logger.error('Failed to deactivate production line', {
        productionLineId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
