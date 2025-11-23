import { Component, inject, signal, effect } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router'; // Added RouterLink
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink], // Added RouterLink
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private document = inject(DOCUMENT);

  // Theme signal
  protected readonly isDarkMode = signal(true);

  constructor() {
    // Apply theme class to body when signal changes
    effect(() => {
      if (this.isDarkMode()) {
        this.document.body.classList.add('dark-theme');
      } else {
        this.document.body.classList.remove('dark-theme');
      }
    });
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
  }
}
