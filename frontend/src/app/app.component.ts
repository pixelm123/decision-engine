import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { WebSocketService } from './core/services/websocket.service';
import { ApiService } from './core/services/api.service';
import { DecisionRoom } from './shared/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <ng-container *ngIf="!auth.isLoggedIn()">
      <router-outlet />
    </ng-container>

    <div class="flex h-screen overflow-hidden bg-slate-50" *ngIf="auth.isLoggedIn()">

      <aside class="w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
        <div class="px-5 py-5 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span class="text-white font-bold text-sm">D</span>
            </div>
            <span class="font-bold text-slate-900 text-base tracking-tight">Decision Engine</span>
          </div>
        </div>

        <nav class="flex-1 px-3 py-4 overflow-y-auto">
          <div class="space-y-1 mb-6">
            <a routerLink="/dashboard" routerLinkActive="active" class="sidebar-link">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              Dashboard
            </a>
            <a routerLink="/rooms/create" routerLinkActive="active" class="sidebar-link">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              New Room
            </a>
          </div>

          <div *ngIf="recentRooms().length > 0">
            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">Recent</p>
            <div class="space-y-0.5">
              <a *ngFor="let room of recentRooms()"
                [routerLink]="['/rooms', room.id, 'lobby']"
                routerLinkActive="active"
                class="sidebar-link gap-2.5 truncate">
                <span class="w-2 h-2 rounded-full flex-shrink-0" [class]="statusDot(room.status)"></span>
                <span class="truncate text-sm">{{ room.title }}</span>
              </a>
            </div>
          </div>
        </nav>

        <div class="px-3 py-4 border-t border-slate-100">
          <div class="flex items-center gap-3 px-3 py-2">
            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span class="text-indigo-700 font-bold text-sm">
                {{ (auth.currentUser()?.email ?? 'U')[0].toUpperCase() }}
              </span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-slate-900 truncate">
                {{ auth.currentUser()?.displayName ?? auth.currentUser()?.email }}
              </p>
              <p class="text-xs text-slate-400 truncate">{{ auth.currentUser()?.email }}</p>
            </div>
          </div>
          <button class="sidebar-link w-full mt-1 text-red-500 hover:text-red-600 hover:bg-red-50" (click)="logout()">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <main class="flex-1 overflow-y-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppComponent implements OnInit {
  recentRooms = signal<DecisionRoom[]>([]);

  constructor(
    public auth: AuthService,
    private ws: WebSocketService,
    private router: Router,
    private api: ApiService,
  ) {}

  ngOnInit() {
    const token = this.auth.token();
    if (token) {
      this.ws.connect(token);
      this.loadRecentRooms();
    }
  }

  private loadRecentRooms() {
    this.api.getRooms().subscribe({
      next: rooms => this.recentRooms.set(rooms.slice(0, 5)),
      error: () => {},
    });
  }

  statusDot(status: string): string {
    return {
      OPEN: 'bg-blue-400',
      SCORING: 'bg-amber-400',
      REVIEWING: 'bg-purple-400',
      FINALIZED: 'bg-emerald-400',
    }[status] ?? 'bg-slate-300';
  }

  logout() {
    this.ws.disconnect();
    this.auth.logout();
  }
}
