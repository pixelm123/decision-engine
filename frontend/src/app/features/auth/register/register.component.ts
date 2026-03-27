import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-50 flex">
      <!-- Left panel -->
      <div class="hidden lg:flex lg:w-1/2 bg-indigo-600 flex-col justify-between p-12">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span class="text-white font-bold text-sm">D</span>
          </div>
          <span class="text-white font-bold text-lg">Decision Engine</span>
        </div>
        <div>
          <h2 class="text-4xl font-bold text-white leading-tight">
            Start making smarter<br/>group decisions.
          </h2>
          <p class="text-indigo-200 mt-4 text-lg">
            Create a room, invite your team, score options with weighted criteria — get a clear winner.
          </p>
        </div>
        <p class="text-indigo-300 text-sm">© 2026 Decision Engine</p>
      </div>

      <!-- Right panel -->
      <div class="flex-1 flex items-center justify-center px-8">
        <div class="w-full max-w-sm animate-fade-up">
          <div class="mb-8">
            <h1 class="text-2xl font-bold text-slate-900">Create your account</h1>
            <p class="text-slate-500 mt-1">Free forever. No credit card needed.</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label class="label">Your Name</label>
              <input class="input" type="text" [(ngModel)]="displayName" name="displayName"
                placeholder="Alice" required />
            </div>
            <div>
              <label class="label">Email</label>
              <input class="input" type="email" [(ngModel)]="email" name="email"
                placeholder="you@example.com" required />
            </div>
            <div>
              <label class="label">Password</label>
              <input class="input" type="password" [(ngModel)]="password" name="password"
                placeholder="At least 8 characters" required minlength="8" />
            </div>

            <div *ngIf="error()"
              class="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {{ error() }}
            </div>

            <button type="submit" class="btn-primary w-full" [disabled]="loading()">
              {{ loading() ? 'Creating account...' : 'Create account' }}
            </button>
          </form>

          <p class="text-center text-sm text-slate-500 mt-6">
            Already have an account?
            <a routerLink="/auth/login" class="text-indigo-600 font-semibold hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  displayName = '';
  email = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private authService: AuthService, private ws: WebSocketService, private router: Router) {}

  onSubmit() {
    this.loading.set(true);
    this.error.set('');
    this.authService.register(this.email, this.password, this.displayName).subscribe({
      next: res => { this.ws.connect(res.accessToken); this.router.navigate(['/dashboard']); },
      error: err => { this.error.set(err.error?.message ?? 'Registration failed'); this.loading.set(false); },
    });
  }
}
