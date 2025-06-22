import { ObjectType, Field, ID, Int, Float, registerEnumType } from '@nestjs/graphql';
import { ProcessStatus } from '@prisma/client';
import { User } from '../../user/entities/user.entity';

// Import ProductionLine entity  
import { ProductionLine } from '../../production-line/entities/production-line.entity';

// Register the enum for GraphQL
registerEnumType(ProcessStatus, {
  name: 'ProcessStatus',
  description: 'Status of the process',
});

@ObjectType()
export class Process {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string | null;

  @Field(() => Int, { nullable: true })
  duration?: number | null;

  @Field(() => Float)
  progress!: number;

  @Field(() => ProcessStatus)
  status!: ProcessStatus;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field()
  color!: string;

  @Field(() => Int)
  version!: number;

  @Field()
  isActive!: boolean;

  @Field(() => ID, { nullable: true })
  parentId?: string | null;

  @Field(() => ID)
  productionLineId!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field(() => ID)
  createdBy!: string;

  @Field()
  reason!: string;

  // Relations - will be resolved by GraphQL resolvers
  @Field(() => User, { nullable: true })
  creator?: User;

  @Field(() => ProductionLine, { nullable: true })
  productionLine?: ProductionLine;
}