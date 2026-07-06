import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-google-callback',
    standalone: true,
    template: `
        <main class="grid min-h-dvh place-items-center bg-slate-50 px-6 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
            <section class="grid gap-4 text-center">
                <div class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 dark:border-slate-800 dark:border-t-cyan-300"></div>
                <h1 class="m-0 text-2xl font-black">Signing you in...</h1>
                <p class="m-0 text-sm font-medium text-slate-500 dark:text-slate-400">Please wait while AnuCloud checks your Google session.</p>
            </section>
        </main>
    `,
})
export class GoogleCallbackComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly platformId = inject(PLATFORM_ID);

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const errorCode = this.route.snapshot.queryParamMap.get('error');

        if (errorCode) {
            this.router.navigate(['/login'], {
                queryParams: { error: errorCode },
                replaceUrl: true,
            });
            return;
        }

        this.authService.loadCurrentUserStrict().subscribe({
            next: (user) => {
                this.router.navigateByUrl(user ? '/dashboard' : '/login?error=google_session_failed', {
                    replaceUrl: true,
                });
            },
            error: () => {
                this.authService.currentUser.set(null);
                this.authService.authChecked.set(true);

                this.router.navigate(['/login'], {
                    queryParams: { error: 'google_session_failed' },
                    replaceUrl: true,
                });
            },
        });
    }
}
