import { AuditOptions } from '../../audit/interfaces/audit-context.interface';
export declare const AUDIT_METADATA_KEY = "auditMetadata";
export declare const AuditMetadata: (options: AuditOptions) => import("@nestjs/common").CustomDecorator<string>;
export declare const AuditReason: (...dataOrPipes: unknown[]) => ParameterDecorator;
