import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProcessInput } from './dto/create-process.input';
import { UpdateProcessInput } from './dto/update-process.input';
import { Process, ProcessStatus, Prisma } from '@prisma/client';
import { AuditAction } from '../common/enums/user-role.enum';

@Injectable()
export class ProcessService {
  private readonly logger = new Logger(ProcessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    createProcessInput: CreateProcessInput,
    currentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Process> {
    try {
      return await this.prisma.$transaction(async tx => {
        // Verify production line exists and is active within transaction
        const productionLine = await tx.productionLine.findUnique({
          where: { id: createProcessInput.productionLineId },
        });

        if (!productionLine) {
          throw new NotFoundException(
            `Production line with ID ${createProcessInput.productionLineId} not found`,
          );
        }

        if (!productionLine.isActive) {
          throw new BadRequestException(
            'Cannot create process on inactive production line',
          );
        }

        const process = await tx.process.create({
          data: {
            title: createProcessInput.title,
            description: createProcessInput.description || null,
            duration: createProcessInput.duration || null,
            progress: createProcessInput.progress || 0.0,
            status: createProcessInput.status || ProcessStatus.PENDING,
            x: createProcessInput.x || 0.0,
            y: createProcessInput.y || 0.0,
            color: createProcessInput.color || '#4F46E5',
            productionLineId: createProcessInput.productionLineId,
            createdBy: currentUserId,
            reason: createProcessInput.reason || 'Process created',
          },
        });

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.CREATE,
            entityType: 'Process',
            entityId: process.id,
            reason: createProcessInput.reason || 'Process created',
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            details: {
              title: process.title,
              description: process.description,
              duration: process.duration,
              status: process.status,
              progress: process.progress,
              productionLineId: process.productionLineId,
              version: process.version,
            },
          },
          tx,
        );

        this.logger.log('Process created successfully', {
          processId: process.id,
          title: process.title,
          status: process.status,
          productionLineId: process.productionLineId,
          createdBy: currentUserId,
        });

        return process;
      });
    } catch (error) {
      // Handle Prisma unique constraint violation (P2002)
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(
          'Process with this title already exists in the production line',
        );
      }

      this.logger.error('Failed to create process', {
        title: createProcessInput.title,
        productionLineId: createProcessInput.productionLineId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findAll(options?: {
    limit?: number;
    offset?: number;
    isActive?: boolean;
    status?: ProcessStatus;
    productionLineId?: string;
  }): Promise<Process[]> {
    try {
      const processes = await this.prisma.process.findMany({
        where: {
          ...(options?.isActive !== undefined && {
            isActive: options.isActive,
          }),
          ...(options?.status && { status: options.status }),
          ...(options?.productionLineId && {
            productionLineId: options.productionLineId,
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
        take: options?.limit || 100,
        skip: options?.offset || 0,
      });

      return processes;
    } catch (error) {
      this.logger.error('Failed to fetch processes', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async findOne(id: string): Promise<Process> {
    try {
      const process = await this.prisma.process.findUnique({
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

      if (!process) {
        throw new NotFoundException(`Process with ID ${id} not found`);
      }

      return process;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Failed to fetch process', {
        processId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async update(
    updateProcessInput: UpdateProcessInput,
    currentUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Process> {
    try {
      return await this.prisma.$transaction(async tx => {
        // Fetch existing process within transaction to get "before" state for audit
        const existingProcess = await tx.process.findUnique({
          where: { id: updateProcessInput.id },
        });

        if (!existingProcess) {
          throw new NotFoundException(
            `Process with ID ${updateProcessInput.id} not found`,
          );
        }

        const updateData: Prisma.ProcessUpdateInput = {};

        if (updateProcessInput.title !== undefined) {
          updateData.title = updateProcessInput.title;
        }
        if (updateProcessInput.description !== undefined) {
          updateData.description = updateProcessInput.description;
        }
        if (updateProcessInput.duration !== undefined) {
          updateData.duration = updateProcessInput.duration;
        }
        if (updateProcessInput.progress !== undefined) {
          updateData.progress = updateProcessInput.progress;
        }
        if (updateProcessInput.status !== undefined) {
          updateData.status = updateProcessInput.status;
        }
        if (updateProcessInput.x !== undefined) {
          updateData.x = updateProcessInput.x;
        }
        if (updateProcessInput.y !== undefined) {
          updateData.y = updateProcessInput.y;
        }
        if (updateProcessInput.color !== undefined) {
          updateData.color = updateProcessInput.color;
        }

        // No version increment needed for display-only app

        const process = await tx.process.update({
          where: { id: updateProcessInput.id },
          data: updateData,
        });

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.UPDATE,
            entityType: 'Process',
            entityId: process.id,
            reason: updateProcessInput.reason || 'Process updated',
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            details: {
              changes: updateData,
              previousValues: {
                title: existingProcess.title,
                description: existingProcess.description,
                duration: existingProcess.duration,
                progress: existingProcess.progress,
                status: existingProcess.status,
                x: existingProcess.x,
                y: existingProcess.y,
                color: existingProcess.color,
              },
            },
          },
          tx,
        );

        this.logger.log('Process updated successfully', {
          processId: process.id,
          updatedBy: currentUserId,
          changes: Object.keys(updateData),
        });

        return process;
      });
    } catch (error) {
      // Handle Prisma unique constraint violation (P2002)
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException(
          'Process with this title already exists in the production line',
        );
      }

      this.logger.error('Failed to update process', {
        processId: updateProcessInput.id,
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
  ): Promise<Process> {
    try {
      const existingProcess = await this.findOne(id);

      if (!existingProcess.isActive) {
        throw new ConflictException('Process is already deactivated');
      }

      // Simplified validation - allow deactivation in any state for display-only app

      return await this.prisma.$transaction(async tx => {
        const process = await tx.process.update({
          where: { id },
          data: {
            isActive: false,
          },
        });

        await this.auditService.create(
          {
            userId: currentUserId,
            action: AuditAction.DELETE,
            entityType: 'Process',
            entityId: process.id,
            reason,
            ipAddress: ipAddress || null,
            userAgent: userAgent || null,
            details: {
              action: 'deactivation',
              previouslyActive: existingProcess.isActive,
              title: existingProcess.title,
              status: existingProcess.status,
              progress: existingProcess.progress,
              productionLineId: existingProcess.productionLineId,
            },
          },
          tx,
        );

        this.logger.log('Process deactivated successfully', {
          processId: process.id,
          deactivatedBy: currentUserId,
        });

        return process;
      });
    } catch (error) {
      this.logger.error('Failed to deactivate process', {
        processId: id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Removed complex pharmaceutical workflow validation for display-only app
}
