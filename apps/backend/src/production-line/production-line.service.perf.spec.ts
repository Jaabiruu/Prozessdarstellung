import { Test, TestingModule } from '@nestjs/testing';
import { ProductionLineService } from './production-line.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Logger } from '@nestjs/common';
import { ProductionLineStatus } from '@prisma/client';
import { UpdateProductionLineInput } from './dto/update-production-line.input';

describe('ProductionLineService - Performance Tests (Pillar 2)', () => {
  let service: ProductionLineService;
  let prismaService: PrismaService;
  let auditService: AuditService;

  const mockPrismaService = {
    $transaction: jest.fn(),
    productionLine: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAuditService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionLineService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductionLineService>(ProductionLineService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);

    jest.clearAllMocks();
  });

  describe('PERF-001: Verify query reduction in update methods', () => {
    it('should NOT make a pre-emptive findUnique call outside transaction', async () => {
      // Arrange
      const updateInput: UpdateProductionLineInput = {
        id: 'prod-line-1',
        name: 'Updated Production Line',
        reason: 'Performance test update',
      };
      const userId = 'user-1';

      const existingProductionLine = {
        id: 'prod-line-1',
        name: 'Original Production Line',
        status: ProductionLineStatus.ACTIVE,
        version: 1,
        isActive: true,
        createdBy: userId,
        reason: 'Created',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedProductionLine = {
        ...existingProductionLine,
        name: updateInput.name,
      };

      // Mock transaction behavior
      mockPrismaService.$transaction.mockImplementation(async callback => {
        const tx = {
          productionLine: {
            findUnique: jest.fn().mockResolvedValue(existingProductionLine),
            update: jest.fn().mockResolvedValue(updatedProductionLine),
          },
        };
        return callback(tx);
      });

      // Act
      await service.update(updateInput, userId);

      // Assert - CRITICAL: No findUnique calls should be made on the main prisma service
      expect(mockPrismaService.productionLine.findUnique).toHaveBeenCalledTimes(
        0,
      );
      expect(mockPrismaService.productionLine.update).toHaveBeenCalledTimes(0);

      // Transaction should be called once
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);

      // Verify audit was created with transaction context
      expect(mockAuditService.create).toHaveBeenCalledTimes(1);
    });

    it('should fetch existing record WITHIN transaction for audit purposes', async () => {
      // Arrange
      const updateInput: UpdateProductionLineInput = {
        id: 'prod-line-1',
        name: 'Updated Production Line',
        status: ProductionLineStatus.MAINTENANCE,
        reason: 'Maintenance required',
      };
      const userId = 'user-1';

      const existingProductionLine = {
        id: 'prod-line-1',
        name: 'Original Production Line',
        status: ProductionLineStatus.ACTIVE,
        version: 1,
        isActive: true,
        createdBy: userId,
        reason: 'Created',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      let txFindUniqueCalls = 0;
      let txUpdateCalls = 0;

      // Mock transaction behavior
      mockPrismaService.$transaction.mockImplementation(async callback => {
        const tx = {
          productionLine: {
            findUnique: jest.fn().mockImplementation(() => {
              txFindUniqueCalls++;
              return Promise.resolve(existingProductionLine);
            }),
            update: jest.fn().mockImplementation(() => {
              txUpdateCalls++;
              return Promise.resolve({
                ...existingProductionLine,
                name: updateInput.name,
                status: updateInput.status,
              });
            }),
          },
        };
        return callback(tx);
      });

      // Act
      await service.update(updateInput, userId);

      // Assert
      expect(txFindUniqueCalls).toBe(1); // Should fetch once within transaction
      expect(txUpdateCalls).toBe(1); // Should update once

      // Verify audit contains previous values
      expect(mockAuditService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({
            previousValues: {
              name: existingProductionLine.name,
              status: existingProductionLine.status,
            },
          }),
        }),
        expect.any(Object), // tx parameter
      );
    });
  });
});
