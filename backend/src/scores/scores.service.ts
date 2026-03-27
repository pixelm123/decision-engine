import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RoomStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EventsGateway } from '../gateway/events.gateway';
import { RoomEvent, AggregatedResultPayload } from '../common/types/events.types';
import { SubmitScoreBatchDto } from './dto/scores.dto';

@Injectable()
export class ScoresService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private eventsGateway: EventsGateway,
  ) {}

  private async assertParticipantInScoringRoom(roomId: string, userId: string) {
    const room = await this.prisma.decisionRoom.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });

    if (!room) throw new NotFoundException('Room not found');
    if (room.status !== RoomStatus.SCORING) {
      throw new BadRequestException('Room is not currently in scoring phase');
    }

    const participant = room.participants.find((p) => p.userId === userId);
    if (!participant) {
      throw new ForbiddenException('You are not a participant in this room');
    }

    return room;
  }

  async submitBatch(roomId: string, userId: string, dto: SubmitScoreBatchDto) {
    const room = await this.assertParticipantInScoringRoom(roomId, userId);
    const roundNumber = room.currentRound;

    const optionIds = [...new Set(dto.scores.map((s) => s.optionId))];
    const criterionIds = [...new Set(dto.scores.map((s) => s.criterionId))];

    const [options, criteria] = await Promise.all([
      this.prisma.option.findMany({ where: { id: { in: optionIds }, roomId } }),
      this.prisma.criterion.findMany({ where: { id: { in: criterionIds }, roomId } }),
    ]);

    if (options.length !== optionIds.length) {
      throw new BadRequestException('One or more options do not belong to this room');
    }
    if (criteria.length !== criterionIds.length) {
      throw new BadRequestException('One or more criteria do not belong to this room');
    }

    const aggregatedResults = await this.prisma.$transaction(async (tx) => {
      for (const score of dto.scores) {
        await tx.score.upsert({
          where: {
            userId_optionId_criterionId_roundNumber: {
              userId,
              optionId: score.optionId,
              criterionId: score.criterionId,
              roundNumber,
            },
          },
          create: {
            userId,
            optionId: score.optionId,
            criterionId: score.criterionId,
            roundNumber,
            value: score.value,
          },
          update: { value: score.value },
        });
      }

      const updatedResults: AggregatedResultPayload[] = [];

      for (const option of options) {
        const weightedScore = await this.calculateWeightedScore(
          tx,
          option.id,
          roundNumber,
          criteria,
        );

        await tx.aggregatedResult.upsert({
          where: {
            roomId_optionId_roundNumber: {
              roomId,
              optionId: option.id,
              roundNumber,
            },
          },
          create: { roomId, optionId: option.id, roundNumber, weightedScore },
          update: { weightedScore, calculatedAt: new Date() },
        });

        updatedResults.push({
          optionId: option.id,
          optionLabel: option.label,
          weightedScore: Number(weightedScore),
          roundNumber,
        });
      }

      return updatedResults;
    });

    await this.auditService.log(roomId, userId, 'scores_submitted', {
      roundNumber,
      scoreCount: dto.scores.length,
    });

    this.eventsGateway.broadcastToRoom(roomId, RoomEvent.SCORING_UPDATED, {
      roomId,
      roundNumber,
      aggregatedResults,
    });

    return { roundNumber, aggregatedResults };
  }

  private async calculateWeightedScore(
    tx: any,
    optionId: string,
    roundNumber: number,
    criteria: Array<{ id: string; weight: any }>,
  ): Promise<number> {
    let weightedSum = 0;

    for (const criterion of criteria) {
      const scores = await tx.score.findMany({
        where: { optionId, criterionId: criterion.id, roundNumber },
        select: { value: true },
      });

      if (scores.length === 0) continue;

      const avgScore = scores.reduce((sum, s) => sum + s.value, 0) / scores.length;
      weightedSum += avgScore * Number(criterion.weight);
    }

    return Math.round(weightedSum * 10000) / 10000;
  }

  async getResults(roomId: string, roundNumber?: number) {
    const room = await this.prisma.decisionRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');

    const targetRound = roundNumber ?? room.currentRound;

    return this.prisma.aggregatedResult.findMany({
      where: { roomId, roundNumber: targetRound },
      include: { option: { select: { id: true, label: true, description: true } } },
      orderBy: { weightedScore: 'desc' },
    });
  }

  async getSubmissionStatus(roomId: string, roundNumber?: number) {
    const room = await this.prisma.decisionRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: { user: { select: { id: true, displayName: true, email: true } } },
        },
      },
    });
    if (!room) throw new NotFoundException('Room not found');

    const targetRound = roundNumber ?? room.currentRound;
    const [optionCount, criteriaCount] = await Promise.all([
      this.prisma.option.count({ where: { roomId } }),
      this.prisma.criterion.count({ where: { roomId } }),
    ]);
    const expectedScores = optionCount * criteriaCount;

    return Promise.all(
      room.participants.map(async (p) => {
        const scoreCount = await this.prisma.score.count({
          where: { userId: p.userId, option: { roomId }, roundNumber: targetRound },
        });
        return {
          userId: p.userId,
          displayName: p.user.displayName ?? p.user.email,
          role: p.role,
          submitted: expectedScores > 0 && scoreCount >= expectedScores,
        };
      }),
    );
  }

  async getBreakdown(roomId: string, roundNumber?: number) {
    const room = await this.prisma.decisionRoom.findUnique({ where: { id: roomId } });
    if (!room) throw new NotFoundException('Room not found');

    const targetRound = roundNumber ?? room.currentRound;
    const [options, criteria] = await Promise.all([
      this.prisma.option.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.criterion.findMany({ where: { roomId }, orderBy: { order: 'asc' } }),
    ]);

    const breakdown = await Promise.all(
      criteria.map(async (c) => {
        const scores = await Promise.all(
          options.map(async (o) => {
            const rawScores = await this.prisma.score.findMany({
              where: { criterionId: c.id, optionId: o.id, roundNumber: targetRound },
              select: { value: true },
            });
            const avg =
              rawScores.length > 0
                ? Math.round((rawScores.reduce((sum, s) => sum + s.value, 0) / rawScores.length) * 100) / 100
                : null;
            return { optionId: o.id, avg };
          }),
        );
        return {
          criterionId: c.id,
          criterionLabel: c.label,
          weight: Number(c.weight),
          scores,
        };
      }),
    );

    return {
      options: options.map((o) => ({ id: o.id, label: o.label })),
      criteria: breakdown,
    };
  }

  async getMyScores(roomId: string, userId: string, roundNumber?: number) {
    const room = await this.prisma.decisionRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) throw new NotFoundException('Room not found');

    const targetRound = roundNumber ?? room.currentRound;

    return this.prisma.score.findMany({
      where: {
        option: { roomId },
        userId,
        roundNumber: targetRound,
      },
      include: {
        option: { select: { id: true, label: true } },
        criterion: { select: { id: true, label: true, weight: true } },
      },
    });
  }
}
