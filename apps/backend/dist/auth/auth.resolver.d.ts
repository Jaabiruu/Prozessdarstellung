import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth-response.dto';
import { User } from '@prisma/client';
export declare class AuthResolver {
    private readonly authService;
    constructor(authService: AuthService);
    login(loginInput: LoginInput, context: any): Promise<AuthResponse>;
    logout(user: User, context: any): Promise<boolean>;
}
