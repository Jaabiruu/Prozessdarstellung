import { IsString, IsEnum, IsOptional, IsJSON } from 'class-validator';
import { AuditAction } from '../../common/enums/user-role.enum';

export class CreateAuditLogDto {
  @IsString()
  userId!: string;

  @IsEnum(AuditAction)
  action!: AuditAction;

  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  ipAddress?: string | null;

  @IsOptional()
  @IsString()
  userAgent?: string | null;

  @IsOptional()
  @IsJSON()
  details?: Record<string, any> | null;
}
