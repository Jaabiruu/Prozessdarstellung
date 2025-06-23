import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export interface AuditContext {
  ipAddress: string | null;
  userAgent: string | null;
}

export const AuditContext = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuditContext => {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    return {
      ipAddress: request?.ip || null,
      userAgent: request?.get('user-agent') || null,
    };
  },
);
