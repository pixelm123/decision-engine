export type RoomStatus = 'OPEN' | 'SCORING' | 'REVIEWING' | 'FINALIZED';
export type ParticipantRole = 'HOST' | 'PARTICIPANT';

export interface User {
  id: string;
  email: string;
  displayName?: string;
}

export interface AuthResponse {
  accessToken: string;
}

export interface GuestAuthResponse {
  accessToken: string;
  user: User;
  roomId: string;
  role: ParticipantRole;
}

export interface DecisionRoom {
  id: string;
  title: string;
  description?: string;
  hostId: string;
  status: RoomStatus;
  currentRound: number;
  createdAt: string;
  updatedAt?: string;
  options?: Option[];
  criteria?: Criterion[];
  participants?: Participant[];
  _count?: { participants: number; options: number };
}

export interface ScoreSubmissionStatus {
  userId: string;
  displayName: string;
  role: ParticipantRole;
  submitted: boolean;
}

export interface ScoreBreakdown {
  options: { id: string; label: string }[];
  criteria: {
    criterionId: string;
    criterionLabel: string;
    weight: number;
    scores: { optionId: string; avg: number | null }[];
  }[];
}

export interface Participant {
  id: string;
  roomId: string;
  userId: string;
  role: ParticipantRole;
  joinedAt: string;
  user: { id: string; email: string; displayName?: string };
}

export interface Option {
  id: string;
  roomId: string;
  label: string;
  description?: string;
  createdAt: string;
}

export interface Criterion {
  id: string;
  roomId: string;
  label: string;
  weight: number;
  order: number;
  config: Record<string, unknown>;
}

export interface Score {
  id: string;
  userId: string;
  optionId: string;
  criterionId: string;
  roundNumber: number;
  value: number;
}

export interface AggregatedResult {
  id: string;
  roomId: string;
  optionId: string;
  roundNumber: number;
  weightedScore: number;
  calculatedAt: string;
  option: { id: string; label: string; description?: string };
}

export interface AuditLog {
  id: string;
  roomId: string;
  userId: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { id: string; email: string; displayName?: string };
}

// WebSocket event payloads
export interface ParticipantJoinedEvent {
  roomId: string;
  userId: string;
  displayName: string;
  role: ParticipantRole;
}

export interface ScoringUpdatedEvent {
  roomId: string;
  roundNumber: number;
  aggregatedResults: AggregatedResultEvent[];
}

export interface AggregatedResultEvent {
  optionId: string;
  optionLabel: string;
  weightedScore: number;
  roundNumber: number;
}

export interface RoundClosedEvent {
  roomId: string;
  roundNumber: number;
  finalResults: AggregatedResultEvent[];
}

export interface RoomFinalizedEvent {
  roomId: string;
  winner: AggregatedResultEvent;
  allResults: AggregatedResultEvent[];
}
