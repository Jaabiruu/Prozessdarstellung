import { Module } from '@nestjs/common';
import { ProductionLineService } from './production-line.service';
import { ProductionLineResolver } from './production-line.resolver';
import { PrismaModule } from '../database/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [ProductionLineResolver, ProductionLineService],
  exports: [ProductionLineService],
})
export class ProductionLineModule {}
