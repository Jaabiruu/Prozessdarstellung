import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProductionLine, Process } from '@prisma/client';

@Injectable()
export class ProductionLineDataLoader {
  constructor(private readonly prisma: PrismaService) {}

  // DataLoader for fetching production lines by IDs
  createProductionLineLoader(): DataLoader<string, ProductionLine | null> {
    return new DataLoader<string, ProductionLine | null>(
      async (ids: readonly string[]) => {
        const productionLines = await this.prisma.productionLine.findMany({
          where: {
            id: { in: [...ids] },
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
        });

        // Create a map for efficient lookup
        const productionLineMap = new Map(
          productionLines.map(pl => [pl.id, pl]),
        );

        // Return results in the same order as input IDs
        return ids.map(id => productionLineMap.get(id) || null);
      },
      {
        cache: true, // Enable caching
        maxBatchSize: 100, // Batch up to 100 items
      },
    );
  }

  // DataLoader for fetching processes by production line IDs
  createProcessesByProductionLineLoader(): DataLoader<string, Process[]> {
    return new DataLoader<string, Process[]>(
      async (productionLineIds: readonly string[]) => {
        const processes = await this.prisma.process.findMany({
          where: {
            productionLineId: { in: [...productionLineIds] },
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
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Group processes by production line ID
        const processesMap = new Map<string, Process[]>();

        // Initialize empty arrays for all production line IDs
        productionLineIds.forEach(id => {
          processesMap.set(id, []);
        });

        // Group processes by production line
        processes.forEach(process => {
          const existing = processesMap.get(process.productionLineId) || [];
          existing.push(process);
          processesMap.set(process.productionLineId, existing);
        });

        // Return results in the same order as input IDs
        return productionLineIds.map(id => processesMap.get(id) || []);
      },
      {
        cache: true,
        maxBatchSize: 100,
      },
    );
  }
}
