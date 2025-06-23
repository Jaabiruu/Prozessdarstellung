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
exports.TracingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
const core_1 = require("@nestjs/core");
const rxjs_1 = require("rxjs");
const tracing_service_1 = require("../tracing/tracing.service");
const trace_operation_decorator_1 = require("../decorators/trace-operation.decorator");
const api_1 = require("@opentelemetry/api");
let TracingInterceptor = class TracingInterceptor {
    tracingService;
    reflector;
    constructor(tracingService, reflector) {
        this.tracingService = tracingService;
        this.reflector = reflector;
    }
    intercept(context, next) {
        if (context.getType() !== 'graphql') {
            return next.handle();
        }
        const gqlContext = graphql_1.GqlExecutionContext.create(context);
        const info = gqlContext.getInfo();
        const request = gqlContext.getContext().req;
        const user = request.user;
        const customOperationName = this.reflector.get(trace_operation_decorator_1.TRACE_OPERATION_KEY, context.getHandler());
        const operationName = customOperationName || `${info.operation.operation}.${info.fieldName}`;
        const operationType = info.operation.operation;
        return new rxjs_1.Observable((observer) => {
            this.tracingService.traceOperation(operationName, async (span) => {
                this.tracingService.addBusinessContext({
                    userId: user?.id,
                    userRole: user?.role,
                    operation: customOperationName || operationName,
                    entityType: this.extractEntityType(info.fieldName),
                    ip: request.ip,
                    userAgent: request.headers['user-agent'],
                });
                span.setAttributes({
                    'graphql.operation.type': operationType,
                    'graphql.operation.name': info.fieldName,
                    'graphql.document': info.fieldName,
                });
                const subscription = next.handle().subscribe({
                    next: (value) => {
                        if (value && typeof value === 'object') {
                            if (value.id) {
                                span.setAttribute('entity.id', value.id);
                            }
                            if (Array.isArray(value)) {
                                span.setAttribute('result.count', value.length);
                            }
                        }
                        observer.next(value);
                    },
                    error: (error) => {
                        observer.error(error);
                    },
                    complete: () => {
                        observer.complete();
                    },
                });
                return new Promise((resolve, reject) => {
                    subscription.add(() => resolve(undefined));
                });
            }, { kind: api_1.SpanKind.SERVER }).then(() => {
            }).catch((error) => {
                throw error;
            });
        });
    }
    extractEntityType(fieldName) {
        if (fieldName.startsWith('create')) {
            return fieldName.substring(6);
        }
        if (fieldName.startsWith('update')) {
            return fieldName.substring(6);
        }
        if (fieldName.startsWith('delete') || fieldName.startsWith('remove')) {
            return fieldName.substring(6);
        }
        if (fieldName.endsWith('s')) {
            return fieldName.slice(0, -1);
        }
        return fieldName;
    }
};
exports.TracingInterceptor = TracingInterceptor;
exports.TracingInterceptor = TracingInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tracing_service_1.TracingService,
        core_1.Reflector])
], TracingInterceptor);
//# sourceMappingURL=tracing.interceptor.js.map