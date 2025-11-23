import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DetailService, DetailMenuItem } from '../../services/detail.service';
import { Subscription } from 'rxjs';
import { marked } from 'marked';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detail.html',
  styleUrl: './detail.scss'
})
export class DetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private detailService = inject(DetailService);

  protected cardId = signal<string | null>(null);
  protected menuItems = signal<DetailMenuItem[]>([]);
  protected selectedMenuId = signal<number | null>(null);

  protected streamedContentRaw = signal<string>('');
  protected isLoading = signal<boolean>(false);

  private streamSubscription: Subscription | null = null;

  protected selectedContent = computed<SafeHtml>(() => {
    const rawMarkdown = this.streamedContentRaw();
    if (!rawMarkdown) return '';
    const html = marked.parse(rawMarkdown) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  protected selectedTitle = computed(() => {
    const selectedId = this.selectedMenuId();
    const items = this.menuItems();
    return items.find(item => item.id === selectedId)?.label || '';
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      const menuIdStr = params.get('menuId');

      if (id && id !== this.cardId()) {
        this.cardId.set(id);
        this.fetchDetailData(id);
      }

      if (menuIdStr) {
        const menuId = parseInt(menuIdStr, 10);
        if (!isNaN(menuId) && menuId !== this.selectedMenuId()) {
          this.selectMenu(menuId, false);
        }
      }
    });
  }

  ngOnDestroy() {
    this.stopStream();
  }

  selectMenu(id: number, navigate = true) {
    this.selectedMenuId.set(id);
    this.loadAnswer(id);

    if (navigate) {
      this.router.navigate(['/detail', this.cardId(), id]);
    }
  }

  refreshAnswer() {
    const currentId = this.selectedMenuId();
    if (!currentId || this.isLoading()) return;

    this.loadAnswer(currentId, true); // true indicates refresh
  }

  private loadAnswer(id: number, isRefresh = false) {
    this.streamedContentRaw.set('');
    this.isLoading.set(true);
    this.stopStream();

    const stream$ = isRefresh
      ? this.detailService.refreshAnswer(id)
      : this.detailService.getStreamAnswer(id);

    this.streamSubscription = stream$.subscribe({
      next: (chunk) => {
        this.streamedContentRaw.update(current => current + chunk);
      },
      complete: () => {
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Stream error', err);
        this.isLoading.set(false);
        this.streamedContentRaw.set('Failed to load answer.');
      }
    });
  }

  private stopStream() {
    if (this.streamSubscription) {
      this.streamSubscription.unsubscribe();
      this.streamSubscription = null;
    }
  }

  private fetchDetailData(id: string) {
    this.detailService.getQuestions(id).subscribe({
      next: (data) => {
        this.menuItems.set(data);

        const hasRouteParam = this.route.snapshot.paramMap.has('menuId');
        if (!hasRouteParam && data.length > 0) {
          const defaultId = data[0].id;
          this.selectMenu(defaultId, true);
        }
      },
      error: (err) => {
        console.error('Error fetching detail questions:', err);
      }
    });
  }
}
