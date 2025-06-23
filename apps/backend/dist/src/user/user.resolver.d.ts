import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import type { AuditContext as AuditContextType } from '../common/decorators/audit-context.decorator';
import { User as PrismaUser } from '@prisma/client';
export declare class TransactionTestResult {
    success: boolean;
    message: string;
}
export declare class UserResolver {
    private readonly userService;
    constructor(userService: UserService);
    createUser(createUserInput: CreateUserInput, currentUser: PrismaUser, auditContext: AuditContextType): Promise<User>;
    users(limit: number, offset: number, isActive?: boolean, role?: string): Promise<User[]>;
    user(id: string): Promise<User>;
    me(currentUser: PrismaUser): Promise<User>;
    updateUser(updateUserInput: UpdateUserInput, currentUser: PrismaUser, auditContext: AuditContextType): Promise<User>;
    deactivateUser(id: string, reason: string, currentUser: PrismaUser, auditContext: AuditContextType): Promise<User>;
    changePassword(userId: string, newPassword: string, reason: string, currentUser: PrismaUser, auditContext: AuditContextType): Promise<boolean>;
    testTransactionRollback(testUserEmail: string, shouldFail: boolean, currentUser: PrismaUser): Promise<TransactionTestResult>;
}
