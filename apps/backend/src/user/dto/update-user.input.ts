import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum, IsBoolean, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

@InputType()
export class UpdateUserInput {
  @Field()
  @IsString()
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  role?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Reason is required for user updates (GxP compliance)' })
  reason!: string;
}
