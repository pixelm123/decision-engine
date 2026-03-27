import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { WebSocketService } from '../../../core/services/websocket.service';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="w-full max-w-sm">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-white">Join Decision Room</h1>
          <p class="text-gray-400 mt-2">Enter your name to participate</p>
        </div>
        <div class="card">
          <form (ngSubmit)="onJoin()">
            <div class="space-y-4">
              <div>
                <label class="label">Your Name</label>
                <input class="input" [(ngModel)]="displayName" name="displayName"
                  placeholder="e.g. Alice" required />
              </div>
              <div *ngIf="error()" class="text-red-400 text-sm bg-red-950 border border-red-800 rounded-lg p-3">
                {{ error() }}
              </div>
              <button type="submit" class="btn-primary w-full" [disabled]="!displayName.trim() || loading()">
                {{ loading() ? 'Joining...' : 'Join Room' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
})
export class JoinComponent implements OnInit {
  displayName = '';
  loading = signal(false);
  error = signal('');
  private roomId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private wsService: WebSocketService,
    private api: ApiService,
  ) {}

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  onJoin() {
    this.loading.set(true);
    this.error.set('');

    this.authService.guestJoin(this.roomId, this.displayName.trim()).subscribe({
      next: (res) => {
        this.wsService.connect(res.accessToken);
        this.api.announceJoin(this.roomId).subscribe();
        this.router.navigate(['/rooms', this.roomId, 'lobby']);
      },
      error: (err) => {
        this.error.set(err.error?.message ?? 'Failed to join room');
        this.loading.set(false);
      },
    });
  }
}
