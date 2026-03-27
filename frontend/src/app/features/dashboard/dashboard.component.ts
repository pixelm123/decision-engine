import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DecisionRoom, RoomStatus } from '../../shared/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="p-8 max-w-5xl mx-auto">

      <!-- Header -->
      <div class="flex items-start justify-between mb-8 animate-fade-up">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">
            Good {{ greeting() }}, {{ firstName() }}
          </h1>
          <p class="text-slate-500 mt-1">Here's what's happening with your decision rooms.</p>
        </div>
        <a routerLink="/rooms/create" class="btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          + New room
        </a>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-4 gap-4 mb-8">

        <button (click)="setFilter(null)"
          class="card animate-fade-up stagger-1 flex items-center gap-4 text-left transition-all duration-150"
          [class.ring-2]="activeFilter() === null"
          [class.ring-slate-300]="activeFilter() === null">
          <div class="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-slate-900">{{ rooms().length }}</p>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Total Rooms</p>
          </div>
        </button>

        <button (click)="setFilter('OPEN')"
          class="card animate-fade-up stagger-2 flex items-center gap-4 text-left transition-all duration-150"
          [class.ring-2]="activeFilter() === 'OPEN'"
          [class.ring-blue-300]="activeFilter() === 'OPEN'">
          <div class="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-blue-600">{{ activeCount() }}</p>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Active</p>
          </div>
        </button>

        <button (click)="setFilter('SCORING')"
          class="card animate-fade-up stagger-3 flex items-center gap-4 text-left transition-all duration-150"
          [class.ring-2]="activeFilter() === 'SCORING'"
          [class.ring-amber-300]="activeFilter() === 'SCORING'">
          <div class="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-amber-600">{{ scoringCount() }}</p>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Scoring</p>
          </div>
        </button>

        <button (click)="setFilter('FINALIZED')"
          class="card animate-fade-up stagger-4 flex items-center gap-4 text-left transition-all duration-150"
          [class.ring-2]="activeFilter() === 'FINALIZED'"
          [class.ring-emerald-300]="activeFilter() === 'FINALIZED'">
          <div class="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
            </svg>
          </div>
          <div>
            <p class="text-2xl font-bold text-emerald-600">{{ finalizedCount() }}</p>
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Finalized</p>
          </div>
        </button>

      </div>

      <!-- Rooms -->
      <div class="animate-fade-up stagger-2">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-slate-900">
            {{ activeFilter() ? activeFilter() + ' Rooms' : 'Your Rooms' }}
          </h2>
          <button *ngIf="activeFilter()" (click)="setFilter(null)"
            class="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Clear filter
          </button>
        </div>

        <!-- Loading skeleton -->
        <div *ngIf="loading()" class="space-y-3">
          <div *ngFor="let i of [1,2,3]" class="card animate-pulse">
            <div class="flex items-center justify-between">
              <div class="space-y-2">
                <div class="h-4 bg-slate-100 rounded w-48"></div>
                <div class="h-3 bg-slate-100 rounded w-32"></div>
              </div>
              <div class="h-6 bg-slate-100 rounded-full w-20"></div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div *ngIf="!loading() && rooms().length === 0"
          class="card text-center py-16 animate-fade-up">
          <div class="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <h3 class="font-bold text-slate-900 text-lg">No rooms yet</h3>
          <p class="text-slate-400 mt-1 text-sm">Create your first room to start making decisions together.</p>
          <a routerLink="/rooms/create" class="btn-primary mt-6 inline-flex">Create a room</a>
        </div>

        <!-- Room list -->
        <div class="space-y-3" *ngIf="!loading() && filteredRooms().length > 0">
          <a *ngFor="let room of filteredRooms(); let i = index"
            [routerLink]="['/rooms', room.id, 'lobby']"
            class="card-hover flex items-center justify-between gap-4 animate-fade-up"
            [class]="'stagger-' + (i + 1)">

            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                [class]="iconBg(room.status)">
                <svg class="w-5 h-5" [class]="iconColor(room.status)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-slate-900">{{ room.title }}</h3>
                <p class="text-slate-400 text-xs mt-0.5">
                  Round {{ room.currentRound }} &nbsp;·&nbsp;
                  {{ room._count?.participants ?? 0 }} participants &nbsp;·&nbsp;
                  {{ room._count?.options ?? 0 }} options &nbsp;·&nbsp;
                  Updated {{ timeAgo(room.updatedAt ?? room.createdAt) }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              <span [class]="statusClass(room.status)">{{ room.status }}</span>
              <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  rooms = signal<DecisionRoom[]>([]);
  loading = signal(true);
  activeFilter = signal<RoomStatus | null>(null);

  filteredRooms = computed(() => {
    const f = this.activeFilter();
    return f ? this.rooms().filter(r => r.status === f) : this.rooms();
  });

  activeCount = () => this.rooms().filter(r => r.status === 'OPEN').length;
  scoringCount = () => this.rooms().filter(r => r.status === 'SCORING').length;
  finalizedCount = () => this.rooms().filter(r => r.status === 'FINALIZED').length;

  setFilter(status: RoomStatus | null) {
    this.activeFilter.set(this.activeFilter() === status ? null : status);
  }

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    this.api.getRooms().subscribe({
      next: (rooms) => { this.rooms.set(rooms); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  greeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  }

  firstName(): string {
    const user = this.auth.currentUser();
    const name = user?.displayName ?? user?.email ?? 'there';
    return name.split('@')[0].split(' ')[0];
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  statusClass(status: string): string {
    return { OPEN: 'badge-open', SCORING: 'badge-scoring', REVIEWING: 'badge-reviewing', FINALIZED: 'badge-finalized' }[status] ?? 'badge-open';
  }

  iconBg(status: string): string {
    return { OPEN: 'bg-blue-50', SCORING: 'bg-amber-50', REVIEWING: 'bg-purple-50', FINALIZED: 'bg-emerald-50' }[status] ?? 'bg-slate-50';
  }

  iconColor(status: string): string {
    return { OPEN: 'text-blue-500', SCORING: 'text-amber-500', REVIEWING: 'text-purple-500', FINALIZED: 'text-emerald-500' }[status] ?? 'text-slate-400';
  }
}
