import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AuthService } from '../../../core/services/auth.service';
import { DecisionRoom, Participant, ScoreSubmissionStatus } from '../../../shared/models';

const STEPS: Array<{ status: string; label: string }> = [
  { status: 'OPEN',       label: 'Open' },
  { status: 'SCORING',    label: 'Scoring' },
  { status: 'REVIEWING',  label: 'Reviewing' },
  { status: 'FINALIZED',  label: 'Finalized' },
];

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <!-- Confirm modal -->
    <div *ngIf="showCloseConfirm()"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      (click)="showCloseConfirm.set(false)">
      <div class="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 animate-fade-up"
        (click)="$event.stopPropagation()">
        <h3 class="font-bold text-slate-900 text-lg mb-2">Close this round?</h3>
        <p class="text-slate-500 text-sm mb-6">
          This will end scoring for Round {{ room()?.currentRound }}.
          Participants can no longer submit or change scores. This cannot be undone.
        </p>
        <div class="flex gap-3">
          <button class="btn-secondary flex-1" (click)="showCloseConfirm.set(false)">Cancel</button>
          <button class="btn-danger flex-1" [disabled]="transitioning()" (click)="confirmCloseRound()">
            {{ transitioning() ? 'Closing...' : 'Close Round' }}
          </button>
        </div>
      </div>
    </div>

    <div class="p-8 max-w-4xl mx-auto" *ngIf="room()">

      <!-- Step trail -->
      <div class="flex items-center gap-0 mb-8 animate-fade-up">
        <ng-container *ngFor="let step of steps; let i = index; let last = last">
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-200"
                [class]="stepCircleClass(step.status)">
                <svg *ngIf="isPastStep(step.status)" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
                <span *ngIf="!isPastStep(step.status)">{{ i + 1 }}</span>
              </div>
              <span class="text-xs font-semibold transition-colors duration-200"
                [class]="stepLabelClass(step.status)">{{ step.label }}</span>
            </div>
          </div>
          <div *ngIf="!last" class="flex-1 h-px mx-2 min-w-4 transition-colors duration-200"
            [class]="isPastStep(steps[i+1].status) || isCurrentStep(steps[i+1].status) ? 'bg-indigo-300' : 'bg-slate-200'">
          </div>
        </ng-container>
      </div>

      <!-- Header -->
      <div class="flex items-start justify-between gap-4 mb-6 animate-fade-up">
        <div class="flex-1">
          <h1 class="text-2xl font-bold text-slate-900">{{ room()!.title }}</h1>
          <p class="text-slate-500 mt-1" *ngIf="room()!.description">{{ room()!.description }}</p>
        </div>
        <div class="flex gap-2" *ngIf="isHost()">
          <a [routerLink]="['/rooms', room()!.id, 'audit']" class="btn-secondary text-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"/>
            </svg>
            Audit Log
          </a>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-4 mb-3 animate-fade-up stagger-1">
        <button (click)="togglePanel('options')"
          class="card text-center transition-all duration-150 hover:border-indigo-200"
          [class.ring-2]="openPanel() === 'options'"
          [class.ring-indigo-200]="openPanel() === 'options'">
          <p class="text-2xl font-bold text-indigo-600">{{ room()!.options?.length ?? 0 }}</p>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Options</p>
        </button>
        <button (click)="togglePanel('criteria')"
          class="card text-center transition-all duration-150 hover:border-purple-200"
          [class.ring-2]="openPanel() === 'criteria'"
          [class.ring-purple-200]="openPanel() === 'criteria'">
          <p class="text-2xl font-bold text-purple-600">{{ room()!.criteria?.length ?? 0 }}</p>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Criteria</p>
        </button>
        <button (click)="scrollToParticipants()"
          class="card text-center transition-all duration-150 hover:border-emerald-200">
          <p class="text-2xl font-bold text-emerald-600">{{ participants().length }}</p>
          <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Participants</p>
        </button>
      </div>

      <!-- Expandable detail panel -->
      <div *ngIf="openPanel()" class="card mb-4 animate-fade-up">

        <div *ngIf="openPanel() === 'options'">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-900">Options</h3>
            <button (click)="openPanel.set(null)" class="text-slate-400 hover:text-slate-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="space-y-2">
            <div *ngFor="let opt of room()!.options; let i = index"
              class="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
              <span class="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {{ i + 1 }}
              </span>
              <div>
                <p class="text-sm font-semibold text-slate-900">{{ opt.label }}</p>
                <p *ngIf="opt.description" class="text-xs text-slate-400 mt-0.5">{{ opt.description }}</p>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="openPanel() === 'criteria'">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-slate-900">Criteria & Weights</h3>
            <button (click)="openPanel.set(null)" class="text-slate-400 hover:text-slate-600">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div class="space-y-3">
            <div *ngFor="let c of room()!.criteria"
              class="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <span class="text-sm font-semibold text-slate-900">{{ c.label }}</span>
              <div class="flex items-center gap-3">
                <div class="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full bg-purple-400 rounded-full"
                    [style.width.%]="(+c.weight) * 100">
                  </div>
                </div>
                <span class="text-xs font-bold text-purple-600 w-8 text-right">
                  {{ ((+c.weight) * 100).toFixed(0) }}%
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between pt-3 mt-1 border-t border-slate-100">
            <span class="text-xs text-slate-400">Total weight</span>
            <span class="text-xs font-bold text-slate-700">
              {{ totalWeight() }}%
            </span>
          </div>
        </div>

      </div>

      <div class="grid grid-cols-2 gap-4">

        <!-- Participants -->
        <div id="participants-section" class="card animate-fade-up stagger-2">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-bold text-slate-900">Participants</h2>
            <span *ngIf="room()!.status === 'SCORING' && submissionStatus().length > 0"
              class="text-xs text-slate-400">
              {{ submittedCount() }}/{{ participants().length }} submitted
            </span>
          </div>

          <!-- Submission progress bar (SCORING only) -->
          <div *ngIf="room()!.status === 'SCORING' && participants().length > 0" class="mb-4">
            <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full transition-all duration-500"
                [style.width.%]="submissionPct()">
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div *ngFor="let p of participants()"
              class="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                [class]="p.role === 'HOST' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'">
                {{ (p.user.displayName ?? p.user.email)[0].toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-900 truncate">{{ p.user.displayName ?? p.user.email }}</p>
              </div>
              <!-- Submission status indicator (SCORING only) -->
              <ng-container *ngIf="room()!.status === 'SCORING'">
                <span *ngIf="hasSubmitted(p.userId)"
                  class="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                  Done
                </span>
                <span *ngIf="!hasSubmitted(p.userId)"
                  class="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                  Scoring...
                </span>
              </ng-container>
              <!-- Role badge (non-scoring states) -->
              <span *ngIf="room()!.status !== 'SCORING'"
                class="text-xs font-semibold px-2 py-0.5 rounded-full"
                [class]="p.role === 'HOST' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'">
                {{ p.role }}
              </span>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="space-y-4">

          <!-- Invite link -->
          <div class="card animate-fade-up stagger-3" *ngIf="isHost()">
            <h2 class="font-bold text-slate-900 mb-3">Invite</h2>
            <div class="flex items-center justify-between mb-2">
              <div>
                <p class="text-xs text-slate-400 mb-0.5">Room code</p>
                <p class="text-lg font-bold text-indigo-700 font-mono tracking-widest">{{ shortCode() }}</p>
              </div>
              <button class="btn-secondary text-xs py-1.5 px-3" (click)="copyLink()">
                {{ copied() ? '✓ Copied' : 'Copy link' }}
              </button>
            </div>
          </div>

          <!-- Host controls -->
          <div class="card animate-fade-up stagger-4" *ngIf="isHost()">
            <h2 class="font-bold text-slate-900 mb-4">Host Controls</h2>

            <div *ngIf="room()!.status === 'OPEN'" class="space-y-3">
              <p class="text-sm text-slate-500">Open scoring when all participants have joined.</p>
              <button class="btn-primary w-full" [disabled]="transitioning()" (click)="transitionTo('SCORING')">
                {{ transitioning() ? 'Opening...' : 'Open Scoring →' }}
              </button>
            </div>

            <div *ngIf="room()!.status === 'SCORING'" class="space-y-3">
              <p class="text-sm text-slate-500">Scoring is live. Close when everyone has submitted.</p>
              <div class="flex gap-2">
                <a [routerLink]="['/rooms', room()!.id, 'scoring']" class="btn-secondary flex-1">My Scores</a>
                <button class="btn-primary flex-1" [disabled]="transitioning()" (click)="showCloseConfirm.set(true)">
                  Close Round →
                </button>
              </div>
            </div>

            <div *ngIf="room()!.status === 'REVIEWING'" class="space-y-3">
              <p class="text-sm text-slate-500">Round closed. Review results or run another round.</p>
              <a [routerLink]="['/rooms', room()!.id, 'results']" class="btn-secondary w-full text-center">
                View Results
              </a>
              <div class="flex gap-2">
                <button class="btn-secondary flex-1" [disabled]="transitioning()" (click)="transitionTo('SCORING')">
                  New Round
                </button>
                <button class="btn-danger flex-1" [disabled]="transitioning()" (click)="transitionTo('FINALIZED')">
                  Finalize
                </button>
              </div>
            </div>

            <div *ngIf="room()!.status === 'FINALIZED'" class="space-y-3">
              <div class="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Decision finalized
              </div>
              <a [routerLink]="['/rooms', room()!.id, 'results']" class="btn-primary w-full text-center">
                View Final Results →
              </a>
            </div>
          </div>

          <!-- Participant action -->
          <div class="card animate-fade-up stagger-4" *ngIf="!isHost()">
            <div *ngIf="room()!.status === 'SCORING'" class="space-y-3">
              <div class="flex items-center gap-2 mb-2">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span class="text-sm font-semibold text-slate-700">Scoring is open</span>
              </div>
              <p class="text-sm text-slate-500">Submit your scores now.</p>
              <a [routerLink]="['/rooms', room()!.id, 'scoring']" class="btn-primary w-full text-center">
                Go to Scoring →
              </a>
            </div>
            <div *ngIf="room()!.status === 'REVIEWING' || room()!.status === 'FINALIZED'">
              <a [routerLink]="['/rooms', room()!.id, 'results']" class="btn-primary w-full text-center">
                View Results →
              </a>
            </div>
            <div *ngIf="room()!.status === 'OPEN'" class="flex items-center gap-2 text-slate-500 text-sm">
              <svg class="w-4 h-4 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Waiting for host to open scoring...
            </div>
          </div>
        </div>
      </div>
    </div>

    <div *ngIf="loading()" class="flex items-center justify-center h-64">
      <svg class="w-6 h-6 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  `,
})
export class LobbyComponent implements OnInit, OnDestroy {
  room = signal<DecisionRoom | null>(null);
  participants = signal<Participant[]>([]);
  submissionStatus = signal<ScoreSubmissionStatus[]>([]);
  loading = signal(true);
  transitioning = signal(false);
  copied = signal(false);
  showCloseConfirm = signal(false);
  openPanel = signal<'options' | 'criteria' | null>(null);
  roomId = '';
  steps = STEPS;
  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private ws: WebSocketService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    this.subs.push(
      this.route.paramMap.subscribe(params => {
        const newId = params.get('roomId') ?? '';
        if (newId === this.roomId) return;

        if (this.roomId) this.ws.leaveRoom(this.roomId);
        this.roomId = newId;
        this.room.set(null);
        this.participants.set([]);
        this.submissionStatus.set([]);
        this.openPanel.set(null);
        this.loading.set(true);

        this.loadRoom();
        this.ws.joinRoom(this.roomId);
      }),
      this.ws.onParticipantJoined().subscribe(e => {
        if (e.roomId === this.roomId) this.loadParticipants();
      }),
      this.ws.onScoringUpdated().subscribe(e => {
        if (e.roomId === this.roomId) this.loadSubmissionStatus();
      }),
      this.ws.onRoundClosed().subscribe(e => {
        if (e.roomId === this.roomId) {
          this.loadRoom();
          this.router.navigate(['/rooms', this.roomId, 'results']);
        }
      }),
      this.ws.onRoomFinalized().subscribe(e => {
        if (e.roomId === this.roomId) this.loadRoom();
      }),
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
    this.ws.leaveRoom(this.roomId);
  }

