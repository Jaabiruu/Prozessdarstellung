import { AuditAction } from '../../common/enums/user-role.enum';
interface AuditDetails {
    changes?: Record<string, unknown>;
    previousValues?: Record<string, unknown>;
    [key: string]: unknown;
}
export declare class CreateAuditLogDto {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    reason: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    details?: AuditDetails | null;
}
export {};
