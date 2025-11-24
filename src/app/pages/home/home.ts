import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CardComponent, CardData } from '../../components/card/card.component';
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

  // Signals for login state
  protected readonly isPoliceAgreed = signal<boolean>(false);

  // Signal to hold our transformed card data
  // Note: We reuse CardData interface if it matches HomeCardData structurally,
  // or we adapt it. CardData expects number id, but our service returns string id.
  // Let's update CardData in card.component.ts to allow string id or adapt here.
  // For now, we'll cast or assume compatibility if CardData is flexible enough.
  // The provided CardData interface has id: number.
  // We should probably update CardComponent to accept string | number or convert.
  protected readonly cards = signal<HomeCardData[]>([]);

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
    this.homeService.getHomeData().subscribe({
      next: (data) => {
        this.cards.set(data);
      },
      error: (err) => {
        console.error('Failed to load home data', err);
        // Error handling (e.g. show toast)
      }
    });
  }
}
