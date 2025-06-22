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
exports.ProcessDataLoader = void 0;
const dataloader_1 = __importDefault(require("dataloader"));
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../database/prisma.service");
let ProcessDataLoader = class ProcessDataLoader {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    createProcessLoader() {
        return new dataloader_1.default(async (ids) => {
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
            const processMap = new Map(processes.map(process => [process.id, process]));
            return ids.map(id => processMap.get(id) || null);
        }, {
            cache: true,
            maxBatchSize: 100,
        });
    }
    createUserLoader() {
        return new dataloader_1.default(async (ids) => {
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
            const userMap = new Map(users.map(user => [user.id, user]));
            return ids.map(id => userMap.get(id) || null);
        }, {
            cache: true,
            maxBatchSize: 100,
        });
    }
};
exports.ProcessDataLoader = ProcessDataLoader;
exports.ProcessDataLoader = ProcessDataLoader = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ProcessDataLoader);
//# sourceMappingURL=process.dataloader.js.map