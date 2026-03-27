import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { RoomEvent } from '../common/types/events.types';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Client sends this after connecting + authenticating to subscribe to room events
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.join(`room:${data.roomId}`);
    this.logger.log(`Client ${client.id} joined room ${data.roomId}`);
    return { event: 'room_joined', roomId: data.roomId };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    client.leave(`room:${data.roomId}`);
    return { event: 'room_left', roomId: data.roomId };
  }

  // Broadcast a typed event to all clients in a room's socket room
  broadcastToRoom(roomId: string, event: RoomEvent, payload: unknown) {
    this.server.to(`room:${roomId}`).emit(event, payload);
    this.logger.debug(`Broadcast [${event}] to room:${roomId}`);
  }
}
