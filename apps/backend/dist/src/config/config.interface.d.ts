export type NodeEnv = 'development' | 'production' | 'test';
export interface DatabaseConfig {
    readonly url: string;
    readonly maxConnections: number;
    readonly connectionTimeout: number;
    readonly queryTimeout: number;
    readonly logQueries: boolean;
}
export interface RedisConfig {
    readonly url: string;
}
export interface ElasticsearchConfig {
    readonly url: string;
}
export declare class JwtConfig {
    readonly secret: string;
    readonly expiresIn: string;
    constructor(config: {
        secret: string;
        expiresIn: string;
    });
    toJSON(): {
        expiresIn: string;
        secret: string;
    };
}
export interface AppConfig {
    readonly nodeEnv: NodeEnv;
    readonly port: number;
}
export interface ApplicationConfiguration {
    readonly app: AppConfig;
    readonly database: DatabaseConfig;
    readonly redis: RedisConfig;
    readonly elasticsearch: ElasticsearchConfig;
    readonly jwt: JwtConfig;
}
