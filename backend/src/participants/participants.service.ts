import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../gateway/events.gateway';
import { RoomEvent } from '../common/types/events.types';

@Injectable()
export class ParticipantsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {}

  async getParticipants(roomId: string) {
    return this.prisma.participant.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  // Notify the room when a participant joins (called after guestJoin auth flow)
  async notifyJoined(roomId: string, userId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { roomId_userId: { roomId, userId } },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
    });

    if (!participant) throw new NotFoundException('Participant not found');

    await this.auditService.log(roomId, userId, 'participant_joined', {
      displayName: participant.user.displayName,
    });

    this.eventsGateway.broadcastToRoom(roomId, RoomEvent.PARTICIPANT_JOINED, {
      roomId,
      userId: participant.user.id,
      displayName: participant.user.displayName ?? participant.user.email,
      role: participant.role,
    });

    return participant;
  }
}
