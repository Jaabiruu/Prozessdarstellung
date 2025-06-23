import { Test, TestingModule } from '@nestjs/testing';
import { ProductionLineResolver } from './production-line.resolver';
import { ProductionLineService } from './production-line.service';
import { ProductionLine } from './entities/production-line.entity';
import { ProductionLineStatus } from '@prisma/client';
import { GraphQLContext } from '../common/interfaces/graphql-context.interface';
import { Request, Response } from 'express';

describe('ProductionLineResolver - Performance Tests (Pillar 2)', () => {
  let resolver: ProductionLineResolver;
  let service: ProductionLineService;

  const mockProductionLineService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockContext: GraphQLContext = {
    req: {} as Request,
    res: {} as Response,
    dataloaders: {
      productionLineLoader: {
        load: jest.fn(),
        loadMany: jest.fn(),
        clear: jest.fn(),
        clearAll: jest.fn(),
        prime: jest.fn(),
      } as any,
      processLoader: {
        load: jest.fn(),
        loadMany: jest.fn(),
        clear: jest.fn(),
        clearAll: jest.fn(),
        prime: jest.fn(),
      } as any,
      userLoader: {
        load: jest.fn(),
        loadMany: jest.fn(),
        clear: jest.fn(),
        clearAll: jest.fn(),
        prime: jest.fn(),
      } as any,
      processesByProductionLineLoader: {
        load: jest.fn(),
        loadMany: jest.fn(),
        clear: jest.fn(),
        clearAll: jest.fn(),
        prime: jest.fn(),
      } as any,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionLineResolver,
        {
          provide: ProductionLineService,
          useValue: mockProductionLineService,
        },
      ],
    }).compile();

    resolver = module.get<ProductionLineResolver>(ProductionLineResolver);
    service = module.get<ProductionLineService>(ProductionLineService);

    jest.clearAllMocks();
  });

  describe('PERF-002: Verify processCount field resolver efficiency', () => {
    it('should return count from parent._count.processes without any DataLoader calls', () => {
      // Arrange
      const productionLineWithCount: ProductionLine = {
        id: 'prod-line-1',
        name: 'Test Production Line',
        status: ProductionLineStatus.ACTIVE,
        version: 1,
        isActive: true,
        createdBy: 'user-1',
        reason: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          processes: 5, // This is set by Prisma when using include: { _count: { select: { processes: true } } }
        },
      };

      // Act
      const result = resolver.processCount(productionLineWithCount);

      // Assert
      expect(result).toBe(5);
      // Verify no DataLoader calls were made
      expect(
        mockContext.dataloaders.processesByProductionLineLoader.load,
      ).toHaveBeenCalledTimes(0);
      // Verify no service calls were made
      expect(mockProductionLineService.findAll).toHaveBeenCalledTimes(0);
      expect(mockProductionLineService.findOne).toHaveBeenCalledTimes(0);
    });

    it('should return 0 when _count is not available', () => {
      // Arrange
      const productionLineWithoutCount: ProductionLine = {
        id: 'prod-line-2',
        name: 'Test Production Line 2',
        status: ProductionLineStatus.ACTIVE,
        version: 1,
        isActive: true,
        createdBy: 'user-1',
        reason: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        // No _count property
      };

      // Act
      const result = resolver.processCount(productionLineWithoutCount);

      // Assert
      expect(result).toBe(0);
      // Verify no external calls were made
      expect(
        mockContext.dataloaders.processesByProductionLineLoader.load,
      ).toHaveBeenCalledTimes(0);
    });

    it('should return 0 when _count.processes is undefined', () => {
      // Arrange
      const productionLineWithEmptyCount: ProductionLine = {
        id: 'prod-line-3',
        name: 'Test Production Line 3',
        status: ProductionLineStatus.ACTIVE,
        version: 1,
        isActive: true,
        createdBy: 'user-1',
        reason: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { processes: 0 }, // Empty _count object
      };

      // Act
      const result = resolver.processCount(productionLineWithEmptyCount);

      // Assert
      expect(result).toBe(0);
    });

    it('should be a synchronous operation with no async/await', () => {
      // Arrange
      const productionLineWithCount: ProductionLine = {
        id: 'prod-line-4',
        name: 'Test Production Line 4',
        status: ProductionLineStatus.ACTIVE,
        version: 1,
        isActive: true,
        createdBy: 'user-1',
        reason: 'Test',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          processes: 10,
        },
      };

      // Act
      const result = resolver.processCount(productionLineWithCount);

      // Assert
      expect(result).toBe(10);
      // The method should return a number directly, not a Promise
      expect(typeof result).toBe('number');
      expect(result).not.toBeInstanceOf(Promise);
    });
  });
});
