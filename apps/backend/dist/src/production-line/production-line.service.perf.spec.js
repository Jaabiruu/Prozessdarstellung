"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const production_line_service_1 = require("./production-line.service");
const prisma_service_1 = require("../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
describe('ProductionLineService - Performance Tests (Pillar 2)', () => {
    let service;
    let prismaService;
    let auditService;
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
        const module = await testing_1.Test.createTestingModule({
            providers: [
                production_line_service_1.ProductionLineService,
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: mockPrismaService,
                },
                {
                    provide: audit_service_1.AuditService,
                    useValue: mockAuditService,
                },
                {
                    provide: common_1.Logger,
                    useValue: {
                        log: jest.fn(),
                        error: jest.fn(),
                    },
                },
            ],
        }).compile();
        service = module.get(production_line_service_1.ProductionLineService);
        prismaService = module.get(prisma_service_1.PrismaService);
        auditService = module.get(audit_service_1.AuditService);
        jest.clearAllMocks();
    });
    describe('PERF-001: Verify query reduction in update methods', () => {
        it('should NOT make a pre-emptive findUnique call outside transaction', async () => {
            const updateInput = {
                id: 'prod-line-1',
                name: 'Updated Production Line',
                reason: 'Performance test update',
            };
            const userId = 'user-1';
            const existingProductionLine = {
                id: 'prod-line-1',
                name: 'Original Production Line',
                status: client_1.ProductionLineStatus.ACTIVE,
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
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
                const tx = {
                    productionLine: {
                        findUnique: jest.fn().mockResolvedValue(existingProductionLine),
                        update: jest.fn().mockResolvedValue(updatedProductionLine),
                    },
                };
                return callback(tx);
            });
            await service.update(updateInput, userId);
            expect(mockPrismaService.productionLine.findUnique).toHaveBeenCalledTimes(0);
            expect(mockPrismaService.productionLine.update).toHaveBeenCalledTimes(0);
            expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
            expect(mockAuditService.create).toHaveBeenCalledTimes(1);
        });
        it('should fetch existing record WITHIN transaction for audit purposes', async () => {
            const updateInput = {
                id: 'prod-line-1',
                name: 'Updated Production Line',
                status: client_1.ProductionLineStatus.MAINTENANCE,
                reason: 'Maintenance required',
            };
            const userId = 'user-1';
            const existingProductionLine = {
                id: 'prod-line-1',
                name: 'Original Production Line',
                status: client_1.ProductionLineStatus.ACTIVE,
                version: 1,
                isActive: true,
                createdBy: userId,
                reason: 'Created',
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            let txFindUniqueCalls = 0;
            let txUpdateCalls = 0;
            mockPrismaService.$transaction.mockImplementation(async (callback) => {
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
            await service.update(updateInput, userId);
            expect(txFindUniqueCalls).toBe(1);
            expect(txUpdateCalls).toBe(1);
            expect(mockAuditService.create).toHaveBeenCalledWith(expect.objectContaining({
                details: expect.objectContaining({
                    previousValues: {
                        name: existingProductionLine.name,
                        status: existingProductionLine.status,
                    },
                }),
            }), expect.any(Object));
        });
    });
});
//# sourceMappingURL=production-line.service.perf.spec.js.map