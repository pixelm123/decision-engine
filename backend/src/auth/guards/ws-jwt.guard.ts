import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token: string =
      client.handshake?.auth?.token ||
      client.handshake?.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new WsException('Unauthorized: no token provided');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
      // Attach user to the socket client so downstream handlers can read it
      client.user = {
        userId: payload.sub,
        email: payload.email,
        roomId: payload.roomId,
        role: payload.role,
      };
      return true;
    } catch {
      throw new WsException('Unauthorized: invalid token');
    }
  }
}
