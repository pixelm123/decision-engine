import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, fromEvent } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import {
  ScoringUpdatedEvent,
  ParticipantJoinedEvent,
  RoundClosedEvent,
  RoomFinalizedEvent,
} from '../../shared/models';

// Mirror the backend enum locally
export const RoomEvents = {
  PARTICIPANT_JOINED: 'participant_joined',
  SCORING_UPDATED: 'scoring_updated',
  ROUND_CLOSED: 'round_closed',
  ROOM_FINALIZED: 'room_finalized',
} as const;

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private socket: Socket | null = null;
  private destroy$ = new Subject<void>();

  connect(token: string): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => console.log('WS connected'));
    this.socket.on('disconnect', () => console.log('WS disconnected'));
    this.socket.on('connect_error', (err) => console.error('WS error:', err.message));
  }

  joinRoom(roomId: string): void {
    this.socket?.emit('join_room', { roomId });
  }

  leaveRoom(roomId: string): void {
    this.socket?.emit('leave_room', { roomId });
  }

  // Typed event listeners
  onScoringUpdated(): Observable<ScoringUpdatedEvent> {
    return this.on<ScoringUpdatedEvent>(RoomEvents.SCORING_UPDATED);
  }

  onParticipantJoined(): Observable<ParticipantJoinedEvent> {
    return this.on<ParticipantJoinedEvent>(RoomEvents.PARTICIPANT_JOINED);
  }

  onRoundClosed(): Observable<RoundClosedEvent> {
    return this.on<RoundClosedEvent>(RoomEvents.ROUND_CLOSED);
  }

  onRoomFinalized(): Observable<RoomFinalizedEvent> {
    return this.on<RoomFinalizedEvent>(RoomEvents.ROOM_FINALIZED);
  }

  private on<T>(event: string): Observable<T> {
    return new Observable<T>((observer) => {
      const handler = (data: T) => observer.next(data);
      this.socket?.on(event, handler);
      return () => this.socket?.off(event, handler);
    }).pipe(takeUntil(this.destroy$));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
