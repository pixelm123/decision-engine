import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuditLog } from '../../../shared/models';

type FilterCategory = 'all' | 'room' | 'scoring' | 'participants' | 'setup';

const ACTION_CATEGORY: Record<string, FilterCategory> = {
  room_created: 'room',
  status_changed: 'room',
  participant_joined: 'participants',
  option_created: 'setup',
  option_deleted: 'setup',
  criterion_created: 'setup',
  criterion_deleted: 'setup',
  scores_submitted: 'scoring',
};

const CATEGORY_DOT: Record<FilterCategory, string> = {
  all: 'bg-slate-400',
  room: 'bg-indigo-500',
  scoring: 'bg-amber-500',
  participants: 'bg-emerald-500',
  setup: 'bg-blue-500',
};

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-8">

      <!-- Header -->
      <div class="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <a [routerLink]="['/rooms', roomId, 'lobby']"
            class="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 mb-2 transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Lobby
          </a>
          <h1 class="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p class="text-slate-500 text-sm mt-0.5">Complete history of room actions</p>
        </div>
        <button *ngIf="logs().length > 0" (click)="exportLog()" class="btn-secondary text-xs">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          </svg>
          Export
        </button>
      </div>

      <!-- Filter row -->
      <div class="flex items-center gap-2 mb-4 animate-fade-up stagger-1 flex-wrap">
        <button *ngFor="let cat of filterOptions"
          (click)="activeFilter.set(cat.value)"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border"
          [class]="activeFilter() === cat.value
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'">
          <span class="w-2 h-2 rounded-full" [class]="dotClass(cat.value)"></span>
          {{ cat.label }}
          <span class="text-slate-400 font-normal">({{ categoryCount(cat.value) }})</span>
        </button>
      </div>

      <div *ngIf="loading()" class="card text-center py-12 text-slate-400 animate-fade-up">Loading...</div>

      <div class="card animate-fade-up stagger-2" *ngIf="!loading()">
        <div class="space-y-0">
          <div *ngFor="let log of filteredLogs()"
            class="flex gap-4 py-4 border-b border-slate-100 last:border-0">

            <!-- Category dot + avatar -->
            <div class="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div class="w-2 h-2 rounded-full mt-1.5" [class]="dotClass(categoryOf(log.action))"></div>
            </div>

            <div class="flex-shrink-0">
              <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                {{ (log.user.displayName ?? log.user.email)[0].toUpperCase() }}
              </div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="font-semibold text-sm text-slate-900">{{ log.user.displayName ?? log.user.email }}</span>
                  <span class="text-slate-500 text-sm ml-1">{{ actionLabel(log.action) }}</span>
                </div>
                <span class="text-xs text-slate-400 flex-shrink-0">{{ log.createdAt | date:'MMM d, h:mm a' }}</span>
              </div>

              <!-- State transition -->
              <div *ngIf="log.action === 'status_changed' && log.metadata['from']"
                class="flex items-center gap-2 mt-1.5">
                <span class="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-500">{{ log.metadata['from'] }}</span>
                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
                <span class="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{{ log.metadata['to'] }}</span>
              </div>

              <!-- Score metadata -->
              <div *ngIf="log.action === 'scores_submitted' && log.metadata['scoreCount']"
                class="mt-1 text-xs text-slate-400">
                {{ log.metadata['scoreCount'] }} scores · Round {{ log.metadata['roundNumber'] }}
              </div>

              <!-- Generic metadata (other actions) -->
              <div *ngIf="hasMetadata(log) && log.action !== 'status_changed' && log.action !== 'scores_submitted'"
                class="mt-2 text-xs text-slate-400 bg-slate-50 rounded px-2 py-1 font-mono">
                {{ log.metadata | json }}
              </div>
            </div>
          </div>
        </div>

        <p *ngIf="filteredLogs().length === 0" class="text-center text-slate-400 py-8 text-sm">
          {{ logs().length === 0 ? 'No audit events yet.' : 'No events match this filter.' }}
        </p>
      </div>
    </div>
  `,
})
export class AuditComponent implements OnInit {
  roomId = '';
  logs = signal<AuditLog[]>([]);
  loading = signal(true);
  activeFilter = signal<FilterCategory>('all');

  filterOptions: Array<{ value: FilterCategory; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'room', label: 'Room' },
    { value: 'scoring', label: 'Scoring' },
    { value: 'participants', label: 'Participants' },
    { value: 'setup', label: 'Setup' },
  ];

  filteredLogs = computed(() => {
    const f = this.activeFilter();
    if (f === 'all') return this.logs();
    return this.logs().filter(l => ACTION_CATEGORY[l.action] === f);
  });

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';
    this.api.getAuditLog(this.roomId).subscribe({
      next: (logs) => { this.logs.set(logs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  categoryOf(action: string): FilterCategory {
    return ACTION_CATEGORY[action] ?? 'room';
  }

  dotClass(cat: FilterCategory): string {
    return CATEGORY_DOT[cat] ?? 'bg-slate-400';
  }

  categoryCount(cat: FilterCategory): number {
    if (cat === 'all') return this.logs().length;
    return this.logs().filter(l => ACTION_CATEGORY[l.action] === cat).length;
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      room_created: 'created the room',
      status_changed: 'changed room status',
      participant_joined: 'joined the room',
      option_created: 'added an option',
      option_deleted: 'removed an option',
      criterion_created: 'added a criterion',
      criterion_deleted: 'removed a criterion',
      scores_submitted: 'submitted scores',
    };
    return map[action] ?? action;
  }

  hasMetadata(log: AuditLog): boolean {
    return Object.keys(log.metadata).length > 0;
  }

  exportLog() {
    const rows = [['Time', 'User', 'Action', 'Details']];
    this.filteredLogs().forEach(l => {
      const meta = Object.keys(l.metadata).length > 0 ? JSON.stringify(l.metadata) : '';
      rows.push([
        new Date(l.createdAt).toISOString(),
        l.user.displayName ?? l.user.email,
        l.action,
        meta,
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
