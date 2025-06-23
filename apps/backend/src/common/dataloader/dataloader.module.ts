import { Module } from '@nestjs/common';
import { ProductionLineDataLoader } from './production-line.dataloader';
import { ProcessDataLoader } from './process.dataloader';
import { PrismaModule } from '../../database/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ProductionLineDataLoader, ProcessDataLoader],
  exports: [ProductionLineDataLoader, ProcessDataLoader],
})
export class DataLoaderModule {}
