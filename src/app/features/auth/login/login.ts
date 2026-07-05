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

    readonly showPassword = signal(false);
    readonly loading = signal(false);
    readonly errorMessage = signal('');

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
}
