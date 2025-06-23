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

    // Extract IP with X-Forwarded-For support
    const forwardedFor = request?.get('X-Forwarded-For');
    const ipAddress =
      forwardedFor?.split(',')[0]?.trim() || request?.ip || null;

    return {
      ipAddress,
      userAgent: request?.get('user-agent') || null,
    };
  },
);
