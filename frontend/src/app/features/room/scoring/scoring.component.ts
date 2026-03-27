import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { Option, Criterion } from '../../../shared/models';

@Component({
  selector: 'app-scoring',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-8 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <a [routerLink]="['/rooms', roomId, 'lobby']" class="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 mb-2 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Lobby
          </a>
          <h1 class="text-2xl font-bold text-slate-900">Score the Options</h1>
          <p class="text-slate-500 mt-1 text-sm">Round {{ currentRound() }} — drag each slider to rate 1–10</p>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-2xl font-bold text-slate-900">{{ completedCount() }}<span class="text-slate-300 text-lg">/{{ totalRequired() }}</span></p>
            <p class="text-xs text-slate-400">scores entered</p>
          </div>
          <button class="btn-primary" [disabled]="!isComplete() || submitting()" (click)="submit()">
            <svg *ngIf="!submitting() && !submitted()" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
            </svg>
            {{ submitting() ? 'Submitting...' : submitted() ? '✓ Submitted!' : 'Submit Scores' }}
          </button>
        </div>
      </div>

      <!-- Success banner -->
      <div *ngIf="submitted()"
        class="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 animate-fade-up">
        <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <div class="flex-1">
          <p class="font-semibold text-emerald-900">Scores submitted!</p>
          <p class="text-emerald-700 text-sm">Results are updating live for all participants.</p>
        </div>
        <a [routerLink]="['/rooms', roomId, 'results']" class="btn-primary text-sm">
          View Results →
        </a>
      </div>

      <!-- Score cards — one per option -->
      <div class="space-y-4">
        <div *ngFor="let opt of options(); let oi = index"
          class="card animate-fade-up"
          [class]="'stagger-' + (oi + 1)">

          <div class="flex items-center gap-3 mb-6">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <span class="text-indigo-600 font-bold text-sm">{{ oi + 1 }}</span>
            </div>
            <h3 class="font-bold text-slate-900 text-lg">{{ opt.label }}</h3>
          </div>

          <div class="space-y-6">
            <div *ngFor="let c of criteria()">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-slate-700">{{ c.label }}</span>
                  <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                    {{ (c.weight * 100).toFixed(0) }}% weight
                  </span>
                </div>
                <span class="text-sm font-bold px-3 py-1 rounded-lg transition-all duration-150"
                  [class]="scoreLabel(getScore(opt.id, c.id)).class">
                  {{ scoreLabel(getScore(opt.id, c.id)).text }}
                </span>
              </div>

              <!-- Slider -->
              <div class="px-1">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  class="score-slider"
                  [value]="getScore(opt.id, c.id) ?? 0"
                  [style]="sliderStyle(opt.id, c.id)"
                  (input)="setScoreFromSlider($event, opt.id, c.id)"
                />
                <div class="flex justify-between mt-1.5 px-0.5">
                  <span class="text-xs text-slate-300">1</span>
                  <span class="text-xs text-slate-300">10</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sticky submit bar when incomplete -->
      <div *ngIf="!isComplete() && options().length > 0"
        class="fixed bottom-6 right-8 flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-lg animate-fade-up">
        <span class="text-sm text-slate-500">{{ totalRequired() - completedCount() }} scores remaining</span>
        <div class="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div class="h-full bg-indigo-500 rounded-full transition-all duration-300"
            [style.width.%]="progressPct()">
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ScoringComponent implements OnInit, OnDestroy {
  roomId = '';
  options = signal<Option[]>([]);
  criteria = signal<Criterion[]>([]);
  currentRound = signal(1);
  scores = signal<Map<string, number>>(new Map());
  submitting = signal(false);
  submitted = signal(false);
  private subs: Subscription[] = [];

  totalRequired = computed(() => this.options().length * this.criteria().length);
  completedCount = computed(() => this.scores().size);
  isComplete = computed(() => this.completedCount() === this.totalRequired() && this.totalRequired() > 0);
  progressPct = computed(() =>
    this.totalRequired() > 0 ? Math.round((this.completedCount() / this.totalRequired()) * 100) : 0,
  );

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private ws: WebSocketService,
  ) {}

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';

    this.api.getRoom(this.roomId).subscribe((room) => {
      this.options.set(room.options ?? []);
      this.criteria.set((room.criteria ?? []).map(c => ({ ...c, weight: Number(c.weight) })));
      this.currentRound.set(room.currentRound);
    });

    this.api.getMyScores(this.roomId).subscribe((myScores) => {
      const map = new Map<string, number>();
      myScores.forEach((s: any) => map.set(`${s.optionId}:${s.criterionId}`, s.value));
      this.scores.set(map);
    });

    this.ws.joinRoom(this.roomId);
    this.subs.push(
      this.ws.onRoundClosed().subscribe(() =>
        this.router.navigate(['/rooms', this.roomId, 'results']),
      ),
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  getScore(optionId: string, criterionId: string): number | null {
    return this.scores().get(`${optionId}:${criterionId}`) ?? null;
  }

  setScore(optionId: string, criterionId: string, value: number) {
    this.scores.update(m => new Map(m).set(`${optionId}:${criterionId}`, value));
  }

  setScoreFromSlider(event: Event, optionId: string, criterionId: string) {
    const val = parseInt((event.target as HTMLInputElement).value, 10);
    if (val > 0) this.setScore(optionId, criterionId, val);
  }

  sliderStyle(optionId: string, criterionId: string): string {
    const val = this.getScore(optionId, criterionId);
    if (!val) return 'background: #e2e8f0; --thumb-color: #94a3b8';
    const pct = ((val - 1) / 9) * 100;
    const color = val <= 3 ? '#ef4444' : val <= 6 ? '#f59e0b' : val <= 8 ? '#10b981' : '#6366f1';
    return `background: linear-gradient(to right, ${color} ${pct}%, #e2e8f0 ${pct}%); --thumb-color: ${color}`;
  }

  scoreLabel(val: number | null): { text: string; class: string } {
    if (val === null) return { text: 'Not rated', class: 'text-slate-400 bg-slate-50' };
    if (val <= 3) return { text: `${val} — Poor`, class: 'text-red-600 bg-red-50' };
    if (val <= 6) return { text: `${val} — Fair`, class: 'text-amber-600 bg-amber-50' };
    if (val <= 8) return { text: `${val} — Good`, class: 'text-emerald-600 bg-emerald-50' };
    return { text: `${val} — Excellent`, class: 'text-indigo-600 bg-indigo-50' };
  }

  submit() {
    this.submitting.set(true);
    const scores: { optionId: string; criterionId: string; value: number }[] = [];
    this.options().forEach(opt => {
      this.criteria().forEach(c => {
        const v = this.getScore(opt.id, c.id);
        if (v !== null) scores.push({ optionId: opt.id, criterionId: c.id, value: v });
      });
    });

    this.api.submitScores(this.roomId, scores).subscribe({
      next: () => { this.submitted.set(true); this.submitting.set(false); },
      error: () => this.submitting.set(false),
    });
  }
}
