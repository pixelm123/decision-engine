import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { ApiService } from '../../../core/services/api.service';
import { Option, Criterion } from '../../../shared/models';

type Step = 'details' | 'options' | 'criteria' | 'invite';

@Component({
  selector: 'app-room-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DragDropModule],
  template: `
    <div class="max-w-2xl mx-auto px-4 py-8">
      <a routerLink="/dashboard" class="text-gray-400 hover:text-white text-sm mb-6 inline-flex items-center gap-1">
        ← Back to dashboard
      </a>

      <!-- Step indicator -->
      <div class="flex items-center gap-2 mb-8">
        <ng-container *ngFor="let s of steps; let i = index">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              [class]="currentStep() === s ? 'bg-blue-600 text-white' : stepIndex() > i ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-400'">
              {{ stepIndex() > i ? '✓' : i + 1 }}
            </div>
            <span class="text-sm hidden sm:block"
              [class]="currentStep() === s ? 'text-white' : 'text-gray-500'">{{ stepLabel(s) }}</span>
          </div>
          <div *ngIf="i < steps.length - 1" class="flex-1 h-px bg-gray-700 max-w-8"></div>
        </ng-container>
      </div>

      <!-- Step 1: Details -->
      <div class="card" *ngIf="currentStep() === 'details'">
        <h2 class="text-lg font-semibold mb-4">Room Details</h2>
        <div class="space-y-4">
          <div>
            <label class="label">Title *</label>
            <input class="input" [(ngModel)]="title" placeholder="e.g. Best JavaScript Framework 2026" />
          </div>
          <div>
            <label class="label">Description</label>
            <textarea class="input" rows="3" [(ngModel)]="description"
              placeholder="What are we deciding?"></textarea>
          </div>
          <div *ngIf="error()" class="text-red-400 text-sm">{{ error() }}</div>
          <div class="flex justify-end">
            <button class="btn-primary" [disabled]="!title.trim() || creating()" (click)="createRoom()">
              {{ creating() ? 'Creating...' : 'Create & Continue →' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2: Options -->
      <div class="card" *ngIf="currentStep() === 'options'">
        <h2 class="text-lg font-semibold mb-1">Add Options</h2>
        <p class="text-gray-400 text-sm mb-4">What are the choices being scored?</p>

        <div class="space-y-2 mb-4">
          <div *ngFor="let opt of options()" class="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
            <span class="flex-1 text-sm">{{ opt.label }}</span>
            <button class="text-gray-500 hover:text-red-400 text-xs" (click)="removeOption(opt.id)">✕</button>
          </div>
        </div>

        <div class="flex gap-2">
          <input class="input" [(ngModel)]="newOptionLabel" placeholder="Option label"
            (keydown.enter)="addOption()" />
          <button class="btn-secondary" [disabled]="!newOptionLabel.trim()" (click)="addOption()">Add</button>
        </div>

        <div class="flex justify-between mt-6">
          <button class="btn-secondary" (click)="currentStep.set('details')">← Back</button>
          <button class="btn-primary" [disabled]="options().length < 2" (click)="currentStep.set('criteria')">
            Continue → ({{ options().length }} options)
          </button>
        </div>
      </div>

      <!-- Step 3: Criteria -->
      <div class="card" *ngIf="currentStep() === 'criteria'">
        <h2 class="text-lg font-semibold mb-1">Add Criteria</h2>
        <p class="text-gray-400 text-sm mb-1">Define how options will be scored. Weights must sum to 1.</p>
        <p class="text-sm font-medium mb-4" [class]="weightsValid() ? 'text-green-400' : 'text-yellow-400'">
          Weight total: {{ weightSum() | number:'1.0-3' }} / 1.0
        </p>

        <!-- Drag-and-drop criteria list -->
        <div cdkDropList (cdkDropListDropped)="dropCriterion($event)" class="space-y-2 mb-4">
          <div *ngFor="let c of criteria()" cdkDrag
            class="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing">
            <span class="text-gray-500 cdkDragHandle">⠿</span>
            <span class="flex-1 text-sm">{{ c.label }}</span>
            <input type="number" step="0.05" min="0" max="1" [value]="c.weight"
              class="w-20 px-2 py-1 text-xs bg-gray-700 border border-gray-600 rounded text-right"
              (change)="updateWeight(c.id, +$any($event.target).value)" />
            <button class="text-gray-500 hover:text-red-400 text-xs" (click)="removeCriterion(c.id)">✕</button>
          </div>
        </div>

        <div class="flex gap-2">
          <input class="input" [(ngModel)]="newCriterionLabel" placeholder="Criterion label"
            (keydown.enter)="addCriterion()" />
          <input type="number" step="0.05" min="0" max="1" [(ngModel)]="newCriterionWeight"
            class="w-24 input" placeholder="0.0" />
          <button class="btn-secondary" [disabled]="!newCriterionLabel.trim()" (click)="addCriterion()">Add</button>
        </div>

        <div class="flex justify-between mt-6">
          <button class="btn-secondary" (click)="currentStep.set('options')">← Back</button>
          <button class="btn-primary" [disabled]="!weightsValid() || savingCriteria()"
            (click)="saveCriteriaAndContinue()">
            {{ savingCriteria() ? 'Saving...' : 'Continue →' }}
          </button>
        </div>
      </div>

      <!-- Step 4: Invite -->
      <div class="card" *ngIf="currentStep() === 'invite'">
        <h2 class="text-lg font-semibold mb-2">Room Ready!</h2>
        <p class="text-gray-400 text-sm mb-6">Share this link with participants.</p>

        <div class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex items-center gap-3 mb-4">
          <span class="flex-1 text-sm text-blue-300 break-all">{{ joinUrl() }}</span>
          <button class="btn-secondary text-xs" (click)="copyLink()">
            {{ copied() ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <a [routerLink]="['/rooms', roomId(), 'lobby']" class="btn-primary w-full text-center">
          Go to Room Lobby →
        </a>
      </div>
    </div>
  `,
})
export class RoomCreateComponent {
  readonly steps: Step[] = ['details', 'options', 'criteria', 'invite'];
  currentStep = signal<Step>('details');
  stepIndex = computed(() => this.steps.indexOf(this.currentStep()));

