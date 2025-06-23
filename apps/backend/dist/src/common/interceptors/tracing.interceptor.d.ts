import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { TracingService } from '../tracing/tracing.service';
export declare class TracingInterceptor implements NestInterceptor {
    private readonly tracingService;
    private readonly reflector;
    constructor(tracingService: TracingService, reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private extractEntityType;
}
