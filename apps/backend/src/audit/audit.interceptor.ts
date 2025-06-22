import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AuditService } from './audit.service';
import { AuditOptions, AuditContext } from './interfaces/audit-context.interface';
import { AUDIT_METADATA_KEY } from '../common/decorators/audit-metadata.decorator';
import { AuditAction } from '../common/enums/user-role.enum';
import { User } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditOptions = this.reflector.get<AuditOptions>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext().req;
    const user: User = request.user;
    const args = gqlContext.getArgs();

    if (!user) {
      this.logger.warn('Audit interceptor: No user found in request context');
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.createAuditLog(auditOptions, user, args, result, request);
        } catch (error) {
          this.logger.error('Failed to create audit log in interceptor', {
            userId: user.id,
            entityType: auditOptions.entityType,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }),
    );
  }

  private async createAuditLog(
    options: AuditOptions,
    user: User,
    args: any,
    result: any,
    request: any,
  ): Promise<void> {
    const entityId = this.extractEntityId(options, args, result);
    const reason = this.extractReason(args);
    const action = this.determineAction(options, args);

    const auditContext: AuditContext = {
      userId: user.id,
      action,
      entityType: options.entityType,
      entityId,
      reason,
      ipAddress: request.ip || request.connection?.remoteAddress || null,
      userAgent: request.get('user-agent') || null,
      details: options.includeDetails ? this.extractDetails(args, result) : null,
    };

    await this.auditService.createFromContext(auditContext);
  }

  private extractEntityId(options: AuditOptions, args: any, result: any): string {
    if (options.extractEntityId) {
      return options.extractEntityId(args, result);
    }

    if (result && result.id) {
      return result.id;
    }

    if (args.id) {
      return args.id;
    }

    if (args.input && args.input.id) {
      return args.input.id;
    }

    throw new Error(`Cannot extract entity ID for audit log: ${options.entityType}`);
  }

  private extractReason(args: any): string {
    if (args.input && args.input.reason) {
      return args.input.reason;
    }

    if (args.reason) {
      return args.reason;
    }

    throw new Error('Audit reason is required but not provided');
  }

  private determineAction(options: AuditOptions, args: any): AuditAction {
    if (options.action) {
      return options.action;
    }

    if (args.input && args.input.action) {
      return args.input.action;
    }

    const handlerName = args.constructor?.name || 'unknown';
    
    if (handlerName.toLowerCase().includes('create')) {
      return AuditAction.CREATE;
    } else if (handlerName.toLowerCase().includes('update')) {
      return AuditAction.UPDATE;
    } else if (handlerName.toLowerCase().includes('delete') || handlerName.toLowerCase().includes('remove')) {
      return AuditAction.DELETE;
    } else if (handlerName.toLowerCase().includes('approve')) {
      return AuditAction.APPROVE;
    } else if (handlerName.toLowerCase().includes('reject')) {
      return AuditAction.REJECT;
    }

    return AuditAction.UPDATE;
  }

  private extractDetails(args: any, result: any): Record<string, any> {
    return {
      args: this.sanitizeForAudit(args),
      result: this.sanitizeForAudit(result),
    };
  }

  private sanitizeForAudit(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
