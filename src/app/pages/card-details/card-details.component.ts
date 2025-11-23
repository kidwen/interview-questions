import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface MenuItem {
  id: string;
  label: string;
}

@Component({
  selector: 'app-card-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-details.component.html',
  styleUrl: './card-details.component.scss'
})
export class CardDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  protected cardId = signal<string>('');
  protected menuItems = signal<MenuItem[]>([]);
  protected selectedMenuId = signal<string>('');
  protected content = signal<SafeHtml>('');

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.cardId.set(id);
        this.loadMenuData();
      }
    });
  }

  selectMenu(id: string) {
    this.selectedMenuId.set(id);
    this.loadContent(id);
  }

  private loadMenuData() {
    // Mock menu data based on card ID
    const items: MenuItem[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'specs', label: 'Specifications' },
      { id: 'reviews', label: 'User Reviews' },
      { id: 'faq', label: 'FAQ' }
    ];
    this.menuItems.set(items);
    
    // Select first item by default
    if (items.length > 0) {
      this.selectMenu(items[0].id);
    }
  }

  private loadContent(menuId: string) {
    // Mock HTML content from backend
    const mockHtml = `
      <div class="content-wrapper">
        <h3>Details for ${this.getLabel(menuId)}</h3>
        <p>This is the detailed content for <strong>${this.getLabel(menuId)}</strong> of Card #${this.cardId()}.</p>
        <p>Backend returned this HTML string.</p>
        <ul>
          <li>Feature A</li>
          <li>Feature B</li>
          <li>Feature C</li>
        </ul>
        <p>More detailed text goes here...</p>
      </div>
    `;
    this.content.set(this.sanitizer.bypassSecurityTrustHtml(mockHtml));
  }

  private getLabel(id: string): string {
    return this.menuItems().find(item => item.id === id)?.label || id;
  }
  
  protected get selectedMenuLabel() {
    return this.getLabel(this.selectedMenuId());
  }
}
