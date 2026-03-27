import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { AggregatedResultEvent, ScoreBreakdown } from '../../../shared/models';

@Component({
  selector: 'app-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-8 max-w-4xl mx-auto">

      <!-- Header -->
      <div class="flex items-center justify-between mb-8 animate-fade-up">
        <div>
          <a [routerLink]="['/rooms', roomId, 'lobby']"
            class="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 mb-2 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Lobby
          </a>
          <h1 class="text-2xl font-bold text-slate-900">Results</h1>
          <p class="text-slate-500 text-sm mt-1">Round {{ currentRound() }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div *ngIf="liveUpdating()"
            class="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
            <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span class="text-xs font-semibold text-emerald-700">Live</span>
          </div>
          <button *ngIf="sortedResults().length > 0" (click)="exportCsv()" class="btn-secondary text-xs">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="results().length === 0" class="card text-center py-16 animate-fade-up">
        <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <p class="font-semibold text-slate-700">No scores yet</p>
        <p class="text-slate-400 text-sm mt-1">Waiting for participants to submit their scores...</p>
      </div>

      <ng-container *ngIf="results().length > 0">

        <!-- Winner card -->
        <div class="card mb-4 animate-fade-up stagger-1 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white">
          <div class="flex items-center gap-4">
            <div class="text-4xl">🏆</div>
            <div class="flex-1">
              <p class="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Leading Option</p>
              <p class="text-2xl font-bold text-slate-900 mt-0.5">{{ sortedResults()[0].optionLabel }}</p>
            </div>
            <div class="text-right">
              <p class="text-3xl font-bold text-indigo-600">{{ sortedResults()[0].weightedScore | number:'1.2-2' }}</p>
              <p class="text-xs text-slate-400">out of 10</p>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 mb-4 bg-slate-100 rounded-xl p-1 animate-fade-up stagger-2">
          <button class="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-150"
            [class]="activeTab() === 'scores' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            (click)="activeTab.set('scores')">
            Weighted Scores
          </button>
          <button class="flex-1 py-2 px-4 rounded-lg text-sm font-semibold transition-all duration-150"
            [class]="activeTab() === 'breakdown' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            (click)="switchToBreakdown()">
            Criteria Breakdown
          </button>
        </div>

        <!-- Scores tab -->
        <div *ngIf="activeTab() === 'scores'">

          <!-- Bar chart -->
          <div class="card mb-4 animate-fade-up stagger-3">
            <div class="space-y-4">
              <div *ngFor="let r of sortedResults(); let i = index">
                <div class="flex items-center justify-between mb-1.5">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-slate-400 w-4">{{ i + 1 }}</span>
                    <span class="text-sm font-semibold text-slate-900">{{ r.optionLabel }}</span>
                  </div>
                  <span class="text-sm font-bold" [class]="scoreColor(r.weightedScore)">
                    {{ r.weightedScore | number:'1.2-2' }}
                  </span>
                </div>
                <div class="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-700 ease-out"
                    [class]="i === 0 ? 'bg-indigo-500' : 'bg-slate-300'"
                    [style.width.%]="barWidth(r.weightedScore)">
                  </div>
                </div>
              </div>
            </div>
            <p class="text-xs text-slate-400 mt-4">Score 1–10 · weighted average across all criteria</p>
          </div>

        </div>

        <!-- Breakdown tab -->
        <div *ngIf="activeTab() === 'breakdown'" class="animate-fade-up stagger-3">

          <div *ngIf="loadingBreakdown()" class="card text-center py-12 text-slate-400 text-sm">
            Loading breakdown...
          </div>

          <div *ngIf="!loadingBreakdown() && breakdown()" class="card overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-100">
                  <th class="text-left pb-3 pr-4 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-40">
                    Criterion
                  </th>
                  <th *ngFor="let opt of breakdown()!.options"
                    class="text-center pb-3 px-3 text-xs font-semibold text-slate-700 min-w-24">
                    {{ opt.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let row of breakdown()!.criteria"
                  class="border-b border-slate-50 last:border-0">
                  <td class="py-3 pr-4">
                    <div>
                      <p class="font-semibold text-slate-700">{{ row.criterionLabel }}</p>
                      <p class="text-xs text-slate-400">{{ (row.weight * 100).toFixed(0) }}% weight</p>
                    </div>
                  </td>
                  <td *ngFor="let score of row.scores" class="py-3 px-3 text-center">
                    <span *ngIf="score.avg !== null"
                      class="inline-block px-2.5 py-1 rounded-lg text-sm font-bold"
                      [class]="cellClass(score.avg)">
                      {{ score.avg | number:'1.1-1' }}
                    </span>
                    <span *ngIf="score.avg === null" class="text-slate-300 text-xs">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
              <span class="text-xs text-slate-400">Score key:</span>
              <span class="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">≥ 7 Good</span>
              <span class="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">5–6 Fair</span>
              <span class="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">≤ 4 Poor</span>
            </div>
          </div>

          <div *ngIf="!loadingBreakdown() && !breakdown()"
            class="card text-center py-12 text-slate-400 text-sm">
            No scores submitted yet.
          </div>

        </div>

      </ng-container>
    </div>
  `,
})
export class ResultsComponent implements OnInit, OnDestroy {
  roomId = '';
  currentRound = signal(1);
  results = signal<AggregatedResultEvent[]>([]);
  breakdown = signal<ScoreBreakdown | null>(null);
  loadingBreakdown = signal(false);
  liveUpdating = signal(false);
  activeTab = signal<'scores' | 'breakdown'>('scores');
  private subs: Subscription[] = [];

  sortedResults = computed(() => [...this.results()].sort((a, b) => b.weightedScore - a.weightedScore));
  maxScore = computed(() => this.results().reduce((m, r) => Math.max(m, r.weightedScore), 0));

  constructor(private route: ActivatedRoute, private api: ApiService, private ws: WebSocketService) {}

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';

    this.api.getRoom(this.roomId).subscribe(r => this.currentRound.set(r.currentRound));

    this.api.getResults(this.roomId).subscribe(results => {
      this.results.set(results.map(r => ({
        optionId: r.optionId,
        optionLabel: r.option.label,
        weightedScore: Number(r.weightedScore),
        roundNumber: r.roundNumber,
      })));
    });

    this.ws.joinRoom(this.roomId);
    this.liveUpdating.set(true);

    this.subs.push(
      this.ws.onScoringUpdated().subscribe(e => {
        if (e.roomId === this.roomId) {
          this.results.set(e.aggregatedResults);
          if (this.activeTab() === 'breakdown') this.loadBreakdown();
        }
      }),
      this.ws.onRoomFinalized().subscribe(e => {
        if (e.roomId === this.roomId) { this.results.set(e.allResults); this.liveUpdating.set(false); }
      }),
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  switchToBreakdown() {
    this.activeTab.set('breakdown');
    if (!this.breakdown()) this.loadBreakdown();
  }

  private loadBreakdown() {
    this.loadingBreakdown.set(true);
    this.api.getScoreBreakdown(this.roomId, this.currentRound()).subscribe({
      next: data => { this.breakdown.set(data); this.loadingBreakdown.set(false); },
      error: () => this.loadingBreakdown.set(false),
    });
  }

  barWidth(score: number): number {
    return this.maxScore() > 0 ? (score / this.maxScore()) * 100 : 0;
  }

  scoreColor(score: number): string {
    if (score >= 7.5) return 'text-indigo-600';
    if (score >= 5) return 'text-amber-600';
    return 'text-red-500';
  }

  cellClass(avg: number): string {
    if (avg >= 7) return 'bg-emerald-50 text-emerald-700';
    if (avg >= 5) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-600';
  }

  exportCsv() {
    const rows = [['Rank', 'Option', 'Weighted Score']];
    this.sortedResults().forEach((r, i) =>
      rows.push([(i + 1).toString(), r.optionLabel, r.weightedScore.toFixed(2)]),
    );
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `results-round-${this.currentRound()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
