import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TracingService } from '../tracing/tracing.service';
import { TRACE_OPERATION_KEY } from '../decorators/trace-operation.decorator';
import { SpanKind } from '@opentelemetry/api';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(
    private readonly tracingService: TracingService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Only trace GraphQL operations
    if (context.getType<'graphql'>() !== 'graphql') {
      return next.handle();
    }

    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo();
    const request = gqlContext.getContext().req;
    const user = request.user;

    // Get operation name from decorator or use field name
    const customOperationName = this.reflector.get<string>(
      TRACE_OPERATION_KEY,
      context.getHandler(),
    );
    
    const operationName = customOperationName || `${info.operation.operation}.${info.fieldName}`;
    const operationType = info.operation.operation; // query, mutation, subscription

    return new Observable((observer) => {
      this.tracingService.traceOperation(
        operationName,
        async (span) => {
          // Add business context to the span
          this.tracingService.addBusinessContext({
            userId: user?.id,
            userRole: user?.role,
            operation: customOperationName || operationName,
            entityType: this.extractEntityType(info.fieldName),
            ip: request.ip,
            userAgent: request.headers['user-agent'],
          });

          // Add GraphQL specific attributes
          span.setAttributes({
            'graphql.operation.type': operationType,
            'graphql.operation.name': info.fieldName,
            'graphql.document': info.fieldName, // Could add full query if needed
          });

          // Execute the actual operation
          const subscription = next.handle().subscribe({
            next: (value) => {
              // Add result metadata if useful
              if (value && typeof value === 'object') {
                if (value.id) {
                  span.setAttribute('entity.id', value.id);
                }
                if (Array.isArray(value)) {
                  span.setAttribute('result.count', value.length);
                }
              }
              observer.next(value);
            },
            error: (error) => {
              // Error handling is done by traceOperation
              observer.error(error);
            },
            complete: () => {
              observer.complete();
            },
          });

          // Return a promise that resolves when the subscription completes
          return new Promise<any>((resolve, reject) => {
            subscription.add(() => resolve(undefined));
          });
        },
        { kind: SpanKind.SERVER }
      ).then(() => {
        // Operation completed successfully
      }).catch((error) => {
        // Error was already handled by traceOperation
        throw error;
      });
    });
  }

  private extractEntityType(fieldName: string): string {
    // Extract entity type from field name
    // e.g., 'createProcess' -> 'Process', 'processes' -> 'Process'
    if (fieldName.startsWith('create')) {
      return fieldName.substring(6); // Remove 'create'
    }
    if (fieldName.startsWith('update')) {
      return fieldName.substring(6); // Remove 'update'
    }
    if (fieldName.startsWith('delete') || fieldName.startsWith('remove')) {
      return fieldName.substring(6); // Remove 'delete' or 'remove'
    }
    if (fieldName.endsWith('s')) {
      return fieldName.slice(0, -1); // Remove plural 's'
    }
    return fieldName;
  }
}