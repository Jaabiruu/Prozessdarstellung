import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AuthUser {
  @Field()
  id!: string;

  @Field()
  email!: string;

  @Field({ nullable: true })
  firstName!: string | null;

  @Field({ nullable: true })
  lastName!: string | null;

  @Field(() => String)
  role!: string;
}

@ObjectType()
export class AuthResponse {
  @Field(() => AuthUser)
  user!: AuthUser;

  @Field()
  accessToken!: string;
}
