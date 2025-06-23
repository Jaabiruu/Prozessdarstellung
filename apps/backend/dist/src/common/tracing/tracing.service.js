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
var TracingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracingService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const api_1 = require("@opentelemetry/api");
let TracingService = TracingService_1 = class TracingService {
    configService;
    logger = new common_1.Logger(TracingService_1.name);
    sdk;
    tracer = api_1.trace.getTracer('pharma-backend');
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        this.initializeTracing();
    }
    initializeTracing() {
        try {
            const tracingConfig = this.configService.get('tracing');
            const resource = (0, resources_1.defaultResource)().merge((0, resources_1.resourceFromAttributes)({
                [semantic_conventions_1.SEMRESATTRS_SERVICE_NAME]: tracingConfig.serviceName,
                [semantic_conventions_1.SEMRESATTRS_SERVICE_VERSION]: tracingConfig.serviceVersion,
                [semantic_conventions_1.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: tracingConfig.environment,
                [semantic_conventions_1.SEMRESATTRS_SERVICE_INSTANCE_ID]: tracingConfig.resourceAttributes['service.instance.id'],
            }));
            const exporters = [];
            if (tracingConfig.jaegerEndpoint) {
                exporters.push(new exporter_jaeger_1.JaegerExporter({
                    endpoint: tracingConfig.jaegerEndpoint,
                }));
            }
            this.sdk = new sdk_node_1.NodeSDK({
                resource,
                traceExporter: exporters.length > 0 ? exporters[0] : undefined,
                instrumentations: [
                    (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
                        '@opentelemetry/instrumentation-fs': {
                            enabled: false,
                        },
                    }),
                ],
            });
            this.sdk.start();
            this.logger.log('OpenTelemetry tracing initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize OpenTelemetry tracing', error);
        }
    }
    createSpan(name, options) {
        const span = this.tracer.startSpan(name, {
            kind: options?.kind || api_1.SpanKind.INTERNAL,
            attributes: options?.attributes,
        }, options?.parent || api_1.context.active());
        return span;
    }
    async traceOperation(operationName, operation, options) {
        const span = this.createSpan(operationName, options);
        try {
            const result = await api_1.context.with(api_1.trace.setSpan(api_1.context.active(), span), () => operation(span));
            span.setStatus({ code: api_1.SpanStatusCode.OK });
            return result;
        }
        catch (error) {
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: error.message
            });
            span.recordException(error);
            throw error;
        }
        finally {
            span.end();
        }
    }
    addBusinessContext(context) {
        const span = api_1.trace.getActiveSpan();
        if (span) {
            if (context.userId)
                span.setAttribute('user.id', context.userId);
            if (context.userRole)
                span.setAttribute('user.role', context.userRole);
            if (context.operation)
                span.setAttribute('business.operation', context.operation);
            if (context.entityType)
                span.setAttribute('entity.type', context.entityType);
            if (context.entityId)
                span.setAttribute('entity.id', context.entityId);
            if (context.ip)
                span.setAttribute('client.ip', context.ip);
            if (context.userAgent)
                span.setAttribute('client.user_agent', context.userAgent);
        }
    }
    traceDatabaseOperation(operation, table, fn) {
        return this.traceOperation(`db.${operation}`, async (span) => {
            span.setAttributes({
                'db.operation': operation,
                'db.table': table,
                'db.system': 'postgresql',
            });
            return await fn();
        }, { kind: api_1.SpanKind.CLIENT });
    }
    traceGraphQLOperation(operationType, operationName, fn) {
        return this.traceOperation(`graphql.${operationType}`, async (span) => {
            span.setAttributes({
                'graphql.operation.type': operationType,
                'graphql.operation.name': operationName,
            });
            return await fn();
        }, { kind: api_1.SpanKind.SERVER });
    }
    async shutdown() {
        if (this.sdk) {
            await this.sdk.shutdown();
            this.logger.log('OpenTelemetry tracing shutdown completed');
        }
    }
};
exports.TracingService = TracingService;
exports.TracingService = TracingService = TracingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TracingService);
//# sourceMappingURL=tracing.service.js.map