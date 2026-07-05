// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/home/home')
        .then((module) => module.Home),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard')
        .then((module) => module.Dashboard),
  },
  {
    path: 'my-drive',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-drive/my-drive')
        .then((module) => module.MyDrive),
  },
  {
    path: 'my-drive/folders/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/my-drive/my-drive')
        .then((module) => module.MyDrive),
  },
  {
    path: 'trash',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/trash/trash')
        .then((module) => module.Trash),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then((module) => module.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register')
        .then((module) => module.Register),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
