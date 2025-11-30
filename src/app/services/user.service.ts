import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiUser } from './auth.service';

interface UserListResponse {
  code: number;
  data: ApiUser[];
  msg: string;
}

interface LockResponse {
  code: number;
  data?: ApiUser;
  msg: string;
}

export interface UserListQuery {
  email?: string;
  username?: string;
  is_locked?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://bagu.kidwen.top/api/users';

  getUsers(query: UserListQuery = {}): Observable<ApiUser[]> {
    let params = new HttpParams();
    if (query.email) {
      params = params.set('email', query.email);
    }
    if (query.username) {
      params = params.set('username', query.username);
    }
    if (typeof query.is_locked === 'boolean') {
      params = params.set('is_locked', String(query.is_locked));
    }

    return this.http
      .get<UserListResponse>(this.apiUrl, {
        params,
        withCredentials: true
      })
      .pipe(map(res => (res.code === 0 ? res.data : [])));
  }

  setUserLockStatus(userId: number, isLocked: boolean): Observable<ApiUser | null> {
    return this.http
      .post<LockResponse>(
        `${this.apiUrl}/${userId}/lock`,
        { is_locked: isLocked },
        { withCredentials: true }
      )
      .pipe(
        map(res => {
          if (res.code === 0) {
            return res.data ?? null;
          }
          throw new Error(res.msg || '更新锁定状态失败');
        })
      );
  }

  updateUserRole(userId: number, role: string): Observable<ApiUser | null> {
    return this.http
      .put<LockResponse>(
        `${this.apiUrl}/${userId}`,
        { role },
        { withCredentials: true }
      )
      .pipe(
        map(res => {
          if (res.code === 0) {
            return res.data ?? null;
          }
          throw new Error(res.msg || '更新角色失败');
        })
      );
  }

  updateUser(userId: number, data: { email?: string; username?: string; role?: string }): Observable<ApiUser | null> {
    return this.http
      .put<LockResponse>(
        `${this.apiUrl}/${userId}`,
        data,
        { withCredentials: true }
      )
      .pipe(
        map(res => {
          if (res.code === 0) {
            return res.data ?? null;
          }
          throw new Error(res.msg || '更新用户信息失败');
        })
      );
  }
}

