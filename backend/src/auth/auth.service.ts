import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, GuestJoinDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName ?? dto.email.split('@')[0],
      },
    });

    return this.issueToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueToken(user.id, user.email);
  }

  // Participants join a room via a shareable link without full registration.
  // A guest User record is created and a room-scoped JWT is issued.
  async guestJoin(roomId: string, dto: GuestJoinDto) {
    const room = await this.prisma.decisionRoom.findUnique({
      where: { id: roomId },
    });
    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const guestEmail = `guest_${Date.now()}_${Math.random().toString(36).slice(2)}@guest.local`;
    const user = await this.prisma.user.create({
      data: {
        email: guestEmail,
        passwordHash: '',
        displayName: dto.displayName,
      },
    });

    const participant = await this.prisma.participant.create({
      data: {
        roomId,
        userId: user.id,
        role: 'PARTICIPANT',
      },
    });

    const token = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        roomId,
        role: participant.role,
      },
      { expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d') },
    );

    return {
      accessToken: token,
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
      },
      roomId,
      role: participant.role,
    };
  }

  private issueToken(userId: string, email: string) {
    const token = this.jwtService.sign(
      { sub: userId, email },
      { expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d') },
    );
    return { accessToken: token };
  }
}
