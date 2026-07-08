import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';

import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';

import { routes } from './app.routes';
import {
  credentialsInterceptor,
} from './core/interceptors/credentials.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    provideHttpClient(
      // Use the default XHR backend so HttpClient can emit UploadProgress events.
      withInterceptors([
        credentialsInterceptor,
      ]),
    ),
  ],
};
