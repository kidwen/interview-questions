import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PromptService, Prompt } from '../../services/prompt.service';

@Component({
  selector: 'app-prompts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prompts.component.html',
  styleUrl: './prompts.component.scss'
})
export class PromptsComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private promptService = inject(PromptService);

  protected currentUser = this.authService.currentUser;
  protected prompts = signal<Prompt[]>([]);
  protected isLoading = signal<boolean>(false);
  protected isSaving = signal<boolean>(false);
  protected errorMessage = signal<string>('');
  protected newPrompt = signal<string>('');
  protected editingPromptId = signal<number | null>(null);
  protected editingValue = signal<string>('');
  protected appliedPromptId = signal<number | null>(null);
  protected busyPromptId = signal<number | null>(null); // For apply/delete operations

  protected readonly promptCount = computed(() => this.prompts().length);

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }
    this.loadPrompts();
  }

  private loadPrompts() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.promptService.getPrompts().subscribe({
      next: prompts => {
        this.prompts.set(prompts);
        const applied = prompts.find(p => p.is_applied);
        this.appliedPromptId.set(applied ? applied.prompt_id : null);
        this.isLoading.set(false);
      },
      error: err => {
        this.isLoading.set(false);
        this.errorMessage.set('无法加载提示词，请稍后再试。');
        console.error(err);
      }
    });
  }

  createPrompt() {
    const value = this.newPrompt().trim();
    if (!value || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.errorMessage.set('');
    this.promptService.createPrompt(value).subscribe({
      next: prompt => {
        this.prompts.update(list => [prompt, ...list]);
        this.newPrompt.set('');
        this.isSaving.set(false);
      },
      error: err => {
        this.isSaving.set(false);
        this.errorMessage.set('创建提示词失败，请稍后重试。');
        console.error(err);
      }
    });
  }

  startEdit(prompt: Prompt) {
    this.editingPromptId.set(prompt.prompt_id);
    this.editingValue.set(prompt.prompt);
    this.errorMessage.set('');
  }

  cancelEdit() {
    this.editingPromptId.set(null);
    this.editingValue.set('');
  }

  savePrompt() {
    const id = this.editingPromptId();
    const value = this.editingValue().trim();
    if (!id || !value || this.isSaving()) {
      return;
    }
    this.isSaving.set(true);
    this.promptService.updatePrompt(id, value).subscribe({
      next: () => {
        this.loadPrompts();
        this.cancelEdit();
        this.isSaving.set(false);
      },
      error: err => {
        this.isSaving.set(false);
        this.errorMessage.set('更新失败，请稍后重试。');
        console.error(err);
      }
    });
  }

  deletePrompt(id: number) {
    if (
      !confirm('确定要删除该提示词吗？删除后不可恢复。') ||
      this.busyPromptId()
    ) {
      return;
    }
    this.busyPromptId.set(id);
    this.promptService.deletePrompt(id).subscribe({
      next: () => {
        this.prompts.update(list => list.filter(item => item.prompt_id !== id));
        if (this.appliedPromptId() === id) {
          this.appliedPromptId.set(null);
        }
        this.busyPromptId.set(null);
      },
      error: err => {
        this.busyPromptId.set(null);
        this.errorMessage.set('删除失败，请稍后重试。');
        console.error(err);
      }
    });
  }

  applyPrompt(id: number) {
    if (this.busyPromptId()) {
      return;
    }
    this.busyPromptId.set(id);
    this.promptService.applyPrompt(id).subscribe({
      next: () => {
        this.appliedPromptId.set(id);
        this.prompts.update(list =>
          list.map(item => ({ ...item, isApplied: item.prompt_id === id }))
        );
        this.busyPromptId.set(null);
      },
      error: err => {
        this.busyPromptId.set(null);
        this.errorMessage.set('应用失败，请稍后重试。');
        console.error(err);
      }
    });
  }

  clearApplied() {
    if (this.busyPromptId()) {
      return;
    }
    this.busyPromptId.set(0);
    this.promptService.applyPrompt(null).subscribe({
      next: () => {
        this.appliedPromptId.set(null);
        this.prompts.update(list =>
          list.map(item => ({ ...item, isApplied: false }))
        );
        this.busyPromptId.set(null);
      },
      error: err => {
        this.busyPromptId.set(null);
        this.errorMessage.set('取消应用失败，请稍后重试。');
        console.error(err);
      }
    });
  }

  // logout() {
  //   this.authService.logout();
  //   this.router.navigate(['/']);
  // }
}
