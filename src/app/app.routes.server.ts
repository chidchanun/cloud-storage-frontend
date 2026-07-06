import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Server,
  },
  {
    path: 'my-drive',
    renderMode: RenderMode.Server,
  },
  {
    path: 'my-drive/folders/:id',
    renderMode: RenderMode.Server,
  },
  {
    path: 'trash',
    renderMode: RenderMode.Server,
  },
  {
    path: 'shared-with-me',
    renderMode: RenderMode.Server,
  },
  {
    path: 'login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'register',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
