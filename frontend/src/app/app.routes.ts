import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },

  {
    path: 'rooms/create',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/room/create/room-create.component').then((m) => m.RoomCreateComponent),
  },

  {
    path: 'rooms/:roomId',
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'lobby', pathMatch: 'full' },
      {
        path: 'lobby',
        loadComponent: () =>
          import('./features/room/lobby/lobby.component').then((m) => m.LobbyComponent),
      },
      {
        path: 'scoring',
        loadComponent: () =>
          import('./features/room/scoring/scoring.component').then((m) => m.ScoringComponent),
      },
      {
        path: 'results',
        loadComponent: () =>
          import('./features/room/results/results.component').then((m) => m.ResultsComponent),
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./features/room/audit/audit.component').then((m) => m.AuditComponent),
      },
    ],
  },

  // Public join route — no auth guard, guest JWT issued on join
  {
    path: 'join/:roomId',
    loadComponent: () =>
      import('./features/room/join/join.component').then((m) => m.JoinComponent),
  },

  { path: '**', redirectTo: '/dashboard' },
];
