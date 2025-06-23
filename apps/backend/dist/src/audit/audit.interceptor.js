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
var AuditInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const core_1 = require("@nestjs/core");
const graphql_1 = require("@nestjs/graphql");
const audit_service_1 = require("./audit.service");
const audit_metadata_decorator_1 = require("../common/decorators/audit-metadata.decorator");
const user_role_enum_1 = require("../common/enums/user-role.enum");
let AuditInterceptor = AuditInterceptor_1 = class AuditInterceptor {
    auditService;
    reflector;
    logger = new common_1.Logger(AuditInterceptor_1.name);
    constructor(auditService, reflector) {
        this.auditService = auditService;
        this.reflector = reflector;
    }
    intercept(context, next) {
        const auditOptions = this.reflector.get(audit_metadata_decorator_1.AUDIT_METADATA_KEY, context.getHandler());
        if (!auditOptions) {
            return next.handle();
        }
        const gqlContext = graphql_1.GqlExecutionContext.create(context);
        const request = gqlContext.getContext().req;
        const user = request.user;
        const args = gqlContext.getArgs();
        if (!user) {
            this.logger.warn('Audit interceptor: No user found in request context');
            return next.handle();
        }
        return next.handle().pipe((0, operators_1.tap)(async (result) => {
            try {
                await this.createAuditLog(auditOptions, user, args, result, request);
            }
            catch (error) {
                this.logger.error('Failed to create audit log in interceptor', {
                    userId: user.id,
                    entityType: auditOptions.entityType,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }));
    }
    async createAuditLog(options, user, args, result, request) {
        const entityId = this.extractEntityId(options, args, result);
        const reason = this.extractReason(args);
        const action = this.determineAction(options, args);
        const auditContext = {
            userId: user.id,
            action,
            entityType: options.entityType,
            entityId,
            reason,
            ipAddress: request.ip ||
                request
                    .connection?.remoteAddress ||
                null,
            userAgent: request.get('user-agent') || null,
            details: options.includeDetails
                ? this.extractDetails(args, result)
                : null,
        };
        await this.auditService.createFromContext(auditContext);
    }
    extractEntityId(options, args, result) {
        if (options.extractEntityId) {
            return options.extractEntityId(args, result);
        }
        if (result &&
            typeof result === 'object' &&
            result !== null &&
            'id' in result) {
            return result.id;
        }
        if (args.id && typeof args.id === 'string') {
            return args.id;
        }
        if (args.input &&
            typeof args.input === 'object' &&
            args.input !== null &&
            'id' in args.input) {
            return args.input.id;
        }
        throw new Error(`Cannot extract entity ID for audit log: ${options.entityType}`);
    }
    extractReason(args) {
        if (args.input &&
            typeof args.input === 'object' &&
            args.input !== null &&
            'reason' in args.input) {
            const reason = args.input.reason;
            if (typeof reason === 'string') {
                return reason;
            }
        }
        if (args.reason && typeof args.reason === 'string') {
            return args.reason;
        }
        throw new Error('Audit reason is required but not provided');
    }
    determineAction(options, args) {
        if (options.action) {
            return options.action;
        }
        if (args.input &&
            typeof args.input === 'object' &&
            args.input !== null &&
            'action' in args.input) {
            const action = args.input.action;
            if (typeof action === 'string' &&
                Object.values(user_role_enum_1.AuditAction).includes(action)) {
                return action;
            }
        }
        const handlerName = args.constructor?.name || 'unknown';
        if (handlerName.toLowerCase().includes('create')) {
            return user_role_enum_1.AuditAction.CREATE;
        }
        else if (handlerName.toLowerCase().includes('update')) {
            return user_role_enum_1.AuditAction.UPDATE;
        }
        else if (handlerName.toLowerCase().includes('delete') ||
            handlerName.toLowerCase().includes('remove')) {
            return user_role_enum_1.AuditAction.DELETE;
        }
        else if (handlerName.toLowerCase().includes('approve')) {
            return user_role_enum_1.AuditAction.APPROVE;
        }
        else if (handlerName.toLowerCase().includes('reject')) {
            return user_role_enum_1.AuditAction.REJECT;
        }
        return user_role_enum_1.AuditAction.UPDATE;
    }
    extractDetails(args, result) {
        return {
            args: this.sanitizeForAudit(args),
            result: this.sanitizeForAudit(result),
        };
    }
    sanitizeForAudit(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }
        const sanitized = { ...data };
        const sensitiveFields = ['password', 'token', 'secret', 'key'];
        for (const field of sensitiveFields) {
            if (field in sanitized && sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        return sanitized;
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = AuditInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_service_1.AuditService,
        core_1.Reflector])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map