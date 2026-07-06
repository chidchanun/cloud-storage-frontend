import {
    Component,
    inject,
    signal,
} from '@angular/core';

import {
    FormBuilder,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';

import {
    LucideEye,
    LucideEyeOff,
    LucideLockKeyhole,
    LucideMail,
} from '@lucide/angular';

import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        LucideMail,
        LucideLockKeyhole,
        LucideEye,
        LucideEyeOff,
    ],
    templateUrl: './login.html',
    styleUrl: './login.scss',
})
export class LoginComponent {
    private readonly formBuilder = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly showPassword = signal(false);
    readonly loading = signal(false);
    readonly errorMessage = signal('');
    readonly successMessage = signal('');

    readonly loginForm = this.formBuilder.nonNullable.group({
        email: ['', [
            Validators.required,
            Validators.email,
        ]],
        password: ['', [
            Validators.required,
            Validators.minLength(8),
        ]],
    });

    constructor() {
        const googleError = this.route.snapshot.queryParamMap.get('error');
        const verified = this.route.snapshot.queryParamMap.get('verified');

        if (googleError) {
            this.errorMessage.set(this.googleErrorMessage(googleError));
        }

        if (verified === '1') {
            this.successMessage.set('Email verified successfully. You can login now.');
        }
    }

    togglePassword(): void {
        this.showPassword.update((value) => !value);
    }

    submit(): void {
        if (this.loginForm.invalid || this.loading()) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        this.errorMessage.set('');
        this.successMessage.set('');

        this.authService.login(this.loginForm.getRawValue()).subscribe({
            next: () => {
                this.router.navigateByUrl('/dashboard');
            },
            error: (error) => {
                this.loading.set(false);

                this.errorMessage.set(
                    error.status === 401
                        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
                        : 'ไม่สามารถเข้าสู่ระบบได้',
                );
            },
        });
    }

    loginWithGoogle(): void {
        this.errorMessage.set('');
        this.successMessage.set('');
        window.location.href = this.authService.getGoogleLoginUrl();
    }

    private googleErrorMessage(errorCode: string): string {
        const messages: Record<string, string> = {
            google_not_configured: 'Google login is not configured yet.',
            google_login_cancelled: 'Google login was cancelled.',
            invalid_oauth_state: 'Google login session expired. Please try again.',
            missing_authorization_code: 'Google did not return a login code.',
            invalid_google_token: 'Google login token is invalid.',
            google_email_not_verified: 'Your Google email is not verified.',
            google_account_conflict: 'This email is linked to another Google account.',
            invalid_google_identity: 'Google account information is incomplete.',
            session_creation_failed: 'Cannot create login session.',
            google_session_failed: 'Cannot verify Google login session.',
            email_verification_failed: 'Email verification link is invalid or expired.',
            email_not_verified: 'Please verify your email before using AnuCloud.',
        };

        return messages[errorCode] ?? 'Cannot login with Google. Please try again.';
    }
}
