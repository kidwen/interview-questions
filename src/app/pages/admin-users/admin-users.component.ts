import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiUser } from '../../services/auth.service';
import { UserListQuery, UserService } from '../../services/user.service';

type LockFilter = 'all' | 'locked' | 'unlocked';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss'
})
export class AdminUsersComponent implements OnInit {
  private userService = inject(UserService);

  protected readonly users = signal<ApiUser[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly isMutating = signal<boolean>(false);
  protected readonly errorMessage = signal<string>('');
  protected readonly email = signal<string>('');
  protected readonly username = signal<string>('');
  protected readonly lockedFilter = signal<LockFilter>('all');
  protected readonly totalUsers = computed(() => this.users().length);
  protected readonly selectedIds = signal<number[]>([]);

  protected readonly lockFilterOptions: { label: string; value: LockFilter }[] = [
    { label: '全部', value: 'all' },
    { label: '仅锁定', value: 'locked' },
    { label: '仅未锁定', value: 'unlocked' }
  ];

  ngOnInit() {
    this.fetchUsers();
  }

  protected searchUsers() {
    this.fetchUsers();
  }

  protected resetFilters() {
    this.email.set('');
    this.username.set('');
    this.lockedFilter.set('all');
    this.fetchUsers();
  }

  protected formatLockStatus(user: ApiUser) {
    return user.is_locked ? '已锁定' : '正常';
  }

  protected formatRole(role?: string) {
    if (!role) return 'user';
    return role;
  }

  protected isUserSelected(userId: number) {
    return this.selectedIds().includes(userId);
  }

  protected toggleSelection(userId: number, checked: boolean) {
    this.selectedIds.update(current => {
      if (checked) {
        if (current.includes(userId)) return current;
        return [userId];
      }
      return current.filter(id => id !== userId);
    });
  }

  protected changeLockStatus(user: ApiUser, targetState: boolean) {
    if (this.isMutating() || user.is_locked === targetState) return;

    this.isMutating.set(true);
    this.errorMessage.set('');

    this.userService.setUserLockStatus(user.user_id, targetState).subscribe({
      next: (updated) => {
        const updatedUser = updated ?? { ...user, is_locked: targetState };
        this.users.update(list =>
          list.map(item =>
            item.user_id === updatedUser.user_id ? { ...item, is_locked: updatedUser.is_locked } : item
          )
        );
        this.selectedIds.set([updatedUser.user_id]);
        this.isMutating.set(false);
      },
      error: (err) => {
        console.error('Failed to update lock status', err);
        this.errorMessage.set(targetState ? '锁定失败，请稍后重试。' : '解锁失败，请稍后重试。');
        this.isMutating.set(false);
      }
    });
  }

  private fetchUsers() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.selectedIds.set([]);

    const query: UserListQuery = {};
    const emailVal = this.email().trim();
    const usernameVal = this.username().trim();
    const lockFilter = this.lockedFilter();

    if (emailVal) query.email = emailVal;
    if (usernameVal) query.username = usernameVal;
    if (lockFilter === 'locked') query.is_locked = true;
    if (lockFilter === 'unlocked') query.is_locked = false;

    this.userService.getUsers(query).subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.errorMessage.set('加载用户失败，请稍后重试。');
        this.isLoading.set(false);
        this.users.set([]);
      }
    });
  }
}
