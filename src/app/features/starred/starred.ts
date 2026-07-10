import {
  afterNextRender,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  Router,
  RouterLink,
} from '@angular/router';
import {
  LucideArrowLeft,
  LucideDownload,
  LucideFile,
  LucideFileImage,
  LucideFileText,
  LucideFolderOpen,
  LucideGrid3X3,
  LucideList,
  LucideRefreshCw,
  LucideSearch,
  LucideStar,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import {
  FileService,
  StarredFile,
} from '../../core/services/file.service';
import { AppHeader } from '../../shared/components/app-header/app-header';
import { AppSidebar } from '../../shared/components/app-sidebar/app-sidebar';

interface StarredViewFile {
  id: number;
  folderId: number | null;
  name: string;
  type: 'document' | 'image' | 'file';
  mimeType: string;
  size: string;
  starredAt: string;
  updatedAt: string;
}

type StarredViewMode = 'grid' | 'table';

const starredViewModeStorageKey = 'anucloud:starred-view-mode';

@Component({
  selector: 'app-starred',
  imports: [
    RouterLink,
    AppHeader,
    AppSidebar,
    LucideArrowLeft,
    LucideDownload,
    LucideFile,
    LucideFileImage,
    LucideFileText,
    LucideFolderOpen,
    LucideGrid3X3,
    LucideList,
    LucideRefreshCw,
    LucideSearch,
    LucideStar,
  ],
  templateUrl: './starred.html',
  styleUrl: './starred.scss',
})
export class Starred {
  private readonly fileService = inject(FileService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly files = signal<StarredViewFile[]>([]);
  readonly searchTerm = signal('');
  readonly loadError = signal('');
  readonly actionMessage = signal('');
  readonly actionError = signal('');
  readonly downloadingFileId = signal<number | null>(null);
  readonly unstarringFileId = signal<number | null>(null);
  readonly viewMode = signal<StarredViewMode>('grid');

  readonly filteredFiles = computed(() => {
    const keyword = this.searchTerm().trim().toLowerCase();

    if (!keyword) {
      return this.files();
    }

    return this.files().filter((file) => {
      return (
        file.name.toLowerCase().includes(keyword) ||
        file.mimeType.toLowerCase().includes(keyword)
      );
    });
  });

  constructor() {
    afterNextRender(() => {
      this.restoreViewMode();
      window.setTimeout(() => this.loadStarredFiles(), 0);
    });
  }

  loadStarredFiles(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    this.fileService
      .starredFiles()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (files) => {
          this.files.set(files.map((file) => this.toViewFile(file)));
        },
        error: () => {
          this.loadError.set('ไม่สามารถโหลดรายการโปรดได้');
        },
      });
  }

  updateSearchTerm(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  setViewMode(mode: StarredViewMode): void {
    this.viewMode.set(mode);
    localStorage.setItem(starredViewModeStorageKey, mode);
  }

  downloadFile(file: StarredViewFile): void {
    if (this.downloadingFileId() !== null) {
      return;
    }

    this.downloadingFileId.set(file.id);
    this.actionMessage.set('');
    this.actionError.set('');
    this.openDownloadUrl(file.id, file.name);
    this.actionMessage.set('เริ่มดาวน์โหลดไฟล์แล้ว');
    window.setTimeout(() => this.downloadingFileId.set(null), 1000);
  }

  unstarFile(file: StarredViewFile): void {
    if (this.unstarringFileId() !== null) {
      return;
    }

    this.unstarringFileId.set(file.id);
    this.actionMessage.set('');
    this.actionError.set('');

    this.fileService
      .unstar(file.id)
      .pipe(finalize(() => this.unstarringFileId.set(null)))
      .subscribe({
        next: () => {
          this.files.update((files) => files.filter((item) => item.id !== file.id));
          this.actionMessage.set('นำออกจากรายการโปรดแล้ว');
        },
        error: () => {
          this.actionError.set('ไม่สามารถนำไฟล์ออกจากรายการโปรดได้');
        },
      });
  }

  openFileLocation(file: StarredViewFile): void {
    const queryParams = { fileId: file.id };

    if (file.folderId) {
      void this.router.navigate(['/my-drive/folders', file.folderId], { queryParams });
      return;
    }

    void this.router.navigate(['/my-drive'], { queryParams });
  }

  fileIcon(file: StarredViewFile): 'image' | 'text' | 'file' {
    if (file.type === 'image') {
      return 'image';
    }

    if (file.type === 'document') {
      return 'text';
    }

    return 'file';
  }

  private toViewFile(file: StarredFile): StarredViewFile {
    return {
      id: file.id,
      folderId: file.folderId ?? null,
      name: file.originalName,
      type: this.fileType(file),
      mimeType: file.mimeType,
      size: this.formatFileSize(file.sizeBytes),
      starredAt: this.formatDate(file.starredAt),
      updatedAt: this.formatDate(file.updatedAt),
    };
  }

  private fileType(file: StarredFile): StarredViewFile['type'] {
    const mimeType = file.mimeType.toLowerCase();

    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.startsWith('text/')) {
      return 'document';
    }

    return 'file';
  }

  private formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'เมื่อสักครู่';
    }

    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private formatFileSize(sizeBytes: number): string {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    }

    const units = ['KB', 'MB', 'GB', 'TB'];
    let size = sizeBytes / 1024;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
  }

  private openDownloadUrl(fileId: number, fileName: string): void {
    const link = document.createElement('a');

    link.href = this.fileService.downloadUrl(fileId);
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  private restoreViewMode(): void {
    const savedMode = localStorage.getItem(starredViewModeStorageKey);

    if (savedMode === 'grid' || savedMode === 'table') {
      this.viewMode.set(savedMode);
    }
  }
}
