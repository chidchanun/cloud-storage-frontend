import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  LucideBell,
  LucideFile,
  LucideLoaderCircle,
  LucideLogOut,
  LucideSearch,
  LucideSettings,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { FileService, UserFile } from '../../../core/services/file.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    LucideBell,
    LucideFile,
    LucideLoaderCircle,
    LucideLogOut,
    LucideSearch,
    LucideSettings,
  ],
  templateUrl: './app-header.html',
})
export class AppHeader {
  private readonly authService = inject(AuthService);
  private readonly fileService = inject(FileService);
  private readonly router = inject(Router);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly searchPlaceholder = input('ค้นหาไฟล์และโฟลเดอร์');
  readonly showSearch = input(true);
  readonly currentUser = this.authService.currentUser;
  readonly loggingOut = signal(false);
  readonly searchTerm = signal('');
  readonly searching = signal(false);
  readonly searchResults = signal<UserFile[]>([]);
  readonly searchError = signal('');
  readonly searchOpen = signal(false);

  readonly initials = computed(() => {
    const user = this.currentUser();
    const first = user?.firstName?.trim().charAt(0) ?? '';
    const last = user?.lastName?.trim().charAt(0) ?? '';

    return `${first}${last}`.toUpperCase() || 'A';
  });

  readonly profileImageUrl = computed(() => {
    const picturePath = this.currentUser()?.picturePath?.trim();

    if (!picturePath) {
      return null;
    }

    if (/^https?:\/\//i.test(picturePath)) {
      return picturePath;
    }

    const apiOrigin = environment.apiUrl.replace(/\/api\/?$/i, '');
    const normalizedPath = picturePath.startsWith('/') ? picturePath : `/${picturePath}`;

    return `${apiOrigin}${normalizedPath}`;
  });

  logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);

    this.authService
      .logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/login']),
        error: () => this.router.navigate(['/login']),
      });
  }

  onSearchInput(value: string): void {
    const keyword = value.trim();
    this.searchTerm.set(value);
    this.searchError.set('');

    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }

    if (keyword.length < 2) {
      this.searching.set(false);
      this.searchResults.set([]);
      this.searchOpen.set(false);
      return;
    }

    this.searchOpen.set(true);
    this.searching.set(true);
    this.searchTimer = setTimeout(() => this.searchFiles(keyword), 250);
  }

  openSearchResults(): void {
    if (this.searchTerm().trim().length >= 2) {
      this.searchOpen.set(true);
    }
  }

  closeSearchResults(): void {
    window.setTimeout(() => this.searchOpen.set(false), 150);
  }

  openSearchResult(file: UserFile): void {
    this.searchOpen.set(false);

    if (file.folderId) {
      this.router.navigate(['/my-drive/folders', file.folderId], {
        queryParams: { fileId: file.id },
      });
      return;
    }

    this.router.navigate(['/my-drive'], {
      queryParams: { fileId: file.id },
    });
  }

  private searchFiles(keyword: string): void {
    this.fileService
      .search(keyword)
      .pipe(finalize(() => this.searching.set(false)))
      .subscribe({
        next: (files) => {
          if (this.searchTerm().trim() === keyword) {
            this.searchResults.set(files);
            this.searchOpen.set(true);
          }
        },
        error: () => {
          this.searchResults.set([]);
          this.searchError.set('ไม่สามารถค้นหาไฟล์ได้');
          this.searchOpen.set(true);
        },
      });
  }
}
