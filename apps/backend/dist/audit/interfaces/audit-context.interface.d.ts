import { AuditAction } from '../../common/enums/user-role.enum';
export interface AuditContext {
    readonly userId: string;
    readonly action: AuditAction;
    readonly entityType: string;
    readonly entityId: string;
    readonly reason: string;
    readonly ipAddress?: string | null;
    readonly userAgent?: string | null;
    readonly details?: Record<string, any> | null;
}
export interface AuditOptions {
    readonly entityType: string;
    readonly action?: AuditAction;
    readonly includeDetails?: boolean;
    readonly extractEntityId?: (args: any[], result?: any) => string;
}
