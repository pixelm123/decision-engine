import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { AuditModule } from '../audit/audit.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [AuditModule, GatewayModule],
  providers: [RoomsService],
  controllers: [RoomsController],
  exports: [RoomsService],
})
export class RoomsModule {}
