"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductionLineDataLoader = void 0;
const dataloader_1 = __importDefault(require("dataloader"));
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let ProductionLineDataLoader = class ProductionLineDataLoader {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    createProductionLineLoader() {
        return new dataloader_1.default(async (ids) => {
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
            const productionLineMap = new Map(productionLines.map(pl => [pl.id, pl]));
            return ids.map(id => productionLineMap.get(id) || null);
        }, {
            cache: true,
            maxBatchSize: 100,
        });
    }
    createProcessesByProductionLineLoader() {
        return new dataloader_1.default(async (productionLineIds) => {
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
            const processesMap = new Map();
            productionLineIds.forEach(id => {
                processesMap.set(id, []);
            });
            processes.forEach(process => {
                const existing = processesMap.get(process.productionLineId) || [];
                existing.push(process);
                processesMap.set(process.productionLineId, existing);
            });
            return productionLineIds.map(id => processesMap.get(id) || []);
        }, {
            cache: true,
            maxBatchSize: 100,
        });
    }
};
exports.ProductionLineDataLoader = ProductionLineDataLoader;
exports.ProductionLineDataLoader = ProductionLineDataLoader = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProductionLineDataLoader);
//# sourceMappingURL=production-line.dataloader.js.map