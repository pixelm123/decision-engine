import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../gateway/events.gateway';
import { RoomEvent } from '../common/types/events.types';
import { CreateRoomDto, UpdateRoomStatusDto } from './dto/rooms.dto';

// Valid state machine transitions
const ALLOWED_TRANSITIONS: Record<RoomStatus, RoomStatus[]> = {
  OPEN: [RoomStatus.SCORING],
  SCORING: [RoomStatus.REVIEWING],
  REVIEWING: [RoomStatus.FINALIZED, RoomStatus.SCORING],
  FINALIZED: [],
};

@Injectable()
export class RoomsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {}

  async create(hostId: string, dto: CreateRoomDto) {
    const room = await this.prisma.decisionRoom.create({
      data: {
        title: dto.title,
        description: dto.description,
        hostId,
        participants: {
          create: {
            userId: hostId,
            role: 'HOST',
          },
        },
      },
      include: { participants: true },
    });

    await this.auditService.log(room.id, hostId, 'room_created', {
      title: dto.title,
    });

    return room;
  }

  async findAllForUser(userId: string) {
    return this.prisma.decisionRoom.findMany({
      where: {
        participants: { some: { userId } },
      },
      include: {
        _count: { select: { participants: true, options: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(roomId: string, userId: string) {
    const room = await this.prisma.decisionRoom.findUnique({
      where: { id: roomId },
      include: {
        options: { orderBy: { createdAt: 'asc' } },
        criteria: { orderBy: { order: 'asc' } },
        participants: {
          include: {
            user: { select: { id: true, email: true, displayName: true } },
          },
        },
      },
    });

    if (!room) throw new NotFoundException('Room not found');

    const isMember = room.participants.some((p) => p.userId === userId);
    if (!isMember) throw new ForbiddenException('You are not a member of this room');

    return room;
  }

  async updateStatus(roomId: string, hostId: string, dto: UpdateRoomStatusDto) {
    const room = await this.prisma.decisionRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only the host can change room status');
    }

    const allowed = ALLOWED_TRANSITIONS[room.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${room.status} to ${dto.status}`,
      );
    }

    // Increment round when moving back to SCORING from REVIEWING
    const incrementRound =
      room.status === RoomStatus.REVIEWING && dto.status === RoomStatus.SCORING;

    const updated = await this.prisma.decisionRoom.update({
      where: { id: roomId },
      data: {
        status: dto.status,
        ...(incrementRound && { currentRound: { increment: 1 } }),
      },
    });

    await this.auditService.log(roomId, hostId, 'status_changed', {
      from: room.status,
      to: dto.status,
      round: updated.currentRound,
    });

    // Broadcast lifecycle events
    if (dto.status === RoomStatus.REVIEWING) {
      const results = await this.prisma.aggregatedResult.findMany({
        where: { roomId, roundNumber: room.currentRound },
        include: { option: { select: { id: true, label: true } } },
        orderBy: { weightedScore: 'desc' },
      });
      this.eventsGateway.broadcastToRoom(roomId, RoomEvent.ROUND_CLOSED, {
        roomId,
        roundNumber: room.currentRound,
        finalResults: results.map((r) => ({
          optionId: r.optionId,
          optionLabel: r.option.label,
          weightedScore: Number(r.weightedScore),
          roundNumber: r.roundNumber,
        })),
      });
    }

    if (dto.status === RoomStatus.FINALIZED) {
      const allResults = await this.prisma.aggregatedResult.findMany({
        where: { roomId, roundNumber: room.currentRound },
        include: { option: { select: { id: true, label: true } } },
        orderBy: { weightedScore: 'desc' },
      });
      const mapped = allResults.map((r) => ({
        optionId: r.optionId,
        optionLabel: r.option.label,
        weightedScore: Number(r.weightedScore),
        roundNumber: r.roundNumber,
      }));
      this.eventsGateway.broadcastToRoom(roomId, RoomEvent.ROOM_FINALIZED, {
        roomId,
        winner: mapped[0] ?? null,
        allResults: mapped,
      });
    }

    return updated;
  }

  async getAuditLog(roomId: string, hostId: string) {
    const room = await this.prisma.decisionRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');
    if (room.hostId !== hostId) {
      throw new ForbiddenException('Only the host can view the audit log');
    }

    return this.prisma.auditLog.findMany({
      where: { roomId },
      include: {
        user: { select: { id: true, email: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
