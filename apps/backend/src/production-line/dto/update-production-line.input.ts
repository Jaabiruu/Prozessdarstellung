import { InputType, Field, ID } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsNotEmpty, MinLength, MaxLength, IsUUID } from 'class-validator';
import { ProductionLineStatus } from '@prisma/client';

@InputType()
export class UpdateProductionLineInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty({ message: 'Production line ID is required' })
  @IsUUID(4, { message: 'Invalid production line ID format' })
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Production line name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Production line name must not exceed 100 characters' })
  name?: string;

  @Field(() => ProductionLineStatus, { 
    nullable: true,
    description: 'New status of the production line' 
  })
  @IsOptional()
  @IsEnum(ProductionLineStatus, { message: 'Invalid production line status' })
  status?: ProductionLineStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}