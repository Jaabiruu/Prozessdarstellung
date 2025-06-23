import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT, SEMRESATTRS_SERVICE_INSTANCE_ID } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

@Injectable()
export class TracingService implements OnModuleInit {
  private readonly logger = new Logger(TracingService.name);
  private sdk: NodeSDK;
  private tracer = trace.getTracer('pharma-backend');

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.initializeTracing();
  }

  private initializeTracing() {
    try {
      const tracingConfig = this.configService.get('tracing');
      
      // Create resource with service information
      const resource = defaultResource().merge(
        resourceFromAttributes({
          [SEMRESATTRS_SERVICE_NAME]: tracingConfig.serviceName,
          [SEMRESATTRS_SERVICE_VERSION]: tracingConfig.serviceVersion,
          [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: tracingConfig.environment,
          [SEMRESATTRS_SERVICE_INSTANCE_ID]: tracingConfig.resourceAttributes['service.instance.id'],
        }),
      );

      // Configure exporters
      const exporters = [];
      
      if (tracingConfig.jaegerEndpoint) {
        exporters.push(new JaegerExporter({
          endpoint: tracingConfig.jaegerEndpoint,
        }));
      }

      // Initialize SDK
      this.sdk = new NodeSDK({
        resource,
        traceExporter: exporters.length > 0 ? exporters[0] : undefined,
        instrumentations: [
          getNodeAutoInstrumentations({
            // Disable some instrumentations if needed
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
          }),
        ],
      });

      this.sdk.start();
      this.logger.log('OpenTelemetry tracing initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry tracing', error);
    }
  }

  /**
   * Create a custom span for business operations
   */
  createSpan(name: string, options?: {
    kind?: SpanKind;
    attributes?: Record<string, string | number | boolean>;
    parent?: any;
  }) {
    const span = this.tracer.startSpan(name, {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes,
    }, options?.parent || context.active());

    return span;
  }

  /**
   * Execute a function within a traced span
   */
  async traceOperation<T>(
    operationName: string,
    operation: (span: any) => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): Promise<T> {
    const span = this.createSpan(operationName, options);
    
    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => 
        operation(span)
      );
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error.message 
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add business context to the current span
   */
  addBusinessContext(context: {
    userId?: string;
    userRole?: string;
    operation?: string;
    entityType?: string;
    entityId?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const span = trace.getActiveSpan();
    if (span) {
      if (context.userId) span.setAttribute('user.id', context.userId);
      if (context.userRole) span.setAttribute('user.role', context.userRole);
      if (context.operation) span.setAttribute('business.operation', context.operation);
      if (context.entityType) span.setAttribute('entity.type', context.entityType);
      if (context.entityId) span.setAttribute('entity.id', context.entityId);
      if (context.ip) span.setAttribute('client.ip', context.ip);
      if (context.userAgent) span.setAttribute('client.user_agent', context.userAgent);
    }
  }

  /**
   * Create a span for database operations
   */
  traceDatabaseOperation<T>(
    operation: string,
    table: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.traceOperation(
      `db.${operation}`,
      async (span) => {
        span.setAttributes({
          'db.operation': operation,
          'db.table': table,
          'db.system': 'postgresql',
        });
        return await fn();
      },
      { kind: SpanKind.CLIENT }
    );
  }

  /**
   * Create a span for GraphQL operations
   */
  traceGraphQLOperation<T>(
    operationType: 'query' | 'mutation',
    operationName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return this.traceOperation(
      `graphql.${operationType}`,
      async (span) => {
        span.setAttributes({
          'graphql.operation.type': operationType,
          'graphql.operation.name': operationName,
        });
        return await fn();
      },
      { kind: SpanKind.SERVER }
    );
  }

  /**
   * Shutdown tracing gracefully
   */
  async shutdown() {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.logger.log('OpenTelemetry tracing shutdown completed');
    }
  }
}