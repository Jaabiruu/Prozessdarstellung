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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const config_interface_1 = require("./config.interface");
let ConfigService = class ConfigService {
    constructor(configService) {
        this.configService = configService;
    }
    get app() {
        if (!this._app) {
            const nodeEnv = this.configService.get('NODE_ENV', 'development');
            this._app = {
                nodeEnv,
                port: this.configService.get('PORT', 3000),
            };
        }
        return this._app;
    }
    get database() {
        if (!this._database) {
            this._database = {
                url: this.configService.getOrThrow('DATABASE_URL'),
                maxConnections: parseInt(this.configService.get('DATABASE_MAX_CONNECTIONS', '10'), 10),
                connectionTimeout: parseInt(this.configService.get('DATABASE_CONNECTION_TIMEOUT', '5000'), 10),
                queryTimeout: parseInt(this.configService.get('DATABASE_QUERY_TIMEOUT', '10000'), 10),
                logQueries: this.configService.get('DATABASE_LOG_QUERIES', String(this.isDevelopment)) === 'true',
            };
        }
        return this._database;
    }
    get redis() {
        if (!this._redis) {
            this._redis = {
                url: this.configService.getOrThrow('REDIS_URL'),
            };
        }
        return this._redis;
    }
    get elasticsearch() {
        if (!this._elasticsearch) {
            this._elasticsearch = {
                url: this.configService.getOrThrow('ELASTICSEARCH_URL'),
            };
        }
        return this._elasticsearch;
    }
    get jwt() {
        if (!this._jwt) {
            this._jwt = new config_interface_1.JwtConfig({
                secret: this.configService.getOrThrow('JWT_SECRET'),
                expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
            });
        }
        return this._jwt;
    }
    get isDevelopment() {
        return this.app.nodeEnv === 'development';
    }
    get isProduction() {
        return this.app.nodeEnv === 'production';
    }
    get isTest() {
        return this.app.nodeEnv === 'test';
    }
    get nodeEnv() {
        return this.app.nodeEnv;
    }
    get port() {
        return this.app.port;
    }
    get databaseUrl() {
        return this.database.url;
    }
    get redisUrl() {
        return this.redis.url;
    }
    get elasticsearchUrl() {
        return this.elasticsearch.url;
    }
    get jwtSecret() {
        return this.jwt.secret;
    }
    get jwtExpiresIn() {
        return this.jwt.expiresIn;
    }
};
exports.ConfigService = ConfigService;
exports.ConfigService = ConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ConfigService);
//# sourceMappingURL=config.service.js.map