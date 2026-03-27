import { Module } from '@nestjs/common';
import { CriteriaService } from './criteria.service';
import { CriteriaController } from './criteria.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [CriteriaService],
  controllers: [CriteriaController],
  exports: [CriteriaService],
})
export class CriteriaModule {}
