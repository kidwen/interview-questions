import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// 后端 API 响应结构 (Based on provided JSON)
export interface ApiResponse<T> {
  code: number;
  data: T;
  msg: string;
}

// 原始接口数据接口 (Based on "data" array items)
export interface HomeApiResponse {
  cate_id: number | string;
  cate_level1: string; // category
  cate_level2: string; // title
}

// UI 使用的数据结构
export interface HomeCardData {
  id: string;
  title: string;
  category: string;
}

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private http = inject(HttpClient);

  // 实际 API 地址
  private readonly apiUrl = 'https://bagu.kidwen.top/api/categories/level2';

  getHomeData(): Observable<HomeCardData[]> {
    return this.http.get<ApiResponse<HomeApiResponse[]>>(this.apiUrl).pipe(
      map(response => {
        if (response.code === 0 && Array.isArray(response.data)) {
           return this.transformData(response.data);
        }
        // 如果 code != 0 或 data 不是数组，返回空数组或抛出错误
        console.warn('API returned non-zero code or invalid data format', response);
        return [];
      })
    );
  }

  private transformData(data: HomeApiResponse[]): HomeCardData[] {
    return data.map(item => ({
      id: item.cate_id.toString(),
      title: item.cate_level2,
      category: item.cate_level1
    }));
  }
}
