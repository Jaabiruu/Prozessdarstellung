import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { User, UserRole } from '@prisma/client';
export declare class UserService {
    private readonly prisma;
    private readonly auditService;
    private readonly logger;
    constructor(prisma: PrismaService, auditService: AuditService);
    create(createUserInput: CreateUserInput, currentUserId: string, ipAddress?: string, userAgent?: string): Promise<User>;
    findAll(options?: {
        limit?: number;
        offset?: number;
        isActive?: boolean;
        role?: UserRole;
    }): Promise<User[]>;
    findOne(id: string): Promise<User>;
    update(updateUserInput: UpdateUserInput, currentUserId: string, currentUserRole: UserRole, ipAddress?: string, userAgent?: string): Promise<User>;
    deactivate(id: string, reason: string, currentUserId: string, ipAddress?: string, userAgent?: string): Promise<User>;
    changePassword(userId: string, newPassword: string, reason: string, currentUserId: string, ipAddress?: string, userAgent?: string): Promise<boolean>;
}
