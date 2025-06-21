import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import {
  ApplicationConfiguration,
  AppConfig,
  DatabaseConfig,
  RedisConfig,
  ElasticsearchConfig,
  JwtConfig,
  NodeEnv,
} from './config.interface';

@Injectable()
export class ConfigService implements ApplicationConfiguration {
  private _app?: AppConfig;
  private _database?: DatabaseConfig;
  private _redis?: RedisConfig;
  private _elasticsearch?: ElasticsearchConfig;
  private _jwt?: JwtConfig;

  constructor(private readonly configService: NestConfigService) {}

  get app(): AppConfig {
    if (!this._app) {
      const nodeEnv = this.configService.get<NodeEnv>('NODE_ENV', 'development');
      this._app = {
        nodeEnv,
        port: this.configService.get<number>('PORT', 3000),
      };
    }
    return this._app;
  }

  get database(): DatabaseConfig {
    if (!this._database) {
      this._database = {
        url: this.configService.getOrThrow<string>('DATABASE_URL'),
        maxConnections: parseInt(this.configService.get<string>('DATABASE_MAX_CONNECTIONS', '10'), 10),
        connectionTimeout: parseInt(this.configService.get<string>('DATABASE_CONNECTION_TIMEOUT', '5000'), 10),
        queryTimeout: parseInt(this.configService.get<string>('DATABASE_QUERY_TIMEOUT', '10000'), 10),
        logQueries: this.configService.get<string>('DATABASE_LOG_QUERIES', String(this.isDevelopment)) === 'true',
      };
    }
    return this._database;
  }

  get redis(): RedisConfig {
    if (!this._redis) {
      this._redis = {
        url: this.configService.getOrThrow<string>('REDIS_URL'),
      };
    }
    return this._redis;
  }

  get elasticsearch(): ElasticsearchConfig {
    if (!this._elasticsearch) {
      this._elasticsearch = {
        url: this.configService.getOrThrow<string>('ELASTICSEARCH_URL'),
      };
    }
    return this._elasticsearch;
  }

  get jwt(): JwtConfig {
    if (!this._jwt) {
      this._jwt = new JwtConfig({
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
      });
    }
    return this._jwt;
  }

  // Computed properties (derived values, not stored in config)
  get isDevelopment(): boolean {
    return this.app.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.app.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.app.nodeEnv === 'test';
  }

  // Legacy getters for backward compatibility
  get nodeEnv(): NodeEnv {
    return this.app.nodeEnv;
  }

  get port(): number {
    return this.app.port;
  }

  get databaseUrl(): string {
    return this.database.url;
  }

  get redisUrl(): string {
    return this.redis.url;
  }

  get elasticsearchUrl(): string {
    return this.elasticsearch.url;
  }

  get jwtSecret(): string {
    return this.jwt.secret;
  }

  get jwtExpiresIn(): string {
    return this.jwt.expiresIn;
  }
}