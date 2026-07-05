import {
  afterNextRender,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideFile,
  LucideFileArchive,
  LucideFileImage,
  LucideFileText,
  LucideRefreshCw,
  LucideRotateCcw,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import {
  FileService,
  UserFile,
} from '../../core/services/file.service';
import { AppSidebar } from '../../shared/components/app-sidebar/app-sidebar';

interface TrashFile {
  id: number;
  name: string;
  type: 'document' | 'image' | 'archive' | 'file';
  size: string;
  deletedAt: string;
}

@Component({
  selector: 'app-trash',
  imports: [
    RouterLink,
    AppSidebar,
    LucideArrowLeft,
    LucideFile,
    LucideFileArchive,
    LucideFileImage,
    LucideFileText,
    LucideRefreshCw,
    LucideRotateCcw,
    LucideSearch,
    LucideTrash2,
  ],
  templateUrl: './trash.html',
  styleUrl: './trash.scss',
})
export class Trash {
  private readonly fileService = inject(FileService);

  readonly loading = signal(false);
  readonly restoringFileId = signal<number | null>(null);
  readonly files = signal<TrashFile[]>([]);
  readonly loadError = signal('');
  readonly restoreMessage = signal('');
  readonly restoreError = signal('');

  constructor() {
    // Keep the first trash request client-side so server rendering can stay lightweight.
    afterNextRender(() => {
      window.setTimeout(() => this.loadTrashFiles(), 0);
    });
  }

  loadTrashFiles(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set('');

    this.fileService.trashList()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (files) => {
          this.files.set(files.map((file) => this.toTrashFile(file)));
        },
        error: () => {
          this.loadError.set('ไม่สามารถโหลดไฟล์ในถังขยะได้');
        },
      });
  }

  restoreFile(file: TrashFile): void {
    if (this.restoringFileId() !== null) {
      return;
    }

    this.restoringFileId.set(file.id);
    this.restoreMessage.set('');
    this.restoreError.set('');

    this.fileService.restore(file.id)
      .pipe(finalize(() => this.restoringFileId.set(null)))
      .subscribe({
        next: () => {
          this.files.update((files) => files.filter((item) => item.id !== file.id));
          this.restoreMessage.set(`กู้คืน "${file.name}" สำเร็จ`);
        },
        error: () => {
          this.restoreError.set('ไม่สามารถกู้คืนไฟล์ได้');
        },
      });
  }

  fileIcon(type: TrashFile['type']): 'image' | 'text' | 'archive' | 'file' {
    if (type === 'image') {
      return 'image';
    }

    if (type === 'document') {
      return 'text';
    }

    if (type === 'archive') {
      return 'archive';
    }

    return 'file';
  }

  private toTrashFile(file: UserFile): TrashFile {
    return {
      id: file.id,
      name: file.originalName,
      type: this.fileType(file),
      size: this.formatFileSize(file.sizeBytes),
      deletedAt: this.formatDate(file.updatedAt),
    };
  }

  private fileType(file: UserFile): TrashFile['type'] {
    const mimeType = file.mimeType.toLowerCase();
    const originalName = file.originalName.toLowerCase();

    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    if (
      mimeType.includes('pdf') ||
      mimeType.includes('document') ||
      mimeType.startsWith('text/')
    ) {
      return 'document';
    }

    if (
      originalName.endsWith('.zip') ||
      originalName.endsWith('.rar') ||
      originalName.endsWith('.7z')
    ) {
      return 'archive';
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

    const units = ['KB', 'MB', 'GB'];
    let size = sizeBytes / 1024;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(size >= 10 ? 1 : 2)} ${units[unitIndex]}`;
  }
}
