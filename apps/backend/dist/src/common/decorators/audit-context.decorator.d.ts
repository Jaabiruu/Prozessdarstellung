export interface AuditContext {
    ipAddress: string | null;
    userAgent: string | null;
}
export declare const AuditContext: (...dataOrPipes: unknown[]) => ParameterDecorator;
