import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// API 响应包装
export interface ApiResponse<T> {
  code: number;
  data: T;
  msg: string;
}

// 原始接口返回数据结构
export interface QuestionApiResponse {
  question_id: number;
  question: string;
  content?: string;
  is_read: boolean;
}

// UI 使用的数据结构 (菜单项)
export interface DetailMenuItem {
  id: number;
  label: string;
  content: string; // 初始为空，流式加载时填充
  isRead: boolean; // 标识是否已读
}

@Injectable({
  providedIn: 'root'
})
export class DetailService {
  private http = inject(HttpClient);
  private zone = inject(NgZone);

  private readonly apiUrl = 'https://bagu.kidwen.top/api/questions';
  private readonly streamApiUrl = 'https://bagu.kidwen.top/api/answer';
  private readonly refreshApiUrl = 'https://bagu.kidwen.top/api/answer/refresh';
  private readonly readStatusApiUrl = 'https://bagu.kidwen.top/api/read';

  getQuestions(cardId: string): Observable<DetailMenuItem[]> {
    const params = new HttpParams().set('cate_id', cardId);

    return this.http.get<ApiResponse<QuestionApiResponse[]>>(this.apiUrl, { params, withCredentials: true }).pipe(
      map(response => {
        if (response.code === 0 && Array.isArray(response.data)) {
          return this.transformData(response.data);
        }
        console.warn('API returned non-zero code or invalid data format', response);
        return [];
      })
    );
  }

  getStreamAnswer(questionId: number): Observable<string> {
    return this.fetchStream(this.streamApiUrl, questionId);
  }

  refreshAnswer(questionId: number): Observable<string> {
    return this.fetchStream(this.refreshApiUrl, questionId);
  }

  private fetchStream(urlStr: string, questionId: number): Observable<string> {
    return new Observable<string>(observer => {
      const abortController = new AbortController();
      const { signal } = abortController;

      const url = new URL(urlStr);
      url.searchParams.append('question_id', questionId.toString());

      fetch(url.toString(), {
        signal,
        credentials: 'include'
      })
        .then(async response => {
          const contentType = response.headers.get('content-type');

          if (contentType && contentType.includes('application/json')) {
            const json = await response.json();
            if (json.code === 0 && json.data) {
              this.zone.run(() => {
                observer.next(json.data);
                observer.complete();
              });
            } else {
              this.zone.run(() =>
                observer.error(new Error(json.msg || 'Unknown error'))
              );
            }
            return;
          }

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                this.zone.run(() => observer.complete());
                break;
              }
              const chunk = decoder.decode(value, { stream: true });
              this.zone.run(() => observer.next(chunk));
            }
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') {
              // Aborted, ignore
            } else {
              this.zone.run(() => observer.error(err));
            }
          }
        })
        .catch(err => {
          this.zone.run(() => observer.error(err));
        });

      return () => {
        abortController.abort();
      };
    });
  }

  updateReadStatus(questionId: number, isRead: boolean): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      this.readStatusApiUrl,
      { question_id: questionId, is_read: isRead },
      { withCredentials: true }
    );
  }

  private transformData(data: QuestionApiResponse[]): DetailMenuItem[] {
    return data.map((item) => ({
      id: item.question_id,
      label: item.question,
      content: '',
      isRead: item.is_read ?? false
    }));
  }
}
