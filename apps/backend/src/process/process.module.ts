import { Module } from '@nestjs/common';
import { ProcessService } from './process.service';
import { ProcessResolver } from './process.resolver';
import { PrismaModule } from '../database/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [ProcessResolver, ProcessService],
  exports: [ProcessService],
})
export class ProcessModule {}