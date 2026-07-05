// src/app/core/guards/auth.guard.ts

import {
    inject,
    PLATFORM_ID,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';

import {
    CanActivateFn,
    Router,
} from '@angular/router';

import {
    catchError,
    map,
    of,
} from 'rxjs';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (isPlatformServer(platformId)) {
        return true;
    }

    if (authService.authChecked()) {
        return authService.isAuthenticated()
            ? true
            : router.createUrlTree(['/login']);
    }

    return authService.loadCurrentUser().pipe(
        map((user) => {
            return user
                ? true
                : router.createUrlTree(['/login']);
        }),
        catchError(() => {
            return of(router.createUrlTree(['/login']));
        })
    )
}
