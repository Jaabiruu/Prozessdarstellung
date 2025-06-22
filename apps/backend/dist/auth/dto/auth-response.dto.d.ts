import { UserRole } from '@prisma/client';
export declare class AuthUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
}
export declare class AuthResponse {
    user: AuthUser;
    accessToken: string;
}
