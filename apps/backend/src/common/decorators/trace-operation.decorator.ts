import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const TRACE_OPERATION_KEY = 'trace_operation';

/**
 * Decorator to mark a GraphQL operation for tracing
 * Usage: @TraceOperation('CREATE_PROCESS')
 */
export const TraceOperation = (operationName: string) => 
  SetMetadata(TRACE_OPERATION_KEY, operationName);

/**
 * Parameter decorator to extract tracing context from GraphQL request
 */
export const TracingContext = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext().req;
    const user = request.user; // Assuming user is attached by auth guard
    
    return {
      userId: user?.id,
      userRole: user?.role,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      operationName: gqlContext.getInfo().fieldName,
      operationType: gqlContext.getInfo().operation.operation, // query, mutation
    };
  },
);