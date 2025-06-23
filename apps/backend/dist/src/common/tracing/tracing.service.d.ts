import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpanKind } from '@opentelemetry/api';
export declare class TracingService implements OnModuleInit {
    private configService;
    private readonly logger;
    private sdk;
    private tracer;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    private initializeTracing;
    createSpan(name: string, options?: {
        kind?: SpanKind;
        attributes?: Record<string, string | number | boolean>;
        parent?: any;
    }): import("@opentelemetry/api").Span;
    traceOperation<T>(operationName: string, operation: (span: any) => Promise<T>, options?: {
        kind?: SpanKind;
        attributes?: Record<string, string | number | boolean>;
    }): Promise<T>;
    addBusinessContext(context: {
        userId?: string;
        userRole?: string;
        operation?: string;
        entityType?: string;
        entityId?: string;
        ip?: string;
        userAgent?: string;
    }): void;
    traceDatabaseOperation<T>(operation: string, table: string, fn: () => Promise<T>): Promise<T>;
    traceGraphQLOperation<T>(operationType: 'query' | 'mutation', operationName: string, fn: () => Promise<T>): Promise<T>;
    shutdown(): Promise<void>;
}
