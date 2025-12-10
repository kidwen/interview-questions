import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const isPoliceAgreed = localStorage.getItem('isPoliceAgreed') === 'true';

  if (!isPoliceAgreed) {
    // Redirect to root and potentially show modal via query param or state
    // Note: The modal logic is currently in HomeComponent based on isPoliceAgreed signal.
    // Since this is a strict interceptor, if we block the request, we should redirect.

    // However, if the user is already on the home page, the HomeComponent logic handles the modal.
    // If the user is deep linking or navigating elsewhere, we force them to home.

    router.navigate(['/']);
    location.reload();
    // We can either return an error or EMPTY to stop the request, but throwing error is standard
    throw new Error('User not logged in');
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.clearSession();
      }
      return throwError(() => error);
    })
  );
};
