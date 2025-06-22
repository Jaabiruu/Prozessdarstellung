import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsEnum, IsOptional, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { ProductionLineStatus } from '@prisma/client';

@InputType()
export class CreateProductionLineInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Production line name is required' })
  @MinLength(2, { message: 'Production line name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Production line name must not exceed 100 characters' })
  name!: string;

  @Field(() => ProductionLineStatus, { 
    nullable: true, 
    defaultValue: ProductionLineStatus.ACTIVE,
    description: 'Initial status of the production line' 
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