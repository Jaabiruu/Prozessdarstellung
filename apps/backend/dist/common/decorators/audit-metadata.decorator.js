"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditReason = exports.AuditMetadata = exports.AUDIT_METADATA_KEY = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
exports.AUDIT_METADATA_KEY = 'auditMetadata';
const AuditMetadata = (options) => (0, common_1.SetMetadata)(exports.AUDIT_METADATA_KEY, options);
exports.AuditMetadata = AuditMetadata;
exports.AuditReason = (0, common_1.createParamDecorator)((_data, context) => {
    const ctx = graphql_1.GqlExecutionContext.create(context);
    const args = ctx.getArgs();
    if (args.input && args.input.reason) {
        return args.input.reason;
    }
    if (args.reason) {
        return args.reason;
    }
    throw new Error('Audit reason is required but not provided in input');
});
//# sourceMappingURL=audit-metadata.decorator.js.map