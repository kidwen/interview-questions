import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home';
import { DetailComponent } from './pages/detail/detail';
import { authGuard } from './auth.guard';

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
  { path: '**', redirectTo: '' }
];
