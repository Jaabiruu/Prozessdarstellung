"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracingContext = exports.TraceOperation = exports.TRACE_OPERATION_KEY = void 0;
const common_1 = require("@nestjs/common");
const graphql_1 = require("@nestjs/graphql");
exports.TRACE_OPERATION_KEY = 'trace_operation';
const TraceOperation = (operationName) => (0, common_1.SetMetadata)(exports.TRACE_OPERATION_KEY, operationName);
exports.TraceOperation = TraceOperation;
exports.TracingContext = (0, common_1.createParamDecorator)((data, context) => {
    const gqlContext = graphql_1.GqlExecutionContext.create(context);
    const request = gqlContext.getContext().req;
    const user = request.user;
    return {
        userId: user?.id,
        userRole: user?.role,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        operationName: gqlContext.getInfo().fieldName,
        operationType: gqlContext.getInfo().operation.operation,
    };
});
//# sourceMappingURL=trace-operation.decorator.js.map