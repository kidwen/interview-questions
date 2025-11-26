import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, AuthResponse } from '../../services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent {
  private authService = inject(AuthService);
  private readonly lockedMessage = '账号已锁定，请联系管理员。';

  protected isOpen = signal(false);
  protected isLoginMode = signal(true); // true: Login, false: Register
  protected isLoading = signal(false);
  protected errorMessage = signal('');

  // Form data
  protected username = signal('');
  protected email = signal('');
  protected password = signal('');
  protected confirmPassword = signal('');

  open() {
    this.isOpen.set(true);
    this.resetForm();
  }

  close() {
    this.isOpen.set(false);
  }

  toggleMode() {
    this.isLoginMode.update(v => !v);
    this.resetForm();
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }

  submit() {
    this.errorMessage.set('');
    const emailVal = this.email();
    const passVal = this.password();

    // Basic validation
    if (!emailVal || !passVal) {
      this.errorMessage.set('Please fill in all fields');
      return;
    }

    this.isLoading.set(true);

    if (this.isLoginMode()) {
      // Login
      this.authService.login({ email: emailVal, password: passVal }).subscribe({
        next: (res: AuthResponse) => {
          this.isLoading.set(false);
          if (res.code === 0) {
            if (res.data?.is_locked) {
              this.errorMessage.set(this.lockedMessage);
              return;
            }
            this.close();
          } else {
            this.errorMessage.set(res.msg || 'Login failed');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set('Network error or server unavailable');
          console.error(err);
        }
      });
    } else {
      // Register
      const userVal = this.username();
      const confirmVal = this.confirmPassword();

      if (!userVal) {
        this.isLoading.set(false);
        this.errorMessage.set('Username is required');
        return;
      }

      if (passVal !== confirmVal) {
        this.isLoading.set(false);
        this.errorMessage.set('Passwords do not match!');
        return;
      }

      this.authService.register({ username: userVal, email: emailVal, password: passVal }).subscribe({
        next: (res: AuthResponse) => {
          this.isLoading.set(false);
          if (res.code === 0) {
            if (res.data?.is_locked) {
              this.errorMessage.set(this.lockedMessage);
              return;
            }
            this.close();
          } else {
            this.errorMessage.set(res.msg || 'Registration failed');
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set('Network error');
          console.error(err);
        }
      });
    }
  }

  private resetForm() {
    this.username.set('');
    this.email.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.errorMessage.set('');
    this.isLoading.set(false);
  }
}