  // Step 1
  title = '';
  description = '';
  creating = signal(false);
  error = signal('');
  roomId = signal('');

  // Step 2
  options = signal<Option[]>([]);
  newOptionLabel = '';

  // Step 3
  criteria = signal<Criterion[]>([]);
  newCriterionLabel = '';
  newCriterionWeight = 0.5;
  savingCriteria = signal(false);
  weightSum = computed(() =>
    this.criteria().reduce((s, c) => s + Number(c.weight), 0),
  );
  weightsValid = computed(() => Math.abs(this.weightSum() - 1) < 0.001);

  // Step 4
  copied = signal(false);
  joinUrl = computed(() => `${window.location.origin}/join/${this.roomId()}`);

  constructor(private api: ApiService, private router: Router) {}

  stepLabel(s: Step) {
    return { details: 'Details', options: 'Options', criteria: 'Criteria', invite: 'Invite' }[s];
  }

  createRoom() {
    this.creating.set(true);
    this.api.createRoom({ title: this.title.trim(), description: this.description.trim() || undefined })
      .subscribe({
        next: (room) => {
          this.roomId.set(room.id);
          this.creating.set(false);
          this.currentStep.set('options');
        },
        error: (err) => {
          this.error.set(err.error?.message ?? 'Failed to create room');
          this.creating.set(false);
        },
      });
  }

  addOption() {
    if (!this.newOptionLabel.trim()) return;
    this.api.createOption(this.roomId(), { label: this.newOptionLabel.trim() }).subscribe({
      next: (opt) => {
        this.options.update((opts) => [...opts, opt]);
        this.newOptionLabel = '';
      },
    });
  }

  removeOption(id: string) {
    this.api.deleteOption(this.roomId(), id).subscribe({
      next: () => this.options.update((opts) => opts.filter((o) => o.id !== id)),
    });
  }

  addCriterion() {
    if (!this.newCriterionLabel.trim()) return;
    const criterion: Partial<Criterion> = {
      label: this.newCriterionLabel.trim(),
      weight: this.newCriterionWeight,
      order: this.criteria().length,
    };
    this.api.createCriterion(this.roomId(), criterion as any).subscribe({
      next: (c) => {
        this.criteria.update((cs) => [...cs, { ...c, weight: Number(c.weight) }]);
        this.newCriterionLabel = '';
        this.newCriterionWeight = 0;
      },
    });
  }

  removeCriterion(id: string) {
    this.api.deleteCriterion(this.roomId(), id).subscribe({
      next: () => this.criteria.update((cs) => cs.filter((c) => c.id !== id)),
    });
  }

  updateWeight(id: string, weight: number) {
    this.criteria.update((cs) =>
      cs.map((c) => (c.id === id ? { ...c, weight } : c)),
    );
    this.api.updateCriterion(this.roomId(), id, { weight }).subscribe();
  }

  dropCriterion(event: CdkDragDrop<Criterion[]>) {
    const updated = [...this.criteria()];
    moveItemInArray(updated, event.previousIndex, event.currentIndex);
    const reordered = updated.map((c, i) => ({ ...c, order: i }));
    this.criteria.set(reordered);
    this.api.reorderCriteria(this.roomId(), reordered.map((c) => ({ id: c.id, order: c.order }))).subscribe();
  }

  saveCriteriaAndContinue() {
    this.currentStep.set('invite');
  }

  copyLink() {
    navigator.clipboard.writeText(this.joinUrl()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
