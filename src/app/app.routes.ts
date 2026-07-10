// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/home/home').then((module) => module.Home),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard').then((module) => module.Dashboard),
  },
  {
    path: 'my-drive',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-drive/my-drive').then((module) => module.MyDrive),
  },
  {
    path: 'my-drive/folders/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-drive/my-drive').then((module) => module.MyDrive),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/update-profile/update-profile').then(
        (module) => module.UpdateProfile,
      ),
  },
  {
    path: 'plans',
    canActivate: [authGuard],
    loadComponent: () => import('./features/plans/plans').then((module) => module.Plans),
  },
  {
    path: 'trash',
    canActivate: [authGuard],
    loadComponent: () => import('./features/trash/trash').then((module) => module.Trash),
  },
  {
    path: 'starred',
    canActivate: [authGuard],
    loadComponent: () => import('./features/starred/starred').then((module) => module.Starred),
  },
  {
    path: 'starred/folders/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/starred/starred').then((module) => module.Starred),
  },
  {
    path: 'recent',
    canActivate: [authGuard],
    loadComponent: () => import('./features/recent/recent').then((module) => module.Recent),
  },
  {
    path: 'shared-with-me',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/shared-with-me/shared-with-me').then((module) => module.SharedWithMe),
  },
  {
    path: 'shared-with-me/folders/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-drive/my-drive').then((module) => module.MyDrive),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((module) => module.LoginComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/google-callback/google-callback').then(
        (module) => module.GoogleCallbackComponent,
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then((module) => module.Register),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
