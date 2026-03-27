export enum RoomEvent {
  PARTICIPANT_JOINED = 'participant_joined',
  SCORING_UPDATED = 'scoring_updated',
  ROUND_CLOSED = 'round_closed',
  ROOM_FINALIZED = 'room_finalized',
}

export interface AggregatedResultPayload {
  optionId: string;
  optionLabel: string;
  weightedScore: number;
  roundNumber: number;
}

export interface ParticipantJoinedPayload {
  roomId: string;
  userId: string;
  displayName: string;
  role: string;
}

export interface ScoringUpdatedPayload {
  roomId: string;
  roundNumber: number;
  aggregatedResults: AggregatedResultPayload[];
}

export interface RoundClosedPayload {
  roomId: string;
  roundNumber: number;
  finalResults: AggregatedResultPayload[];
}

export interface RoomFinalizedPayload {
  roomId: string;
  winner: AggregatedResultPayload;
  allResults: AggregatedResultPayload[];
}
