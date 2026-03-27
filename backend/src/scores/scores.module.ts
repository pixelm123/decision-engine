import { Module } from '@nestjs/common';
import { ScoresService } from './scores.service';
import { ScoresController } from './scores.controller';
import { AuditModule } from '../audit/audit.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [AuditModule, GatewayModule],
  providers: [ScoresService],
  controllers: [ScoresController],
})
export class ScoresModule {}
