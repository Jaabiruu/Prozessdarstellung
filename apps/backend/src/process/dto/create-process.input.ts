import { InputType, Field, ID, Int, Float } from '@nestjs/graphql';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsNotEmpty, 
  MinLength, 
  MaxLength, 
  IsUUID, 
  IsNumber, 
  Min, 
  Max, 
  IsHexColor 
} from 'class-validator';
import { ProcessStatus } from '@prisma/client';

@InputType()
export class CreateProcessInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: 'Process title is required' })
  @MinLength(2, { message: 'Process title must be at least 2 characters long' })
  @MaxLength(100, { message: 'Process title must not exceed 100 characters' })
  title!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Process description must not exceed 1000 characters' })
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Duration must be a valid number' })
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @Max(525600, { message: 'Duration must not exceed 525600 minutes (1 year)' })
  duration?: number;

  @Field(() => Float, { nullable: true, defaultValue: 0.0 })
  @IsOptional()
  @IsNumber({}, { message: 'Progress must be a valid number' })
  @Min(0, { message: 'Progress cannot be negative' })
  @Max(100, { message: 'Progress cannot exceed 100%' })
  progress?: number;

  @Field(() => ProcessStatus, { 
    nullable: true, 
    defaultValue: ProcessStatus.PENDING,
    description: 'Initial status of the process' 
  })
  @IsOptional()
  @IsEnum(ProcessStatus, { message: 'Invalid process status' })
  status?: ProcessStatus;

  @Field(() => Float, { nullable: true, defaultValue: 0.0 })
  @IsOptional()
  @IsNumber({}, { message: 'X coordinate must be a valid number' })
  @Min(-10000, { message: 'X coordinate must be within reasonable bounds' })
  @Max(10000, { message: 'X coordinate must be within reasonable bounds' })
  x?: number;

  @Field(() => Float, { nullable: true, defaultValue: 0.0 })
  @IsOptional()
  @IsNumber({}, { message: 'Y coordinate must be a valid number' })
  @Min(-10000, { message: 'Y coordinate must be within reasonable bounds' })
  @Max(10000, { message: 'Y coordinate must be within reasonable bounds' })
  y?: number;

  @Field({ nullable: true, defaultValue: '#4F46E5' })
  @IsOptional()
  @IsString()
  @IsHexColor({ message: 'Color must be a valid hex color (e.g., #4F46E5)' })
  color?: string;

  @Field(() => ID)
  @IsString()
  @IsNotEmpty({ message: 'Production line ID is required' })
  @IsUUID(4, { message: 'Invalid production line ID format' })
  productionLineId!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason?: string;
}