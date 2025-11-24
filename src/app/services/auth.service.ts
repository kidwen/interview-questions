import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  code: number;
  data: User;
  msg: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://bagu.kidwen.top/api';

  // Initialize state from localStorage
  readonly currentUser = signal<User | null>(this.getStoredUser());
  readonly isPoliceAgreed = signal<boolean>(localStorage.getItem('isPoliceAgreed') === 'true');
  readonly isLoggedIn = signal<boolean>(!!this.getStoredUser());

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.code === 0) {
          this.handleAuthSuccess(response.data);
        }
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.code === 0) {
          this.handleAuthSuccess(response.data);
        }
      })
    );
  }

  logout() {
    this.http
      .post(
        `${this.apiUrl}/logout`,
        {},
        {
          withCredentials: true
        }
      )
      .subscribe({
        next: () => this.clearSession(),
        error: err => {
          console.warn('Logout API failed, clearing session locally.', err);
          this.clearSession();
        }
      });
  }

  private handleAuthSuccess(user: User) {
    this.currentUser.set(user);
    this.isLoggedIn.set(true);
    localStorage.setItem('currentUser', JSON.stringify(user));

    if (!this.isPoliceAgreed()) {
      this.isPoliceAgreed.set(true);
      localStorage.setItem('isPoliceAgreed', 'true');
    }
    location.reload();
  }

  private getStoredUser(): User | null {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('currentUser');
      }
    }
    return null;
  }

  private clearSession() {
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    localStorage.removeItem('currentUser');
    location.reload();
  }
}
