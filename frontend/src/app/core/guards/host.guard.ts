import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const hostGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = auth.currentUser();
  if (user?.role === 'HOST') return true;
  return router.createUrlTree(['/dashboard']);
};
