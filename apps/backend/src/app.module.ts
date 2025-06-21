import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TerminusModule } from '@nestjs/terminus';
import { HealthModule } from './health';
import { ConfigModule, ConfigService } from './config';
import { PrismaModule } from './database';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: true,
        sortSchema: true,
        playground: configService.isDevelopment,
        introspection: true,
        context: ({ req, res }: { req: any; res: any }) => ({ req, res }),
        cors: {
          origin: configService.isDevelopment,
          credentials: true,
        },
      }),
    }),
    TerminusModule,
    HealthModule,
  ],
})
export class AppModule {}