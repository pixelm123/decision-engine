import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ParticipantsService } from './participants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('rooms/:roomId/participants')
export class ParticipantsController {
  constructor(private participantsService: ParticipantsService) {}

  @Get()
  getParticipants(@Param('roomId') roomId: string) {
    return this.participantsService.getParticipants(roomId);
  }

  // Called by the client after receiving the guest JWT to announce their presence
  @Post('announce')
  announce(
    @Param('roomId') roomId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.participantsService.notifyJoined(roomId, user.userId);
  }
}
