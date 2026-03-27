import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import {
  DecisionRoom,
  Option,
  Criterion,
  AggregatedResult,
  AuditLog,
  Participant,
  ScoreSubmissionStatus,
  ScoreBreakdown,
} from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Rooms
  createRoom(data: { title: string; description?: string }) {
    return this.http.post<DecisionRoom>(`${this.base}/rooms`, data);
  }

  getRooms() {
    return this.http.get<DecisionRoom[]>(`${this.base}/rooms`);
  }

  getRoom(roomId: string) {
    return this.http.get<DecisionRoom>(`${this.base}/rooms/${roomId}`);
  }

  updateRoomStatus(roomId: string, status: string) {
    return this.http.patch<DecisionRoom>(`${this.base}/rooms/${roomId}/status`, { status });
  }

  getAuditLog(roomId: string) {
    return this.http.get<AuditLog[]>(`${this.base}/rooms/${roomId}/audit`);
  }

  // Options
  createOption(roomId: string, data: { label: string; description?: string }) {
    return this.http.post<Option>(`${this.base}/rooms/${roomId}/options`, data);
  }

  getOptions(roomId: string) {
    return this.http.get<Option[]>(`${this.base}/rooms/${roomId}/options`);
  }

  updateOption(roomId: string, optionId: string, data: Partial<Option>) {
    return this.http.patch<Option>(`${this.base}/rooms/${roomId}/options/${optionId}`, data);
  }

  deleteOption(roomId: string, optionId: string) {
    return this.http.delete<void>(`${this.base}/rooms/${roomId}/options/${optionId}`);
  }

  // Criteria
  createCriterion(roomId: string, data: { label: string; weight: number; config?: Record<string, unknown> }) {
    return this.http.post<Criterion>(`${this.base}/rooms/${roomId}/criteria`, data);
  }

  getCriteria(roomId: string) {
    return this.http.get<Criterion[]>(`${this.base}/rooms/${roomId}/criteria`);
  }

  updateCriterion(roomId: string, criterionId: string, data: Partial<Criterion>) {
    return this.http.patch<Criterion>(`${this.base}/rooms/${roomId}/criteria/${criterionId}`, data);
  }

  deleteCriterion(roomId: string, criterionId: string) {
    return this.http.delete<void>(`${this.base}/rooms/${roomId}/criteria/${criterionId}`);
  }

  reorderCriteria(roomId: string, order: { id: string; order: number }[]) {
    return this.http.patch<Criterion[]>(`${this.base}/rooms/${roomId}/criteria/reorder`, { order });
  }

  validateWeights(roomId: string) {
    return this.http.get<{ valid: boolean; sum: number }>(
      `${this.base}/rooms/${roomId}/criteria/validate-weights`,
    );
  }

  // Participants
  getParticipants(roomId: string) {
    return this.http.get<Participant[]>(`${this.base}/rooms/${roomId}/participants`);
  }

  announceJoin(roomId: string) {
    return this.http.post<Participant>(`${this.base}/rooms/${roomId}/participants/announce`, {});
  }

  // Scores
  submitScores(roomId: string, scores: { optionId: string; criterionId: string; value: number }[]) {
    return this.http.post<{ roundNumber: number; aggregatedResults: AggregatedResult[] }>(
      `${this.base}/rooms/${roomId}/scores/batch`,
      { scores },
    );
  }

  getResults(roomId: string, round?: number) {
    let params = new HttpParams();
    if (round !== undefined) params = params.set('round', round.toString());
    return this.http.get<AggregatedResult[]>(`${this.base}/rooms/${roomId}/scores/results`, { params });
  }

  getMyScores(roomId: string, round?: number) {
    let params = new HttpParams();
    if (round !== undefined) params = params.set('round', round.toString());
    return this.http.get<any[]>(`${this.base}/rooms/${roomId}/scores/mine`, { params });
  }

  getScoreStatus(roomId: string, round?: number) {
    let params = new HttpParams();
    if (round !== undefined) params = params.set('round', round.toString());
    return this.http.get<ScoreSubmissionStatus[]>(`${this.base}/rooms/${roomId}/scores/status`, { params });
  }

  getScoreBreakdown(roomId: string, round?: number) {
    let params = new HttpParams();
    if (round !== undefined) params = params.set('round', round.toString());
    return this.http.get<ScoreBreakdown>(`${this.base}/rooms/${roomId}/scores/breakdown`, { params });
  }
}
