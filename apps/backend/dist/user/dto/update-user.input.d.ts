import { UserRole } from '@prisma/client';
export declare class UpdateUserInput {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    isActive?: boolean;
    reason: string;
}
