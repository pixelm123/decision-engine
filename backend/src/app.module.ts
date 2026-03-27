import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { ParticipantsModule } from './participants/participants.module';
import { OptionsModule } from './options/options.module';
import { CriteriaModule } from './criteria/criteria.module';
import { ScoresModule } from './scores/scores.module';
import { GatewayModule } from './gateway/gateway.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    RoomsModule,
    ParticipantsModule,
    OptionsModule,
    CriteriaModule,
    ScoresModule,
    GatewayModule,
    AuditModule,
  ],
})
export class AppModule {}
