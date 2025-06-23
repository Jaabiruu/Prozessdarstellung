import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TracingService } from './tracing.service';
import tracingConfig from './tracing.config';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(tracingConfig),
  ],
  providers: [TracingService],
  exports: [TracingService],
})
export class TracingModule {}