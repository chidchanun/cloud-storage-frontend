import {
  afterNextRender,
  Component,
  computed,
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
import {
  catchError,
  finalize,
  forkJoin,
  map,
  of,
} from 'rxjs';

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

type DeleteMode = 'single' | 'selected' | 'all';

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
  readonly deletingFileId = signal<number | null>(null);
  readonly deleteTarget = signal<TrashFile | null>(null);
  readonly deleteMode = signal<DeleteMode | null>(null);
  readonly bulkDeleting = signal(false);
  readonly selectedFileIds = signal<Set<number>>(new Set());
  readonly files = signal<TrashFile[]>([]);
  readonly loadError = signal('');
  readonly restoreMessage = signal('');
  readonly restoreError = signal('');
  readonly deleteMessage = signal('');
  readonly deleteError = signal('');
  readonly selectedFileCount = computed(() => this.selectedFileIds().size);
  readonly selectedFiles = computed(() => {
    const selectedIds = this.selectedFileIds();

    return this.files().filter((file) => selectedIds.has(file.id));
  });
  readonly allFilesSelected = computed(() => {
    const files = this.files();

    return files.length > 0 && files.every((file) => this.selectedFileIds().has(file.id));
  });

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
          this.selectedFileIds.set(new Set());
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
    this.deleteMessage.set('');
    this.deleteError.set('');

    this.fileService.restore(file.id)
      .pipe(finalize(() => this.restoringFileId.set(null)))
      .subscribe({
        next: () => {
          this.files.update((files) => files.filter((item) => item.id !== file.id));
          this.selectedFileIds.update((selectedIds) => {
            const nextSelectedIds = new Set(selectedIds);
            nextSelectedIds.delete(file.id);

            return nextSelectedIds;
          });
          this.restoreMessage.set(`กู้คืน "${file.name}" สำเร็จ`);
        },
        error: () => {
          this.restoreError.set('ไม่สามารถกู้คืนไฟล์ได้');
        },
      });
  }

  deleteFile(file: TrashFile): void {
    if (this.deletingFileId() !== null) {
      return;
    }

    this.deleteTarget.set(file);
    this.deleteMode.set('single');
    this.deleteMessage.set('');
    this.deleteError.set('');
    this.restoreMessage.set('');
    this.restoreError.set('');
  }

  cancelDeleteFile(): void {
    if (this.deletingFileId() !== null || this.bulkDeleting()) {
      return;
    }

    this.deleteTarget.set(null);
    this.deleteMode.set(null);
    this.deleteError.set('');
  }

  confirmDeleteFile(): void {
    const mode = this.deleteMode();

    if (mode === 'selected' || mode === 'all') {
      this.confirmBulkDeleteFiles(mode);
      return;
    }

    const file = this.deleteTarget();

    if (!file || this.deletingFileId() !== null) {
      return;
    }

    this.deletingFileId.set(file.id);
    this.deleteMessage.set('');
    this.deleteError.set('');

    this.fileService.permanentDelete(file.id)
      .pipe(finalize(() => this.deletingFileId.set(null)))
      .subscribe({
        next: () => {
          this.files.update((files) => files.filter((item) => item.id !== file.id));
          this.selectedFileIds.update((selectedIds) => {
            const nextSelectedIds = new Set(selectedIds);
            nextSelectedIds.delete(file.id);

            return nextSelectedIds;
          });
          this.deleteMessage.set(`ลบ "${file.name}" ถาวรสำเร็จ`);
          this.deleteTarget.set(null);
          this.deleteMode.set(null);
        },
        error: () => {
          this.deleteError.set('ไม่สามารถลบไฟล์ถาวรได้');
        },
      });
  }

  isFileSelected(fileId: number): boolean {
    return this.selectedFileIds().has(fileId);
  }

  toggleFileSelection(file: TrashFile, event?: Event): void {
    event?.stopPropagation();

    this.selectedFileIds.update((selectedIds) => {
      const nextSelectedIds = new Set(selectedIds);

      if (nextSelectedIds.has(file.id)) {
        nextSelectedIds.delete(file.id);
      } else {
        nextSelectedIds.add(file.id);
      }

      return nextSelectedIds;
    });
  }

  toggleSelectAllFiles(): void {
    if (this.allFilesSelected()) {
      this.selectedFileIds.set(new Set());
      return;
    }

    this.selectedFileIds.set(new Set(this.files().map((file) => file.id)));
  }

  clearFileSelection(): void {
    if (this.bulkDeleting()) {
      return;
    }

    this.selectedFileIds.set(new Set());
  }

  deleteSelectedFiles(): void {
    if (this.selectedFileCount() === 0 || this.bulkDeleting()) {
      return;
    }

    this.deleteMode.set('selected');
    this.deleteTarget.set(null);
    this.deleteMessage.set('');
    this.deleteError.set('');
    this.restoreMessage.set('');
    this.restoreError.set('');
  }

  deleteAllFiles(): void {
    if (this.files().length === 0 || this.bulkDeleting()) {
      return;
    }

    this.deleteMode.set('all');
    this.deleteTarget.set(null);
    this.deleteMessage.set('');
    this.deleteError.set('');
    this.restoreMessage.set('');
    this.restoreError.set('');
  }

  deleteDialogOpen(): boolean {
    return this.deleteTarget() !== null || this.deleteMode() === 'selected' || this.deleteMode() === 'all';
  }

  deleteDialogTitle(): string {
    const mode = this.deleteMode();

    if (mode === 'selected') {
      return 'ลบไฟล์ที่เลือกถาวร?';
    }

    if (mode === 'all') {
      return 'ลบไฟล์ทั้งหมดถาวร?';
    }

    return 'ลบไฟล์ถาวร?';
  }

  deleteDialogDescription(): string {
    const mode = this.deleteMode();

    if (mode === 'selected') {
      return `ไฟล์ ${this.selectedFileCount()} รายการจะถูกลบออกจากเซิร์ฟเวอร์และไม่สามารถกู้คืนได้`;
    }

    if (mode === 'all') {
      return `ไฟล์ทั้งหมด ${this.files().length} รายการในถังขยะจะถูกลบออกจากเซิร์ฟเวอร์และไม่สามารถกู้คืนได้`;
    }

    const file = this.deleteTarget();

    return file
      ? `ไฟล์ "${file.name}" จะถูกลบออกจากเซิร์ฟเวอร์และไม่สามารถกู้คืนได้`
      : 'ไฟล์นี้จะถูกลบออกจากเซิร์ฟเวอร์และไม่สามารถกู้คืนได้';
  }

  private confirmBulkDeleteFiles(mode: Exclude<DeleteMode, 'single'>): void {
    const files = mode === 'all'
      ? this.files()
      : this.selectedFiles();

    if (files.length === 0 || this.bulkDeleting()) {
      return;
    }

    this.bulkDeleting.set(true);
    this.deleteError.set('');
    this.deleteMessage.set('');

    forkJoin(
      files.map((file) => {
        return this.fileService.permanentDelete(file.id).pipe(
          map(() => ({
            file,
            deleted: true,
          })),
          catchError(() => of({
            file,
            deleted: false,
          })),
        );
      }),
    )
      .pipe(finalize(() => this.bulkDeleting.set(false)))
      .subscribe((results) => {
        const deletedFileIds = new Set(
          results
            .filter((result) => result.deleted)
            .map((result) => result.file.id),
        );
        const failedFileIds = new Set(
          results
            .filter((result) => !result.deleted)
            .map((result) => result.file.id),
        );

        this.files.update((currentFiles) => currentFiles.filter((file) => !deletedFileIds.has(file.id)));
        this.selectedFileIds.set(failedFileIds);

        if (deletedFileIds.size > 0) {
          this.deleteMessage.set(`ลบไฟล์ถาวร ${deletedFileIds.size} รายการสำเร็จ`);
        }

        if (failedFileIds.size > 0) {
          this.deleteError.set(`มี ${failedFileIds.size} ไฟล์ที่ลบไม่สำเร็จ กรุณาลองอีกครั้ง`);
          return;
        }

        this.deleteMode.set(null);
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
