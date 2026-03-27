import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateCriterionDto,
  UpdateCriterionDto,
  ReorderCriteriaDto,
} from './dto/criteria.dto';

const WEIGHT_SUM_TOLERANCE = 0.001;

@Injectable()
export class CriteriaService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private async assertHost(roomId: string, userId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant || participant.role !== 'HOST') {
      throw new ForbiddenException('Only the host can manage criteria');
    }
  }

  // Validate that all criteria weights for a room sum to exactly 1 (±tolerance)
  private async validateWeightsSum(roomId: string, excludeId?: string) {
    const criteria = await this.prisma.criterion.findMany({
      where: { roomId, ...(excludeId && { id: { not: excludeId } }) },
      select: { weight: true },
    });

    const sum = criteria.reduce(
      (acc, c) => acc + Number(c.weight),
      0,
    );

    if (criteria.length > 0 && Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
      throw new BadRequestException(
        `Criteria weights must sum to 1. Current sum after this change: ${sum.toFixed(4)}`,
      );
    }
  }

  async create(roomId: string, userId: string, dto: CreateCriterionDto) {
    await this.assertHost(roomId, userId);

    const existingCount = await this.prisma.criterion.count({ where: { roomId } });

    const criterion = await this.prisma.criterion.create({
      data: {
        roomId,
        label: dto.label,
        weight: dto.weight,
        order: dto.order ?? existingCount,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
      },
    });

    // Weight sum is validated on submission, not on creation — allows building up criteria progressively
    await this.auditService.log(roomId, userId, 'criterion_created', {
      criterionId: criterion.id,
      label: criterion.label,
      weight: dto.weight,
    });

    return criterion;
  }

  async findAll(roomId: string) {
    return this.prisma.criterion.findMany({
      where: { roomId },
      orderBy: { order: 'asc' },
    });
  }

  async update(
    roomId: string,
    criterionId: string,
    userId: string,
    dto: UpdateCriterionDto,
  ) {
    await this.assertHost(roomId, userId);

    const criterion = await this.prisma.criterion.findFirst({
      where: { id: criterionId, roomId },
    });
    if (!criterion) throw new NotFoundException('Criterion not found');

    return this.prisma.criterion.update({
      where: { id: criterionId },
      data: {
        ...dto,
        ...(dto.config !== undefined && { config: dto.config as Prisma.InputJsonValue }),
      },
    });
  }

  async remove(roomId: string, criterionId: string, userId: string) {
    await this.assertHost(roomId, userId);

    const criterion = await this.prisma.criterion.findFirst({
      where: { id: criterionId, roomId },
    });
    if (!criterion) throw new NotFoundException('Criterion not found');

    await this.auditService.log(roomId, userId, 'criterion_deleted', {
      criterionId,
      label: criterion.label,
    });

    return this.prisma.criterion.delete({ where: { id: criterionId } });
  }

  // Bulk reorder after drag-and-drop — updates `order` field for all affected criteria
  async reorder(roomId: string, userId: string, dto: ReorderCriteriaDto) {
    await this.assertHost(roomId, userId);

    await this.prisma.$transaction(
      dto.order.map(({ id, order }) =>
        this.prisma.criterion.update({
          where: { id },
          data: { order },
        }),
      ),
    );

    return this.findAll(roomId);
  }

  // Called before scoring begins — enforces that weights are valid
  async validateWeights(roomId: string) {
    const criteria = await this.prisma.criterion.findMany({
      where: { roomId },
      select: { weight: true },
    });

    if (criteria.length === 0) {
      throw new BadRequestException('Room has no criteria');
    }

    const sum = criteria.reduce((acc, c) => acc + Number(c.weight), 0);

    if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
      throw new BadRequestException(
        `Criteria weights must sum to 1. Current sum: ${sum.toFixed(4)}`,
      );
    }

    return { valid: true, sum };
  }
}
