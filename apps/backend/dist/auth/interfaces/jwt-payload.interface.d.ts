import { UserRole } from '@prisma/client';
export interface JwtPayload {
    readonly sub: string;
    readonly email: string;
    readonly role: UserRole;
    readonly jti: string;
    readonly iat: number;
    readonly exp: number;
}
export interface AuthenticationResult {
    readonly user: {
        readonly id: string;
        readonly email: string;
        readonly firstName: string | null;
        readonly lastName: string | null;
        readonly role: UserRole;
    };
    readonly accessToken: string;
}
