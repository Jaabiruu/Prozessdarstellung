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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const config_1 = require("../config");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor(configService) {
        super({
            datasources: {
                db: {
                    url: configService.database.url,
                },
            },
            log: configService.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
            errorFormat: 'minimal',
        });
        this.configService = configService;
        this.logger = new common_1.Logger(PrismaService_1.name);
    }
    async onModuleInit() {
        try {
            await this.$connect();
            this.logger.log('Successfully connected to database');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown connection error';
            this.logger.error(`Failed to connect to database: ${errorMessage}`);
            throw new Error('Database connection failed during module initialization');
        }
    }
    async onModuleDestroy() {
        try {
            await this.$disconnect();
            this.logger.log('Successfully disconnected from database');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown disconnection error';
            this.logger.warn(`Database disconnection warning: ${errorMessage}`);
        }
    }
    async executeTransaction(fn) {
        try {
            this.logger.debug('Starting database transaction');
            const result = await this.$transaction(fn);
            this.logger.debug('Transaction completed successfully');
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown transaction error';
            this.logger.error(`Transaction failed: ${errorMessage}`);
            throw new Error('Database transaction failed');
        }
    }
    async healthCheck() {
        const startTime = Date.now();
        try {
            await this.$queryRaw `SELECT 1`;
            const responseTime = Date.now() - startTime;
            this.logger.debug(`Database health check passed in ${responseTime}ms`);
            return {
                status: 'healthy',
                responseTime,
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown health check error';
            this.logger.error(`Database health check failed: ${errorMessage}`);
            return {
                status: 'unhealthy',
                responseTime,
            };
        }
    }
    getConnectionInfo() {
        return {
            url: this.configService.database.url ? 'configured' : 'not configured',
            poolSize: 10,
            connectionTimeout: 5000,
        };
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map