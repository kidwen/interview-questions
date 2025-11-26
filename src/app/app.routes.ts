import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { DetailComponent } from './pages/detail/detail';
import { PromptsComponent } from './pages/prompts/prompts.component';
import { AdminUsersComponent } from './pages/admin-users/admin-users.component';
import { authGuard } from './auth.guard';
import { adminGuard } from './admin.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { 
    path: 'detail/:id', 
    component: DetailComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'detail/:id/:menuId', 
    component: DetailComponent,
    canActivate: [authGuard] 
  },
  {
    path: 'prompts',
    component: PromptsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'admin/users',
    component: AdminUsersComponent,
    canActivate: [authGuard, adminGuard]
  },
  { path: '**', redirectTo: '' }
];
