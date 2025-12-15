import { Component, OnInit, inject, signal, computed, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DetailService, DetailMenuItem } from '../../services/detail.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { Subscription } from 'rxjs';
import { marked } from 'marked';
import { FormsModule } from '@angular/forms';
import { MarkdownPipe } from '../../pipes/markdown-pipe';

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './detail.html',
  styleUrl: './detail.scss'
})
export class DetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private detailService = inject(DetailService);
  protected authService = inject(AuthService);
  private toastService = inject(ToastService);

  protected cardId = signal<string | null>(null);
  protected menuItems = signal<DetailMenuItem[]>([]);
  protected selectedMenuId = signal<number | null>(null);
  protected readonly isMenuLoading = signal<boolean>(false);

  // Filter signals
  protected showRead = signal(true);
  protected showUnread = signal(true);

  protected filteredMenuItems = computed(() => {
    const items = this.menuItems();
    const showRead = this.showRead();
    const showUnread = this.showUnread();
    const currentId = this.selectedMenuId();

    // If both checked or both unchecked, show all
    if (showRead === showUnread) {
      return items;
    }

    return items.filter(item => {
      // Always show the currently selected item
      if (item.id === currentId) return true;

      if (showRead && item.isRead) return true;
      if (showUnread && !item.isRead) return true;
      return false;
    });
  });

  protected streamedContentRaw = signal<string>('');
  protected isLoading = signal<boolean>(false);
  protected readonly sidebarSkeletonItems = Array.from({ length: 7 }, (_, index) => index);
  protected readonly contentSkeletonParagraphs = Array.from({ length: 6 }, (_, index) => index);
  protected readonly shouldShowContentSkeleton = computed(
    () => this.isLoading() && !this.streamedContentRaw()
  );

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

  // Chat signals
  protected isChatOpen = signal(false);
  protected chatInput = signal('');
  protected chatMessages = signal<{ role: 'user' | 'ai'; content: string }[]>([]);
  protected isChatLoading = signal(false);
  protected editingMessageIndex = signal<number | null>(null);
  protected editInput = signal('');
  protected activeStreamIndex = signal<number | null>(null);

  private chatSubscription: Subscription | null = null;

  protected showChatButton = computed(() => {
    return !this.isLoading() && !!this.streamedContentRaw() && !!this.selectedMenuId() && this.authService.isLoggedIn() && this.authService.userRole() !== 'user';
  });

  // Dragging signals
  protected isDragging = false;
  protected dragOffset = { x: 0, y: 0 };
  protected chatBtnPosition = signal<{ right: number, bottom: number }>({ right: 30, bottom: 10 }); // Use right/bottom to match initial CSS

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

  selectMenu(id: number, navigate = true, replaceUrl = false) {
    this.selectedMenuId.set(id);
    this.loadAnswer(id);

    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (navigate) {
      this.router.navigate(['/detail', this.cardId(), id], { replaceUrl });
    }
  }

  refreshAnswer() {
    const currentId = this.selectedMenuId();
    if (!currentId || this.isLoading()) return;

    this.loadAnswer(currentId, true); // true indicates refresh
  }

  markAsRead() {
    const currentId = this.selectedMenuId();
    if (!currentId) return;

    const currentItem = this.menuItems().find(item => item.id === currentId);
    if (currentItem?.isRead) return; // 已经是已读状态，不调用接口

    this.detailService.updateReadStatus(currentId, true).subscribe({
      next: (response) => {
        if (response.code === 0) {
          this.menuItems.update(items =>
            items.map(item =>
              item.id === currentId ? { ...item, isRead: true } : item
            )
          );
          this.toastService.show('标记为已读成功', 'success');
        } else {
          console.error('Failed to mark as read:', response.msg);
          this.toastService.show('标记失败: ' + response.msg, 'error');
        }
      },
      error: (err) => {
        console.error('Error marking as read:', err);
        this.toastService.show('标记失败，请稍后重试', 'error');
      }
    });
  }

  markAsUnread() {
    const currentId = this.selectedMenuId();
    if (!currentId) return;

    const currentItem = this.menuItems().find(item => item.id === currentId);
    if (!currentItem?.isRead) return; // 已经是未读状态，不调用接口

    this.detailService.updateReadStatus(currentId, false).subscribe({
      next: (response) => {
        if (response.code === 0) {
          this.menuItems.update(items =>
            items.map(item =>
              item.id === currentId ? { ...item, isRead: false } : item
            )
          );
          this.toastService.show('取消已读成功', 'success');
        } else {
          console.error('Failed to mark as unread:', response.msg);
          this.toastService.show('取消失败: ' + response.msg, 'error');
        }
      },
      error: (err) => {
        console.error('Error marking as unread:', err);
        this.toastService.show('取消失败，请稍后重试', 'error');
      }
    });
  }

  toggleChat() {
    // Simple check: if we moved significantly, it's a drag, not a click.
    // But `toggleChat` is bound to `(click)`.
    // If we handle dragging via mousedown/move/up on the button, the click event might still fire.
    // We can suppress the click logic if we detected a drag.
    if (this.hasDragged) {
      this.hasDragged = false; // Reset for next time
      return;
    }
    this.isChatOpen.update(v => !v);
  }

  private hasDragged = false;

  onDragStart(event: MouseEvent | TouchEvent) {
    this.isDragging = true;
    this.hasDragged = false; // Reset
    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    this.dragOffset = { x: clientX, y: clientY };

    // Prevent default to stop text selection, but we need to be careful not to block click if it's just a click.
    // Only prevent default if we are sure we are dragging? No, standard way is preventDefault on mousedown for drag items.
    // But for a button we want to click...
    // Let's NOT prevent default on start, only on move if needed.
  }

  @HostListener('document:mousemove', ['$event'])
  @HostListener('document:touchmove', ['$event'])
  onDragMove(event: MouseEvent | TouchEvent) {
    if (!this.isDragging) return;

    const clientX = event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
    const clientY = event instanceof MouseEvent ? event.clientY : event.touches[0].clientY;

    const deltaX = this.dragOffset.x - clientX;
    const deltaY = this.dragOffset.y - clientY;

    // Threshold to consider it a drag
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      this.hasDragged = true;
    }

    if (this.hasDragged) {
      if (event.cancelable) event.preventDefault();

      this.chatBtnPosition.update(pos => {
        const newRight = pos.right + deltaX;
        const newBottom = pos.bottom + deltaY;

        // Boundary checks
        // Right/Bottom restricted to bottom-right quadrant
        // Max right: window width (or reasonable margin)
        // Min right: 0
        // Max bottom: window height
        // Min bottom: 0

        // Let's say quadrant implies right < windowWidth/2 and bottom < windowHeight/2
        // But we are using right/bottom CSS properties.
        // right=0 means right edge. right=windowWidth means left edge.
        // We want it in bottom-right quadrant.
        // So newRight should be between 0 and window.innerWidth / 2
        // newBottom should be between 0 and window.innerHeight / 2

        const maxRight = window.innerWidth / 2;
        const maxBottom = window.innerHeight / 2;
        const minRight = 10; // Margin
        const minBottom = 10; // Margin

        const clampedRight = Math.max(minRight, Math.min(newRight, maxRight));
        const clampedBottom = Math.max(minBottom, Math.min(newBottom, maxBottom));

        return {
          right: clampedRight,
          bottom: clampedBottom
        };
      });

      this.dragOffset = { x: clientX, y: clientY };
    }
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onDragEnd() {
    this.isDragging = false;
  }

  startEdit(index: number, content: string) {
    this.editingMessageIndex.set(index);
    this.editInput.set(content);
  }

  cancelEdit() {
    this.editingMessageIndex.set(null);
    this.editInput.set('');
  }

  submitEdit(index: number) {
    const newContent = this.editInput().trim();
    if (!newContent) return;

    const currentId = this.selectedMenuId();
    if (!currentId) return;

    // Update the user message
    this.chatMessages.update(msgs =>
      msgs.map((msg, i) => i === index ? { ...msg, content: newContent } : msg)
    );
    this.editingMessageIndex.set(null);
    this.activeStreamIndex.set(index); // Set active stream index for stop handling

    // Find the corresponding AI response (should be index + 1)
    this.chatMessages.update(msgs => {
      const newMsgs = [...msgs];
      if (index + 1 < newMsgs.length && newMsgs[index + 1].role === 'ai') {
        // Reset existing AI message content to empty string to start fresh stream
        newMsgs[index + 1] = { ...newMsgs[index + 1], content: '' };
      } else {
        // Insert new placeholder
        newMsgs.splice(index + 1, 0, { role: 'ai', content: '' });
      }
      return newMsgs;
    });

    this.isChatLoading.set(true);

    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
    }

    this.chatSubscription = this.detailService.chatWithAI(currentId, newContent).subscribe({
      next: (chunk) => {
        this.chatMessages.update(msgs => {
          const newMsgs = [...msgs];
          const aiIndex = index + 1;
          if (newMsgs[aiIndex]) {
            newMsgs[aiIndex] = {
              ...newMsgs[aiIndex],
              content: newMsgs[aiIndex].content + chunk
            };
          }
          return newMsgs;
        });
      },
      complete: () => {
        this.isChatLoading.set(false);
        this.chatSubscription = null;
        this.activeStreamIndex.set(null);
      },
      error: (err) => {
        console.error('Chat error', err);
        this.toastService.show('Chat error', 'error');
        this.isChatLoading.set(false);
        this.chatSubscription = null;
        this.activeStreamIndex.set(null);
      }
    });
  }

  copyMessage(content: string) {
    navigator.clipboard.writeText(content).then(() => {
      this.toastService.show('复制成功', 'success');
    }).catch(() => {
      this.toastService.show('复制失败', 'error');
    });
  }

  stopGeneration() {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
      this.chatSubscription = null;
    }
    this.isChatLoading.set(false);

    const activeIdx = this.activeStreamIndex();
    if (activeIdx !== null) {
      // Restore user input from the active user message
      const messages = this.chatMessages();
      const activeUserMsg = messages[activeIdx];
      if (activeUserMsg && activeUserMsg.role === 'user') {
        this.chatInput.set(activeUserMsg.content);
      }

      // Remove user message and AI message (index and index+1)
      // We use slice to remove items.
      // Check if activeIdx + 1 exists (it should).
      // If we are removing, we should probably remove both.

      this.chatMessages.update(msgs => {
        const newMsgs = [...msgs];
        // Remove 2 items starting from activeIdx
        newMsgs.splice(activeIdx, 2);
        return newMsgs;
      });

      this.activeStreamIndex.set(null);
    }
  }

  sendChatMessage() {
    const input = this.chatInput().trim();
    const currentId = this.selectedMenuId();
    if (!input || !currentId || this.isChatLoading()) return;

    // Add user message
    this.chatMessages.update(msgs => [...msgs, { role: 'user', content: input }]);

    const userInput = input; // Keep a copy
    this.chatInput.set('');
    this.isChatLoading.set(true);

    // Add empty AI message placeholder immediately
    // We need to know the index of the user message to set activeStreamIndex
    this.chatMessages.update((msgs: any) => {
      const newMsgs = [...msgs, { role: 'ai', content: '' }];
      return newMsgs;
    });

    // User message is at length - 2, AI is at length - 1.
    // Set active stream index to the user message index (Question)
    this.activeStreamIndex.set(this.chatMessages().length - 2);

    this.chatSubscription = this.detailService.chatWithAI(currentId, userInput).subscribe({
      next: (chunk) => {
        this.chatMessages.update(msgs => {
          const newMsgs = [...msgs];
          const lastIdx = newMsgs.length - 1;
          if (newMsgs[lastIdx]) {
            newMsgs[lastIdx] = {
              ...newMsgs[lastIdx],
              content: newMsgs[lastIdx].content + chunk
            };
          }
          return newMsgs;
        });
      },
      complete: () => {
        this.isChatLoading.set(false);
        this.chatSubscription = null;
        this.activeStreamIndex.set(null);
      },
      error: (err) => {
        console.error('Chat error', err);
        this.toastService.show('Chat error', 'error');
        this.isChatLoading.set(false);
        this.chatInput.set(userInput);
        // Remove the failed user message and the empty AI placeholder
        this.chatMessages.update(msgs => msgs.slice(0, -2));
        this.chatSubscription = null;
        this.activeStreamIndex.set(null);
      }
    });
  }


  private loadAnswer(id: number, isRefresh = false) {
    this.streamedContentRaw.set('');
    this.isLoading.set(true);
    this.chatMessages.set([]); // Reset chat history for new question
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
    this.isMenuLoading.set(true);
    this.menuItems.set([]);
    this.selectedMenuId.set(null);
    this.streamedContentRaw.set('');
    this.stopStream();

    this.detailService.getQuestions(id).subscribe({
      next: (data) => {
        this.menuItems.set(data);
        this.isMenuLoading.set(false);

        const hasRouteParam = this.route.snapshot.paramMap.has('menuId');
        if (!hasRouteParam && data.length > 0) {
          const defaultId = data[0].id;
          // Initial load redirection should replace URL to avoid history loops when going back
          this.selectMenu(defaultId, true, true);
        }
      },
      error: (err) => {
        console.error('Error fetching detail questions:', err);
        this.isMenuLoading.set(false);
      }
    });
  }

  // Clear chat when selecting a new menu? Maybe good idea.
  // But let's stick to minimal changes. The requirement implies chat is context sensitive.
  // "question_id" is passed. So if I change question, the chat should probably reset?
  // The prompt doesn't say, but it makes sense.

}
