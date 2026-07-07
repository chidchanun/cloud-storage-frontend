import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCamera,
  LucideCheck,
  LucideLoaderCircle,
  LucideMail,
  LucidePhone,
  LucideRotateCcw,
  LucideSave,
  LucideShieldCheck,
  LucideX,
  LucideUser,
  LucideZoomIn,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AppSidebar } from '../../../shared/components/app-sidebar/app-sidebar';
import { environment } from '../../../../environments/environment';

type ProfileFormField = 'firstName' | 'lastName' | 'phoneNumber';

type ProfileFormValue = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
};

@Component({
  selector: 'app-update-profile',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AppSidebar,
    LucideArrowLeft,
    LucideCamera,
    LucideCheck,
    LucideLoaderCircle,
    LucideMail,
    LucidePhone,
    LucideRotateCcw,
    LucideSave,
    LucideShieldCheck,
    LucideX,
    LucideUser,
    LucideZoomIn,
  ],
  templateUrl: './update-profile.html',
  styleUrl: './update-profile.scss',
})
export class UpdateProfile implements OnDestroy {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;
  readonly saving = signal(false);
  readonly uploadingPicture = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly pictureMessage = signal('');
  readonly pictureError = signal('');
  readonly picturePreviewUrl = signal<string | null>(null);
  readonly cropImageUrl = signal<string | null>(null);
  readonly cropX = signal(50);
  readonly cropY = signal(50);
  readonly cropZoom = signal(1);

  private originalProfile: ProfileFormValue = {
    firstName: '',
    lastName: '',
    phoneNumber: '',
  };

  private previewObjectUrl: string | null = null;
  private cropObjectUrl: string | null = null;
  private selectedProfilePicture: File | null = null;
  private formInitialized = false;

