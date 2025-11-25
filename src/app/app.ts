import { Component, inject, signal, effect, ViewChild } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { ToastComponent } from './components/toast/toast.component';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, AuthModalComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private document = inject(DOCUMENT);
  protected authService = inject(AuthService);

  @ViewChild('authModal') authModal!: AuthModalComponent;

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
