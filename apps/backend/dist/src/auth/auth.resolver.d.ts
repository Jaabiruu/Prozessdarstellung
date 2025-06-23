import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth-response.dto';
import type { AuditContext as AuditContextType } from '../common/decorators/audit-context.decorator';
import { User } from '@prisma/client';
import { GraphQLContext } from '../common/interfaces/graphql-context.interface';
export declare class AuthResolver {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginInput: LoginInput, auditContext: AuditContextType): Promise<AuthResponse>;
    logout(user: User, context: GraphQLContext, auditContext: AuditContextType): Promise<boolean>;
}