  readonly profileForm = this.formBuilder.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    phoneNumber: [
      '',
      [
        Validators.required,
        Validators.minLength(9),
        Validators.maxLength(20),
        Validators.pattern(/^[0-9+()\-\s]+$/),
      ],
    ],
  });

  readonly initials = computed(() => {
    const user = this.currentUser();
    const first = user?.firstName?.trim().charAt(0) ?? '';
    const last = user?.lastName?.trim().charAt(0) ?? '';

    return `${first}${last}`.toUpperCase() || 'U';
  });

  readonly profileImageUrl = computed(() => {
    const preview = this.picturePreviewUrl();

    if (preview) {
      return preview;
    }

    const picturePath = this.currentUser()?.picturePath?.trim();

    if (!picturePath) {
      return null;
    }

    if (/^https?:\/\//i.test(picturePath)) {
      return picturePath;
    }

    const apiOrigin = environment.apiUrl.replace(/\/api\/?$/i, '');
    const normalizedPath = picturePath.startsWith('/')
      ? picturePath
      : `/${picturePath}`;

    return `${apiOrigin}${normalizedPath}`;
  });

  constructor() {
    this.populateForm();

    afterNextRender(() => {
      if (this.formInitialized) {
        return;
      }

      const user = this.currentUser();

      if (user) {
        this.populateForm();
        return;
      }

      this.authService.loadCurrentUserStrict().subscribe({
        next: () => this.populateForm(),
        error: () => {
          this.errorMessage.set('ไม่สามารถโหลดข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง');
        },
      });
    });
  }

  saveProfile(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const value = this.profileForm.getRawValue();

    this.saving.set(true);

    this.authService
      .updateProfile({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        phoneNumber: value.phoneNumber.trim(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          this.originalProfile = {
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            phoneNumber: response.user.phoneNumber,
          };

          this.profileForm.reset(this.originalProfile);
          this.profileForm.markAsPristine();
          this.successMessage.set(
            response.message || 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว',
          );
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage.set(
            this.readApiMessage(
              error,
              'ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง',
            ),
          );
        },
      });
  }

  resetForm(): void {
    this.profileForm.reset(this.originalProfile);
    this.profileForm.markAsPristine();
    this.profileForm.markAsUntouched();
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  selectProfilePicture(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }

    this.pictureMessage.set('');
    this.pictureError.set('');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      this.pictureError.set('รองรับเฉพาะไฟล์ JPG, PNG, GIF หรือ WebP');
      return;
    }

    if (file.size > maxSize) {
      this.pictureError.set('รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB');
      return;
    }

    this.openCropDialog(file);
  }

  cancelCrop(): void {
    this.selectedProfilePicture = null;
    this.releaseCropUrl();
  }

  updateCropX(event: Event): void {
    this.cropX.set(Number((event.target as HTMLInputElement).value));
  }

  updateCropY(event: Event): void {
    this.cropY.set(Number((event.target as HTMLInputElement).value));
  }

  updateCropZoom(event: Event): void {
    this.cropZoom.set(Number((event.target as HTMLInputElement).value));
  }

  async applyProfileCrop(): Promise<void> {
    const file = this.selectedProfilePicture;

    if (!file || !this.cropImageUrl()) {
      return;
    }

    try {
      const croppedFile = await this.createCroppedProfileFile(file);
      this.cancelCrop();
      this.uploadCroppedProfilePicture(croppedFile);
    } catch {
      this.pictureError.set('ไม่สามารถครอปรูปนี้ได้ กรุณาลองเลือกรูปใหม่อีกครั้ง');
    }
  }

  private uploadCroppedProfilePicture(file: File): void {
    this.releasePreviewUrl();
    this.previewObjectUrl = URL.createObjectURL(file);
    this.picturePreviewUrl.set(this.previewObjectUrl);
    this.uploadingPicture.set(true);

    this.authService
      .uploadProfilePicture(file)
      .pipe(finalize(() => this.uploadingPicture.set(false)))
      .subscribe({
        next: (response) => {
          this.releasePreviewUrl();
          this.picturePreviewUrl.set(null);
          this.pictureMessage.set(
            response.message || 'อัปเดตรูปโปรไฟล์เรียบร้อยแล้ว',
          );
        },
        error: (error: HttpErrorResponse) => {
          this.releasePreviewUrl();
          this.picturePreviewUrl.set(null);
          this.pictureError.set(
            this.readApiMessage(
              error,
              'ไม่สามารถอัปโหลดรูปโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง',
            ),
          );
        },
      });
  }

  isInvalid(field: ProfileFormField): boolean {
    const control = this.profileForm.controls[field];
    return control.invalid && (control.dirty || control.touched);
  }

  fieldError(field: ProfileFormField): string {
    const control = this.profileForm.controls[field];

    if (control.hasError('required')) {
      return 'กรุณากรอกข้อมูลในช่องนี้';
    }

    if (control.hasError('maxlength')) {
      return 'ข้อมูลยาวเกินกว่าที่กำหนด';
    }

    if (control.hasError('minlength')) {
      return 'กรุณากรอกเบอร์โทรศัพท์อย่างน้อย 9 ตัวอักษร';
    }

    if (control.hasError('pattern')) {
      return 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง';
    }

    return '';
  }

  ngOnDestroy(): void {
    this.releasePreviewUrl();
    this.releaseCropUrl();
  }

  private populateForm(): void {
    const user = this.currentUser();

    if (!user) {
      return;
    }

    this.originalProfile = {
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phoneNumber: user.phoneNumber ?? '',
    };

    this.profileForm.reset(this.originalProfile);
    this.profileForm.markAsPristine();
    this.formInitialized = true;
  }

  private releasePreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  private openCropDialog(file: File): void {
    this.selectedProfilePicture = file;
    this.releaseCropUrl();
    this.cropObjectUrl = URL.createObjectURL(file);
    this.cropImageUrl.set(this.cropObjectUrl);
    this.cropX.set(50);
    this.cropY.set(50);
    this.cropZoom.set(1);
  }

  private releaseCropUrl(): void {
    if (this.cropObjectUrl) {
      URL.revokeObjectURL(this.cropObjectUrl);
      this.cropObjectUrl = null;
    }

    this.cropImageUrl.set(null);
  }

  private async createCroppedProfileFile(file: File): Promise<File> {
    const image = await this.loadImage(this.cropImageUrl() ?? '');
    const canvas = document.createElement('canvas');
    const outputSize = 512;
    const zoom = this.cropZoom();
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const maxSourceX = Math.max(image.naturalWidth - sourceSize, 0);
    const maxSourceY = Math.max(image.naturalHeight - sourceSize, 0);
    const sourceX = maxSourceX * (this.cropX() / 100);
    const sourceY = maxSourceY * (this.cropY() / 100);
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('canvas context is not available');
    }

    canvas.width = outputSize;
    canvas.height = outputSize;
    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      outputSize,
      outputSize,
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.9),
    );

    if (!blob) {
      throw new Error('cannot create cropped image');
    }

    const safeName = file.name.replace(/\.[^.]+$/, '') || 'profile';
    return new File([blob], `${safeName}-profile.webp`, { type: 'image/webp' });
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('cannot load image'));
      image.src = url;
    });
  }

  private readApiMessage(error: HttpErrorResponse, fallback: string): string {
    const payload = error.error as
      | { message?: string; error?: string }
      | string
      | null;

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      return payload.message || payload.error || fallback;
    }

    return fallback;
  }
}
