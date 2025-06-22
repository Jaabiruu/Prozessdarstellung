import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserRole } from '@prisma/client';
import { User as PrismaUser } from '@prisma/client';
export declare class UserResolver {
    private readonly userService;
    constructor(userService: UserService);
    createUser(createUserInput: CreateUserInput, currentUser: PrismaUser, context: any): Promise<User>;
    users(limit: number, offset: number, isActive?: boolean, role?: UserRole): Promise<User[]>;
    user(id: string): Promise<User>;
    me(currentUser: PrismaUser): Promise<User>;
    updateUser(updateUserInput: UpdateUserInput, currentUser: PrismaUser, context: any): Promise<User>;
    deactivateUser(id: string, reason: string, currentUser: PrismaUser, context: any): Promise<User>;
    changePassword(userId: string, newPassword: string, reason: string, currentUser: PrismaUser, context: any): Promise<boolean>;
}
