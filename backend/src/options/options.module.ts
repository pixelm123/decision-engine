import { Module } from '@nestjs/common';
import { OptionsService } from './options.service';
import { OptionsController } from './options.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [OptionsService],
  controllers: [OptionsController],
})
export class OptionsModule {}
