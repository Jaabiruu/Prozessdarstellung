"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditContext = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
exports.AuditContext = (0, common_1.createParamDecorator)((_data, context) => {
    const ctx = graphql_1.GqlExecutionContext.create(context);
    const request = ctx.getContext().req;
    return {
        ipAddress: request?.ip || null,
        userAgent: request?.get('user-agent') || null,
    };
});
//# sourceMappingURL=audit-context.decorator.js.map