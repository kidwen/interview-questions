import { Injectable, inject, signal, computed } from '@angular/core';
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

export type UserRole = 'admin' | 'vip' | 'user' | 'guest' | string;

export interface ApiUser {
  user_id: number;
  username: string;
  email: string;
  role?: UserRole;
  is_locked?: boolean;
}

export interface User extends ApiUser {
  role: UserRole;
  is_locked: boolean;
}

export interface AuthResponse {
  code: number;
  data: ApiUser;
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
  readonly userRole = computed(() => this.currentUser()?.role ?? 'user');
  readonly isAccountLocked = computed(() => this.currentUser()?.is_locked ?? false);

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data, {
      withCredentials: true
    }).pipe(
      tap(response => {
        if (response.code === 0) {
          const normalized = this.normalizeUser(response.data);
          if (normalized.is_locked) {
            console.warn('Locked account cannot start session', normalized);
            return;
          }
          this.handleAuthSuccess(normalized);
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
          const normalized = this.normalizeUser(response.data);
          if (normalized.is_locked) {
            console.warn('Newly created account is locked, skipping autologin');
            return;
          }
          this.handleAuthSuccess(normalized);
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
        const parsed = JSON.parse(stored) as ApiUser;
        return this.normalizeUser(parsed);
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('currentUser');
      }
    }
    return null;
  }

  public clearSession() {
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    localStorage.removeItem('currentUser');
    location.reload();
  }

  private normalizeUser(user: ApiUser): User {
    return {
      ...user,
      role: (user.role ?? 'user') as UserRole,
      is_locked: Boolean(user.is_locked)
    };
  }
}
