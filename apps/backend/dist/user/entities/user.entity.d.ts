import { UserRole } from '@prisma/client';
export declare class User {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
