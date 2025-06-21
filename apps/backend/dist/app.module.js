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
const health_1 = require("./health");
const config_1 = require("./config");
const database_1 = require("./database");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            database_1.PrismaModule,
            graphql_1.GraphQLModule.forRootAsync({
                driver: apollo_1.ApolloDriver,
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    autoSchemaFile: true,
                    sortSchema: true,
                    playground: configService.isDevelopment,
                    introspection: true,
                    context: ({ req, res }) => ({ req, res }),
                    cors: {
                        origin: configService.isDevelopment,
                        credentials: true,
                    },
                }),
            }),
            terminus_1.TerminusModule,
            health_1.HealthModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map