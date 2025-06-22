import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [UserService, UserResolver],
  exports: [UserService],
})
export class UserModule {}
