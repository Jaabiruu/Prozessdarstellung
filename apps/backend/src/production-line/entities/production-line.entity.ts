import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { ProductionLineStatus } from '@prisma/client';
import { User } from '../../user/entities/user.entity';

// Import Process entity
import { Process } from '../../process/entities/process.entity';

// Register the enum for GraphQL
registerEnumType(ProductionLineStatus, {
  name: 'ProductionLineStatus',
  description: 'Status of the production line',
});

@ObjectType()
export class ProductionLine {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field(() => ProductionLineStatus)
  status!: ProductionLineStatus;

  @Field(() => Int)
  version!: number;

  @Field()
  isActive!: boolean;

  @Field(() => ID, { nullable: true })
  parentId?: string | null;

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

  @Field(() => [Process], { nullable: true })
  processes?: Process[];

  @Field(() => Int, { nullable: true })
  processCount?: number;

  // For Prisma includes with _count
  _count?: {
    processes: number;
  };
}
