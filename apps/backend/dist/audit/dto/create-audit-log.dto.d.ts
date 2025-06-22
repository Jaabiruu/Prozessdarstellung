import { AuditAction } from '../../common/enums/user-role.enum';
export declare class CreateAuditLogDto {
    userId: string;
    action: AuditAction;
    entityType: string;
    entityId: string;
    reason: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    details?: Record<string, any> | null;
}
