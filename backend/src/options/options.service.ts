import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateOptionDto, UpdateOptionDto } from './dto/options.dto';

@Injectable()
export class OptionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private async assertHost(roomId: string, userId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant || participant.role !== 'HOST') {
      throw new ForbiddenException('Only the host can manage options');
    }
  }

  async create(roomId: string, userId: string, dto: CreateOptionDto) {
    await this.assertHost(roomId, userId);

    const option = await this.prisma.option.create({
      data: {
        roomId,
        label: dto.label,
        description: dto.description,
      },
    });

    await this.auditService.log(roomId, userId, 'option_created', {
      optionId: option.id,
      label: option.label,
    });

    return option;
  }

  async findAll(roomId: string) {
    return this.prisma.option.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(roomId: string, optionId: string, userId: string, dto: UpdateOptionDto) {
    await this.assertHost(roomId, userId);

    const option = await this.prisma.option.findFirst({
      where: { id: optionId, roomId },
    });
    if (!option) throw new NotFoundException('Option not found');

    return this.prisma.option.update({
      where: { id: optionId },
      data: dto,
    });
  }

  async remove(roomId: string, optionId: string, userId: string) {
    await this.assertHost(roomId, userId);

    const option = await this.prisma.option.findFirst({
      where: { id: optionId, roomId },
    });
    if (!option) throw new NotFoundException('Option not found');

    await this.auditService.log(roomId, userId, 'option_deleted', {
      optionId,
      label: option.label,
    });

    return this.prisma.option.delete({ where: { id: optionId } });
  }
}
