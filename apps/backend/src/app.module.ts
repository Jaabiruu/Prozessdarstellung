import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { TerminusModule } from '@nestjs/terminus';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Request, Response } from 'express';
import { HealthModule } from './health';
import { ConfigModule, ConfigService } from './config';
import { PrismaModule } from './database';
import { AuthModule, JwtAuthGuard } from './auth';
import { AuditModule } from './audit';
import { UserModule } from './user';
import { ProductionLineModule } from './production-line';
import { ProcessModule } from './process';
import { DataLoaderModule } from './common/dataloader/dataloader.module';
import { CacheModule } from './common/cache/cache.module';
import { TracingModule } from './common/tracing/tracing.module';
import { TracingInterceptor } from './common/interceptors/tracing.interceptor';
import { ProductionLineDataLoader } from './common/dataloader/production-line.dataloader';
import { ProcessDataLoader } from './common/dataloader/process.dataloader';
import { PrismaService } from './database/prisma.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 5, // 5 requests per minute per IP
      },
    ]),
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService, PrismaService],
      useFactory: (
        configService: ConfigService,
        prismaService: PrismaService,
      ) => ({
        autoSchemaFile: true,
        sortSchema: true,
        playground: configService.isDevelopment,
        introspection: true,
        context: ({ req, res }: { req: Request; res: Response }) => {
          const productionLineDataLoader = new ProductionLineDataLoader(
            prismaService,
          );
          const processDataLoader = new ProcessDataLoader(prismaService);

          return {
            req,
            res,
            dataloaders: {
              productionLineLoader:
                productionLineDataLoader.createProductionLineLoader(),
              processLoader: processDataLoader.createProcessLoader(),
              userLoader: processDataLoader.createUserLoader(),
              processesByProductionLineLoader:
                productionLineDataLoader.createProcessesByProductionLineLoader(),
            },
          };
        },
        cors: {
          origin: configService.isDevelopment,
          credentials: true,
        },
      }),
    }),
    TerminusModule,
    HealthModule,
    AuthModule,
    AuditModule,
    UserModule,
    ProductionLineModule,
    ProcessModule,
    DataLoaderModule,
    CacheModule,
    TracingModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
    // TODO: Re-enable ThrottlerGuard after resolving dependency injection in testing
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}
