import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuditOptions } from '../../audit/interfaces/audit-context.interface';

export const AUDIT_METADATA_KEY = 'auditMetadata';

export const AuditMetadata = (options: AuditOptions) => SetMetadata(AUDIT_METADATA_KEY, options);

export const AuditReason = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const ctx = GqlExecutionContext.create(context);
    const args = ctx.getArgs();
    
    if (args.input && args.input.reason) {
      return args.input.reason;
    }
    
    if (args.reason) {
      return args.reason;
    }
    
    throw new Error('Audit reason is required but not provided in input');
  },
);
