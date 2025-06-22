export declare class AuthUser {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
}
export declare class AuthResponse {
    user: AuthUser;
    accessToken: string;
}
