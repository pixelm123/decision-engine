import { Module } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';
import { AuditModule } from '../audit/audit.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [AuditModule, GatewayModule],
  providers: [ParticipantsService],
  controllers: [ParticipantsController],
})
export class ParticipantsModule {}
