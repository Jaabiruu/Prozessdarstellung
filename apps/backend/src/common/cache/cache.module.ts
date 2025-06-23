import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheService } from './cache.service';
import { CacheWarmingService } from './cache-warming.service';
import { ConfigModule } from '../../config/config.module';
import { PrismaModule } from '../../database/prisma.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: false,
    }),
  ],
  providers: [CacheService, CacheWarmingService],
  exports: [CacheService, CacheWarmingService],
})
export class CacheModule {}
