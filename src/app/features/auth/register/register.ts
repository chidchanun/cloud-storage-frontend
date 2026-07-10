import {
  Component,
  inject,
  signal,
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';

import { RouterLink } from '@angular/router';

import {
  LucideEye,
  LucideEyeOff,
  LucideImage,
  LucideLockKeyhole,
  LucideMail,
  LucidePhone,
  LucideUpload,
  LucideUser,
  LucideUserPlus,
  LucideX,
} from '@lucide/angular';

import {
  AuthService,
  RegisterRequest,
} from '../../../core/services/auth.service';

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword
    ? null
    : { passwordMismatch: true };
};

export const passwordStrengthValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = String(control.value ?? '');

  if (!password) {
    return null;
  }

  const errors: ValidationErrors = {};

  if (password.length < 8) {
    errors['minLengthRule'] = true;
  }

  if (!/[A-Z]/.test(password)) {
    errors['uppercaseRule'] = true;
  }

  if (!/\d/.test(password)) {
    errors['numberRule'] = true;
  }

  if (!/[^A-Za-z0-9\s]/.test(password)) {
    errors['specialCharacterRule'] = true;
  }

  return Object.keys(errors).length > 0 ? errors : null;
};

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideUser,
    LucidePhone,
    LucideMail,
    LucideLockKeyhole,
    LucideEye,
    LucideEyeOff,
    LucideUserPlus,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly profilePicture = signal<File | null>(null);
  readonly profilePreviewUrl = signal<string | null>(null);

  readonly registerForm = this.formBuilder.nonNullable.group(
    {
      firstName: ['', [
        Validators.required,
      ]],
      lastName: ['', [
        Validators.required,
      ]],
      phoneNumber: ['', [
        Validators.required,
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
      ]],
      password: ['', [
        Validators.required,
        Validators.maxLength(64),
        passwordStrengthValidator,
      ]],
      confirmPassword: ['', [
        Validators.required,
      ]],
    },
    {
      validators: passwordMatchValidator,
    },
  );

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((value) => !value);
  }

  passwordValue(): string {
    return this.registerForm.controls.password.value;
  }

  passwordHasMinLength(): boolean {
    return this.passwordValue().length >= 8;
  }

  passwordHasUppercase(): boolean {
    return /[A-Z]/.test(this.passwordValue());
  }

  passwordHasNumber(): boolean {
    return /\d/.test(this.passwordValue());
  }

  passwordHasSpecialCharacter(): boolean {
    return /[^A-Za-z0-9\s]/.test(this.passwordValue());
  }

  selectProfilePicture(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file) {
      this.clearProfilePicture();
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('กรุณาเลือกรูปภาพเท่านั้น');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB');
      input.value = '';
      return;
    }

    this.errorMessage.set('');
    this.profilePicture.set(file);

    const reader = new FileReader();
    reader.onload = () => {
      this.profilePreviewUrl.set(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  clearProfilePicture(): void {
    this.profilePicture.set(null);
    this.profilePreviewUrl.set(null);
  }

  submit(): void {
    if (this.registerForm.invalid || this.loading()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const {
      confirmPassword: _confirmPassword,
      ...formValue
    } = this.registerForm.getRawValue();

    const payload: RegisterRequest = formValue;
    this.authService.register(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.successMessage.set('Verify your email. We sent a confirmation link to your inbox.');
        this.registerForm.reset();
        this.clearProfilePicture();
      },
      error: (error) => {
        this.loading.set(false);

        this.errorMessage.set(
          error.status === 400
            ? 'กรุณากรอกข้อมูลให้ครบถ้วน'
            : 'ไม่สามารถสมัครบัญชีได้',
        );
      },
    });
  }
}
