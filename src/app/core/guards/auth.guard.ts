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
        const user = authService.currentUser();

        if (!user) {
            return router.createUrlTree(['/login']);
        }

        return user.emailVerified
            ? true
            : router.createUrlTree(['/login'], {
                queryParams: { error: 'email_not_verified' },
            });
    }

    return authService.loadCurrentUser().pipe(
        map((user) => {
            if (!user) {
                return router.createUrlTree(['/login']);
            }

            return user.emailVerified
                ? true
                : router.createUrlTree(['/login'], {
                    queryParams: { error: 'email_not_verified' },
                });
        }),
        catchError(() => {
            return of(router.createUrlTree(['/login']));
        })
    )
}
