import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface PromptDto {
  prompt_id: number;
  prompt: string;
  is_applied?: boolean;
}

export interface Prompt {
  prompt_id: number;
  prompt: string;
  is_applied: boolean;
}

interface PromptListResponse {
  code: number;
  data: PromptDto[];
  msg: string;
}

interface PromptResponse {
  code: number;
  data: PromptDto;
  msg: string;
}

interface ApplyResponse {
  code: number;
  msg: string;
}

@Injectable({ providedIn: 'root' })
export class PromptService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://bagu.kidwen.top/api/prompts';

  getPrompts(): Observable<Prompt[]> {
    return this.http
      .get<PromptListResponse>(this.apiUrl, { withCredentials: true })
      .pipe(map(res => (res.code === 0 ? res.data.map(this.mapPrompt) : [])));
  }

  createPrompt(prompt: string): Observable<Prompt> {
    return this.http
      .post<PromptResponse>(
        this.apiUrl,
        { prompt },
        { withCredentials: true }
      )
      .pipe(map(res => this.mapPrompt(res.data)));
  }

  updatePrompt(id: number, prompt: string): Observable<any> {
    return this.http
      .put<PromptResponse>(
        `${this.apiUrl}/${id}`,
        { prompt },
        { withCredentials: true }
      );
  }

  deletePrompt(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      withCredentials: true
    });
  }

  applyPrompt(promptId?: number | null): Observable<void> {
    const payload = promptId ? { prompt_id: promptId } : {};
    return this.http
      .post<ApplyResponse>(`${this.apiUrl}/apply`, payload, {
        withCredentials: true
      })
      .pipe(map(() => void 0));
  }

  private mapPrompt = (dto: PromptDto): Prompt => ({
    prompt_id: dto.prompt_id,
    prompt: dto.prompt,
    is_applied: dto.is_applied ?? false
  });
}
