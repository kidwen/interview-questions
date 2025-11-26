import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

interface StoredUser {
  role?: string;
}

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);

  try {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const parsed = JSON.parse(stored) as StoredUser;
      if (parsed?.role === 'admin') {
        return true;
      }
    }
  } catch (error) {
    console.error('Failed to parse stored user for admin guard', error);
  }

  return router.createUrlTree(['/']);
};
