// src/app/core/interceptors/credentials.interceptor.ts

import {
  HttpInterceptorFn,
} from '@angular/common/http';

export const credentialsInterceptor: HttpInterceptorFn = (
  request,
  next,
) => {
  const requestWithCredentials = request.clone({
    withCredentials: true,
  });

  return next(requestWithCredentials);
};