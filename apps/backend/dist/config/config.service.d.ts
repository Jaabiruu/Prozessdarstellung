import { ConfigService as NestConfigService } from '@nestjs/config';
import { ApplicationConfiguration, AppConfig, DatabaseConfig, RedisConfig, ElasticsearchConfig, JwtConfig, NodeEnv } from './config.interface';
export declare class ConfigService implements ApplicationConfiguration {
    private readonly configService;
    private _app?;
    private _database?;
    private _redis?;
    private _elasticsearch?;
    private _jwt?;
    constructor(configService: NestConfigService);
    get app(): AppConfig;
    get database(): DatabaseConfig;
    get redis(): RedisConfig;
    get elasticsearch(): ElasticsearchConfig;
    get jwt(): JwtConfig;
    get isDevelopment(): boolean;
    get isProduction(): boolean;
    get isTest(): boolean;
    get nodeEnv(): NodeEnv;
    get port(): number;
    get databaseUrl(): string;
    get redisUrl(): string;
    get elasticsearchUrl(): string;
    get jwtSecret(): string;
    get jwtExpiresIn(): string;
}
