import DataLoader from 'dataloader';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Process } from '@prisma/client';

@Injectable()
export class ProcessDataLoader {
  constructor(private readonly prisma: PrismaService) {}

  // DataLoader for fetching processes by IDs
  createProcessLoader(): DataLoader<string, Process | null> {
    return new DataLoader<string, Process | null>(
      async (ids: readonly string[]) => {
        const processes = await this.prisma.process.findMany({
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

        // Create a map for efficient lookup
        const processMap = new Map(
          processes.map(process => [process.id, process])
        );

        // Return results in the same order as input IDs
        return ids.map(id => processMap.get(id) || null);
      },
      {
        cache: true,
        maxBatchSize: 100,
      }
    );
  }

  // DataLoader for fetching users by IDs (for creator relationships)
  createUserLoader(): DataLoader<string, any | null> {
    return new DataLoader<string, any | null>(
      async (ids: readonly string[]) => {
        const users = await this.prisma.user.findMany({
          where: {
            id: { in: [...ids] },
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
          },
        });

        // Create a map for efficient lookup
        const userMap = new Map(
          users.map(user => [user.id, user])
        );

        // Return results in the same order as input IDs
        return ids.map(id => userMap.get(id) || null);
      },
      {
        cache: true,
        maxBatchSize: 100,
      }
    );
  }
}