"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const production_line_resolver_1 = require("./production-line.resolver");
const production_line_service_1 = require("./production-line.service");
const client_1 = require("@prisma/client");
describe('ProductionLineResolver - Performance Tests (Pillar 2)', () => {
    let resolver;
    let service;
    const mockProductionLineService = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    };
    const mockContext = {
        req: {},
        res: {},
        dataloaders: {
            productionLineLoader: {
                load: jest.fn(),
                loadMany: jest.fn(),
                clear: jest.fn(),
                clearAll: jest.fn(),
                prime: jest.fn(),
            },
            processLoader: {
                load: jest.fn(),
                loadMany: jest.fn(),
                clear: jest.fn(),
                clearAll: jest.fn(),
                prime: jest.fn(),
            },
            userLoader: {
                load: jest.fn(),
                loadMany: jest.fn(),
                clear: jest.fn(),
                clearAll: jest.fn(),
                prime: jest.fn(),
            },
            processesByProductionLineLoader: {
                load: jest.fn(),
                loadMany: jest.fn(),
                clear: jest.fn(),
                clearAll: jest.fn(),
                prime: jest.fn(),
            },
        },
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                production_line_resolver_1.ProductionLineResolver,
                {
                    provide: production_line_service_1.ProductionLineService,
                    useValue: mockProductionLineService,
                },
            ],
        }).compile();
        resolver = module.get(production_line_resolver_1.ProductionLineResolver);
        service = module.get(production_line_service_1.ProductionLineService);
        jest.clearAllMocks();
    });
    describe('PERF-002: Verify processCount field resolver efficiency', () => {
        it('should return count from parent._count.processes without any DataLoader calls', () => {
            const productionLineWithCount = {
                id: 'prod-line-1',
                name: 'Test Production Line',
                status: client_1.ProductionLineStatus.ACTIVE,
                version: 1,
                isActive: true,
                createdBy: 'user-1',
                reason: 'Test',
                createdAt: new Date(),
                updatedAt: new Date(),
                _count: {
                    processes: 5,
                },
            };
            const result = resolver.processCount(productionLineWithCount);
            expect(result).toBe(5);
            expect(mockContext.dataloaders.processesByProductionLineLoader.load).toHaveBeenCalledTimes(0);
            expect(mockProductionLineService.findAll).toHaveBeenCalledTimes(0);
            expect(mockProductionLineService.findOne).toHaveBeenCalledTimes(0);
        });
        it('should return 0 when _count is not available', () => {
            const productionLineWithoutCount = {
                id: 'prod-line-2',
                name: 'Test Production Line 2',
                status: client_1.ProductionLineStatus.ACTIVE,
                version: 1,
                isActive: true,
                createdBy: 'user-1',
                reason: 'Test',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            const result = resolver.processCount(productionLineWithoutCount);
            expect(result).toBe(0);
            expect(mockContext.dataloaders.processesByProductionLineLoader.load).toHaveBeenCalledTimes(0);
        });
        it('should return 0 when _count.processes is undefined', () => {
            const productionLineWithEmptyCount = {
                id: 'prod-line-3',
                name: 'Test Production Line 3',
                status: client_1.ProductionLineStatus.ACTIVE,
                version: 1,
                isActive: true,
                createdBy: 'user-1',
                reason: 'Test',
                createdAt: new Date(),
                updatedAt: new Date(),
                _count: { processes: 0 },
            };
            const result = resolver.processCount(productionLineWithEmptyCount);
            expect(result).toBe(0);
        });
        it('should be a synchronous operation with no async/await', () => {
            const productionLineWithCount = {
                id: 'prod-line-4',
                name: 'Test Production Line 4',
                status: client_1.ProductionLineStatus.ACTIVE,
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
            const result = resolver.processCount(productionLineWithCount);
            expect(result).toBe(10);
            expect(typeof result).toBe('number');
            expect(result).not.toBeInstanceOf(Promise);
        });
    });
});
//# sourceMappingURL=production-line.resolver.perf.spec.js.map