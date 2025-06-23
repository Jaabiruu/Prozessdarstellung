import { AuditAction } from '../../common/enums/user-role.enum';
interface AuditDetails {
    changes?: Record<string, unknown>;
    previousValues?: Record<string, unknown>;
    [key: string]: unknown;
}
export interface AuditContext {
    readonly userId: string;
    readonly action: AuditAction;
    readonly entityType: string;
    readonly entityId: string;
    readonly reason: string;
    readonly ipAddress?: string | null;
    readonly userAgent?: string | null;
    readonly details?: AuditDetails | null;
}
export interface AuditOptions {
    readonly entityType: string;
    readonly action?: AuditAction;
    readonly includeDetails?: boolean;
    readonly extractEntityId?: (args: Record<string, unknown>, result?: unknown) => string;
}
export {};
