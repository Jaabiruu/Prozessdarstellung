"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const apollo_1 = require("@nestjs/apollo");
const terminus_1 = require("@nestjs/terminus");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const health_1 = require("./health");
const config_1 = require("./config");
const database_1 = require("./database");
const auth_1 = require("./auth");
const audit_1 = require("./audit");
const user_1 = require("./user");
const production_line_1 = require("./production-line");
const process_1 = require("./process");
const dataloader_module_1 = require("./common/dataloader/dataloader.module");
const cache_module_1 = require("./common/cache/cache.module");
const tracing_module_1 = require("./common/tracing/tracing.module");
const tracing_interceptor_1 = require("./common/interceptors/tracing.interceptor");
const production_line_dataloader_1 = require("./common/dataloader/production-line.dataloader");
const process_dataloader_1 = require("./common/dataloader/process.dataloader");
const prisma_service_1 = require("./database/prisma.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            database_1.PrismaModule,
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 5,
                },
            ]),
            graphql_1.GraphQLModule.forRootAsync({
                driver: apollo_1.ApolloDriver,
                inject: [config_1.ConfigService, prisma_service_1.PrismaService],
                useFactory: (configService, prismaService) => ({
                    autoSchemaFile: true,
                    sortSchema: true,
                    playground: configService.isDevelopment,
                    introspection: true,
                    context: ({ req, res }) => {
                        const productionLineDataLoader = new production_line_dataloader_1.ProductionLineDataLoader(prismaService);
                        const processDataLoader = new process_dataloader_1.ProcessDataLoader(prismaService);
                        return {
                            req,
                            res,
                            dataloaders: {
                                productionLineLoader: productionLineDataLoader.createProductionLineLoader(),
                                processLoader: processDataLoader.createProcessLoader(),
                                userLoader: processDataLoader.createUserLoader(),
                                processesByProductionLineLoader: productionLineDataLoader.createProcessesByProductionLineLoader(),
                            },
                        };
                    },
                    cors: {
                        origin: configService.isDevelopment,
                        credentials: true,
                    },
                }),
            }),
            terminus_1.TerminusModule,
            health_1.HealthModule,
            auth_1.AuthModule,
            audit_1.AuditModule,
            user_1.UserModule,
            production_line_1.ProductionLineModule,
            process_1.ProcessModule,
            dataloader_module_1.DataLoaderModule,
            cache_module_1.CacheModule,
            tracing_module_1.TracingModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: auth_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: tracing_interceptor_1.TracingInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map