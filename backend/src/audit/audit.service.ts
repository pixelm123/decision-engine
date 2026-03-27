import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(roomId: string, userId: string, action: string, metadata: Record<string, unknown> = {}) {
    try {
      await this.prisma.auditLog.create({
        data: { roomId, userId, action, metadata: metadata as Prisma.InputJsonValue },
      });
    } catch (err) {
      // Audit log failures must never break the main flow
      this.logger.error(`Failed to write audit log: ${action}`, err);
    }
  }
}
