import { Controller, Get, Post } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { HealthService } from './health.service';
import { CacheWarmingService } from '../common/cache/cache-warming.service';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly healthService: HealthService,
    private readonly cacheWarmingService: CacheWarmingService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.healthService.checkDatabase(),
      () => this.healthService.checkRedis(),
      () => this.healthService.checkElasticsearch(),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.healthService.checkDatabase(),
      () => this.healthService.checkRedis(),
    ]);
  }

  @Get('live')
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'pharmaceutical-backend',
    };
  }

  @Get('cache/metrics')
  @HealthCheck()
  cacheMetrics() {
    return this.health.check([() => this.healthService.getCacheMetrics()]);
  }

  @Post('cache/warm')
  async warmCache() {
    return await this.cacheWarmingService.manualWarm();
  }
}
