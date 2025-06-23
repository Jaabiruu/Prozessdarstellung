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
import { Request } from 'express';
import { AuditService } from './audit.service';
import {
  AuditOptions,
  AuditContext,
} from './interfaces/audit-context.interface';
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

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditOptions = this.reflector.get<AuditOptions>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const gqlContext = GqlExecutionContext.create(context);
    const request = gqlContext.getContext().req as Request & { user: User };
    const user: User = request.user;
    const args = gqlContext.getArgs() as Record<string, unknown>;

    if (!user) {
      this.logger.warn('Audit interceptor: No user found in request context');
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result: unknown) => {
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
    args: Record<string, unknown>,
    result: unknown,
    request: Request,
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
      ipAddress:
        request.ip ||
        (request as unknown as { connection?: { remoteAddress?: string } })
          .connection?.remoteAddress ||
        null,
      userAgent: request.get('user-agent') || null,
      details: options.includeDetails
        ? this.extractDetails(args, result)
        : null,
    };

    await this.auditService.createFromContext(auditContext);
  }

  private extractEntityId(
    options: AuditOptions,
    args: Record<string, unknown>,
    result: unknown,
  ): string {
    if (options.extractEntityId) {
      return options.extractEntityId(args, result);
    }

    if (
      result &&
      typeof result === 'object' &&
      result !== null &&
      'id' in result
    ) {
      return (result as { id: string }).id;
    }

    if (args.id && typeof args.id === 'string') {
      return args.id;
    }

    if (
      args.input &&
      typeof args.input === 'object' &&
      args.input !== null &&
      'id' in args.input
    ) {
      return (args.input as { id: string }).id;
    }

    throw new Error(
      `Cannot extract entity ID for audit log: ${options.entityType}`,
    );
  }

  private extractReason(args: Record<string, unknown>): string {
    if (
      args.input &&
      typeof args.input === 'object' &&
      args.input !== null &&
      'reason' in args.input
    ) {
      const reason = (args.input as { reason: unknown }).reason;
      if (typeof reason === 'string') {
        return reason;
      }
    }

    if (args.reason && typeof args.reason === 'string') {
      return args.reason;
    }

    throw new Error('Audit reason is required but not provided');
  }

  private determineAction(
    options: AuditOptions,
    args: Record<string, unknown>,
  ): AuditAction {
    if (options.action) {
      return options.action;
    }

    if (
      args.input &&
      typeof args.input === 'object' &&
      args.input !== null &&
      'action' in args.input
    ) {
      const action = (args.input as { action: unknown }).action;
      if (
        typeof action === 'string' &&
        Object.values(AuditAction).includes(action as AuditAction)
      ) {
        return action as AuditAction;
      }
    }

    const handlerName = args.constructor?.name || 'unknown';

    if (handlerName.toLowerCase().includes('create')) {
      return AuditAction.CREATE;
    } else if (handlerName.toLowerCase().includes('update')) {
      return AuditAction.UPDATE;
    } else if (
      handlerName.toLowerCase().includes('delete') ||
      handlerName.toLowerCase().includes('remove')
    ) {
      return AuditAction.DELETE;
    } else if (handlerName.toLowerCase().includes('approve')) {
      return AuditAction.APPROVE;
    } else if (handlerName.toLowerCase().includes('reject')) {
      return AuditAction.REJECT;
    }

    return AuditAction.UPDATE;
  }

  private extractDetails(
    args: Record<string, unknown>,
    result: unknown,
  ): Record<string, unknown> {
    return {
      args: this.sanitizeForAudit(args),
      result: this.sanitizeForAudit(result),
    };
  }

  private sanitizeForAudit(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...(data as Record<string, unknown>) };

    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    for (const field of sensitiveFields) {
      if (field in sanitized && sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
