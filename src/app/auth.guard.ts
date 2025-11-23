import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  if (isLoggedIn) {
    return true;
  }

  // 如果未登录，且当前不在首页，则跳转到首页
  // 注意：如果已经在首页，应该允许访问（首页有自己的逻辑显示弹窗），否则会造成死循环
  if (state.url !== '/') {
     return router.createUrlTree(['/']);
  }

  return true;
};
