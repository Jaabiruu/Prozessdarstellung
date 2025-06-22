import { UserRole } from '@prisma/client';
export declare class CreateUserInput {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    reason: string;
}
