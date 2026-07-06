import { afterNextRender, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideDownload,
  LucideFile,
  LucideFileArchive,
  LucideFileImage,
  LucideFileText,
  LucidePencil,
  LucideRefreshCw,
  LucideSearch,
  LucideShare2,
  LucideX,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { FileService, SharedWithMeFile } from '../../core/services/file.service';
import { AppSidebar } from '../../shared/components/app-sidebar/app-sidebar';

interface SharedFileItem {
  id: number;
  fileId: number;
  name: string;
  type: 'document' | 'image' | 'archive' | 'file';
  permission: string;
  expiresAt: string;
  expiresAtTime: number | null;
}

@Component({
  selector: 'app-shared-with-me',
  imports: [
    RouterLink,
    AppSidebar,
    LucideArrowLeft,
    LucideDownload,
    LucideFile,
    LucideFileArchive,
    LucideFileImage,
    LucideFileText,
    LucidePencil,
    LucideRefreshCw,
    LucideSearch,
    LucideShare2,
    LucideX,
  ],
  templateUrl: './shared-with-me.html',
  styleUrl: './shared-with-me.scss',
})
export class SharedWithMe {
  private readonly fileService = inject(FileService);

  readonly loading = signal(false);
  readonly files = signal<SharedFileItem[]>([]);
  readonly downloadingFileId = signal<number | null>(null);
  readonly renameTarget = signal<SharedFileItem | null>(null);
  readonly renamingFileId = signal<number | null>(null);
  readonly renameName = signal('');
  readonly loadError = signal('');
  readonly actionMessage = signal('');
  readonly actionError = signal('');
  readonly renameError = signal('');
  readonly searchTerm = signal('');
  readonly filteredFiles = computed(() => {
    const keyword = this.searchTerm().trim().toLowerCase();

    if (!keyword) {
      return this.files();
    }

    return this.files().filter((file) => {
      return (
        file.name.toLowerCase().includes(keyword) || file.permission.toLowerCase().includes(keyword)
      );
    });
  });

  constructor() {
    // Load shared files only in the browser, keeping SSR quick and cookie-safe.
    afterNextRender(() => {
      window.setTimeout(() => this.loadSharedFiles(), 0);
    });
  }

  loadSharedFiles(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    this.fileService
      .sharedWithMe()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (files) => {
          this.files.set(files.map((file) => this.toSharedFileItem(file)));
        },
        error: () => {
          this.loadError.set('ไม่สามารถโหลดไฟล์ที่แชร์กับคุณได้');
        },
      });
  }

  canEdit(file: SharedFileItem): boolean {
    return file.permission === 'editor';
  }

  downloadFile(file: SharedFileItem): void {
    if (!this.canEdit(file) || this.downloadingFileId() !== null) {
      return;
    }

    this.downloadingFileId.set(file.fileId);
    this.actionMessage.set('');
    this.actionError.set('');

    this.fileService
      .download(file.fileId)
      .pipe(finalize(() => this.downloadingFileId.set(null)))
      .subscribe({
        next: (blob) => {
          this.saveBlob(blob, file.name);
          this.actionMessage.set(`ดาวน์โหลด "${file.name}" สำเร็จ`);
        },
        error: () => {
          this.actionError.set('ไม่สามารถดาวน์โหลดไฟล์นี้ได้');
        },
      });
  }

  openRenameDialog(file: SharedFileItem): void {
    if (!this.canEdit(file)) {
      return;
    }

    this.renameTarget.set(file);
    this.renameName.set(file.name);
    this.renameError.set('');
    this.actionMessage.set('');
    this.actionError.set('');
  }

  cancelRename(): void {
    if (this.renamingFileId() !== null) {
      return;
    }

    this.renameTarget.set(null);
    this.renameName.set('');
    this.renameError.set('');
  }

  submitRename(event?: Event): void {
    event?.preventDefault();

    const file = this.renameTarget();
    const nextName = this.renameName().trim();

    if (!file || !this.canEdit(file) || this.renamingFileId() !== null) {
      return;
    }

    if (!nextName) {
      this.renameError.set('กรุณากรอกชื่อไฟล์');
      return;
    }

    this.renamingFileId.set(file.fileId);
    this.renameError.set('');

    this.fileService
      .rename({
        fileId: file.fileId,
        originalName: nextName,
      })
      .pipe(finalize(() => this.renamingFileId.set(null)))
      .subscribe({
        next: (response) => {
          this.files.update((files) =>
            files.map((item) =>
              item.fileId === file.fileId
                ? {
                    ...item,
                    name: response.originalName,
                    type: this.fileType(response.originalName),
                  }
                : item,
            ),
          );
          this.actionMessage.set(`เปลี่ยนชื่อเป็น "${response.originalName}" แล้ว`);
          this.cancelRename();
        },
        error: () => {
          this.renameError.set('ไม่สามารถเปลี่ยนชื่อไฟล์นี้ได้');
        },
      });
  }

  private toSharedFileItem(file: SharedWithMeFile): SharedFileItem {
    const expiresAtTime = file.expiresAt ? new Date(file.expiresAt).getTime() : null;

    return {
      id: file.id,
      fileId: file.fileId,
      name: file.fileName,
      type: this.fileType(file.fileName),
      permission: file.permission.toLowerCase(),
      expiresAt: file.expiresAt ? this.formatDate(file.expiresAt) : 'ไม่มีวันหมดอายุ',
      expiresAtTime: expiresAtTime !== null && !Number.isNaN(expiresAtTime) ? expiresAtTime : null,
    };
  }

  private fileType(fileName: string): SharedFileItem['type'] {
    const name = fileName.toLowerCase();

    if (name.match(/\.(png|jpe?g|gif|webp|svg)$/)) {
      return 'image';
    }

    if (name.match(/\.(pdf|docx?|xlsx?|pptx?|txt|md)$/)) {
      return 'document';
    }

    if (name.match(/\.(zip|rar|7z|tar|gz)$/)) {
      return 'archive';
    }

    return 'file';
  }

  private formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'ไม่ทราบวันหมดอายุ';
    }

    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}
