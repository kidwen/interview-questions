import { Component, OnInit, signal, computed, inject, HostListener, DOCUMENT } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent } from '../../components/card/card.component';
import { HomeService, HomeCardData } from '../../services/home.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CardComponent, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit {
  private homeService = inject(HomeService);
  private document = inject(DOCUMENT);

  // Signals for login state
  protected readonly isPoliceAgreed = signal<boolean>(false);
  protected readonly isLoading = signal<boolean>(false);

  // Signal to hold our transformed card data
  protected readonly cards = signal<HomeCardData[]>([]);
  protected readonly skeletonSections = Array.from({ length: 3 }, (_, index) => index);
  protected readonly skeletonCards = Array.from({ length: 4 }, (_, index) => index);

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent) {
    const i = this.document.createElement('i');
    i.classList.add('pulse');
    i.style.left = `${event.x}px`;
    i.style.top = `${event.y}px`;
    this.document.body.appendChild(i);
    setTimeout(() => {
      i.remove();
    }, 1000);
  }


  // Computed signal to group cards by category
  protected readonly groupedCards = computed(() => {
    const groups = new Map<string, HomeCardData[]>();

    for (const card of this.cards()) {
      if (!groups.has(card.category)) {
        groups.set(card.category, []);
      }
      groups.get(card.category)!.push(card);
    }

    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  });

  ngOnInit() {
    this.checkLoginStatus();
  }

  private checkLoginStatus() {
    const hasSession = localStorage.getItem('isPoliceAgreed') === 'true';
    if (hasSession) {
      this.isPoliceAgreed.set(true);
      this.loadData();
    }
  }

  protected handleLogin() {
    this.isPoliceAgreed.set(true);
    localStorage.setItem('isPoliceAgreed', 'true');
    this.loadData();
  }

  private loadData() {
    this.isLoading.set(true);
    this.cards.set([]);

    this.homeService.getHomeData().subscribe({
      next: (data) => {
        this.cards.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load home data', err);
        this.isLoading.set(false);
        // Error handling (e.g. show toast)
      }
    });
  }
}
