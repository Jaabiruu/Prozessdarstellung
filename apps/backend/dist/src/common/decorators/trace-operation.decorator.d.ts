export declare const TRACE_OPERATION_KEY = "trace_operation";
export declare const TraceOperation: (operationName: string) => import("@nestjs/common").CustomDecorator<string>;
export declare const TracingContext: (...dataOrPipes: unknown[]) => ParameterDecorator;