  togglePanel(panel: 'options' | 'criteria') {
    this.openPanel.set(this.openPanel() === panel ? null : panel);
  }

  scrollToParticipants() {
    document.getElementById('participants-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  totalWeight(): string {
    const sum = (this.room()?.criteria ?? []).reduce((acc, c) => acc + Number(c.weight), 0);
    return (sum * 100).toFixed(0);
  }

  isHost(): boolean {
    const user = this.auth.currentUser();
    return user?.role === 'HOST' || this.room()?.hostId === user?.userId;
  }

  shortCode(): string {
    const clean = this.roomId.replace(/-/g, '').toUpperCase();
    return clean.substring(0, 4) + '-' + clean.substring(4, 8);
  }

  joinUrl() { return `${window.location.origin}/join/${this.roomId}`; }

  stepIndex(): number {
    return STEPS.findIndex(s => s.status === this.room()?.status);
  }

  isCurrentStep(status: string): boolean { return this.room()?.status === status; }

  isPastStep(status: string): boolean {
    const idx = STEPS.findIndex(s => s.status === status);
    return idx < this.stepIndex();
  }

  stepCircleClass(status: string): string {
    if (this.isPastStep(status)) return 'bg-indigo-500 text-white';
    if (this.isCurrentStep(status)) return 'bg-indigo-600 text-white ring-4 ring-indigo-100';
    return 'bg-slate-200 text-slate-500';
  }

  stepLabelClass(status: string): string {
    if (this.isCurrentStep(status)) return 'text-indigo-700';
    if (this.isPastStep(status)) return 'text-slate-500';
    return 'text-slate-400';
  }

  hasSubmitted(userId: string): boolean {
    return this.submissionStatus().find(s => s.userId === userId)?.submitted ?? false;
  }

  submittedCount(): number {
    return this.submissionStatus().filter(s => s.submitted).length;
  }

  submissionPct(): number {
    const total = this.participants().length;
    return total > 0 ? (this.submittedCount() / total) * 100 : 0;
  }

  transitionTo(status: string) {
    this.transitioning.set(true);
    this.api.updateRoomStatus(this.roomId, status).subscribe({
      next: r => {
        this.room.update(room => ({ ...room!, status: r.status, currentRound: r.currentRound }));
        this.transitioning.set(false);
        if (status === 'SCORING') this.loadSubmissionStatus();
      },
      error: () => this.transitioning.set(false),
    });
  }

  confirmCloseRound() {
    this.showCloseConfirm.set(false);
    this.transitionTo('REVIEWING');
  }

  copyLink() {
    navigator.clipboard.writeText(this.joinUrl()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  private loadRoom() {
    this.api.getRoom(this.roomId).subscribe(room => {
      this.room.set(room);
      this.participants.set(room.participants ?? []);
      this.loading.set(false);
      if (room.status === 'SCORING') this.loadSubmissionStatus();
    });
  }

  private loadParticipants() {
    this.api.getParticipants(this.roomId).subscribe(p => this.participants.set(p));
  }

  private loadSubmissionStatus() {
    this.api.getScoreStatus(this.roomId).subscribe({
      next: status => this.submissionStatus.set(status),
      error: () => {},
    });
  }
}
