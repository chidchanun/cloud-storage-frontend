import {
  afterNextRender,
  Component,
  computed,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import {
  Router,
  ActivatedRoute,
  RouterLink,
} from '@angular/router';
import {
  LucideBell,
  LucideChevronRight,
  LucideFile,
  LucideDownload,
  LucideFileImage,
  LucideFileText,
  LucideFolder,
  LucideGrid3X3,
  LucideList,
  LucideLogOut,
  LucideMoreVertical,
  LucideMoveRight,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideSearch,
  LucideSettings,
  LucideTrash2,
  LucideUpload,
  LucideX,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import {
  FileService,
  UserFile,
} from '../../core/services/file.service';
import { environment } from '../../../environments/environment';
import { AppSidebar } from '../../shared/components/app-sidebar/app-sidebar';

interface DriveFolder {
  name: string;
  files: number;
  updatedAt: string;
  color: string;
}

interface DriveFile {
  id: number;
  name: string;
  type: 'document' | 'image' | 'archive' | 'file';
  mimeType: string;
  owner: string;
  sizeBytes: number;
  size: string;
  updatedAtTime: number;
  updatedAt: string;
}

interface ActionMenuPosition {
  top: number;
  left: number;
}

type FileViewMode = 'grid' | 'list';
type FileSortField = 'name' | 'type' | 'updated' | 'size';
type SortDirection = 'asc' | 'desc';

const fileViewModeStorageKey = 'anucloud:file-view-mode';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    AppSidebar,
    LucideBell,
    LucideChevronRight,
    LucideFile,
    LucideDownload,
    LucideFileImage,
    LucideFileText,
    LucideFolder,
    LucideGrid3X3,
    LucideList,
    LucideLogOut,
    LucideMoreVertical,
    LucideMoveRight,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideSearch,
    LucideSettings,
    LucideTrash2,
    LucideUpload,
    LucideX,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly fileService = inject(FileService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly previewObjectUrls = new Map<number, string>();

  readonly currentUser = this.authService.currentUser;
  readonly loadingFiles = signal(false);
  readonly loadFilesError = signal('');
  readonly uploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly uploadProgressLabel = signal('');
  readonly uploadMessage = signal('');
  readonly uploadError = signal('');

  readonly downloadingFileId = signal<number | null>(null);
  readonly downloadMessage = signal('');
  readonly downloadError = signal('');
  readonly deletingFileId = signal<number | null>(null);
  readonly deleteTarget = signal<DriveFile | null>(null);
  readonly deleteMessage = signal('');
  readonly deleteError = signal('');
  readonly renamingFileId = signal<number | null>(null);
  readonly renameTarget = signal<DriveFile | null>(null);
  readonly renameName = signal('');
  readonly renameMessage = signal('');
  readonly renameError = signal('');
  readonly openActionFileId = signal<number | null>(null);
  readonly actionMenuPosition = signal<ActionMenuPosition>({
    top: 0,
    left: 0,
  });
  readonly moveMessage = signal('');
  readonly loggingOut = signal(false);
  readonly fileViewMode = signal<FileViewMode>('list');
  readonly sortField = signal<FileSortField>('updated');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly filePreviewUrls = signal<Record<number, string>>({});
  readonly pageMessage = signal('');

  readonly folders: DriveFolder[] = [
    {
      name: 'เอกสาร',
      files: 24,
      updatedAt: 'วันนี้',
      color: 'text-blue-600 bg-blue-100 dark:text-cyan-300 dark:bg-cyan-300/10',
    },
    {
      name: 'รูปภาพ',
      files: 128,
      updatedAt: 'เมื่อวาน',
      color: 'text-violet-700 bg-violet-100 dark:text-violet-300 dark:bg-violet-300/10',
    },
    {
      name: 'งานที่แชร์',
      files: 9,
      updatedAt: '2 วันที่แล้ว',
      color: 'text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-300/10',
    },
  ];

  readonly files = signal<DriveFile[]>([]);
  readonly sortedFiles = computed(() => {
    const field = this.sortField();
    const direction = this.sortDirection();
    const directionWeight = direction === 'asc' ? 1 : -1;

    return [...this.files()].sort((firstFile, secondFile) => {
      const result = this.compareFiles(firstFile, secondFile, field);

      return result * directionWeight;
    });
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get('verified') === '1') {
      this.pageMessage.set('Email verified successfully. Welcome to AnuCloud.');
    }

    // Defer the first file fetch so SSR can render the page shell quickly.
    afterNextRender(() => {
      this.restoreFileViewMode();
      window.setTimeout(() => this.loadFiles(), 0);
    });
  }

  loadFiles(): void {
    if (this.loadingFiles()) {
      return;
    }

    this.loadingFiles.set(true);
    this.loadFilesError.set('');

    this.fileService.list()
      .pipe(finalize(() => this.loadingFiles.set(false)))
      .subscribe({
        next: (files) => {
          const driveFiles = files.map((file) => this.toDriveFile(file));

          this.revokeFilePreviews();
          this.files.set(driveFiles);
          this.loadImagePreviews(driveFiles);
        },
        error: () => {
          this.loadFilesError.set('ไม่สามารถโหลดไฟล์ได้');
        },
      });
  }

  ngOnDestroy(): void {
    this.revokeFilePreviews();
  }

  profileImageUrl(): string | null {
    const picturePath = this.currentUser()?.picturePath;

    if (!picturePath) {
      return null;
    }

    if (picturePath.startsWith('http')) {
      return picturePath;
    }

    return `${environment.apiUrl.replace('/api', '')}${picturePath}`;
  }

  downloadFile(file: DriveFile): void {
    if (this.downloadingFileId() !== null) {
      return;
    }

    this.closeActionMenu();
    this.downloadingFileId.set(file.id);
    this.downloadMessage.set('');
    this.downloadError.set('');

    this.fileService.download(file.id)
      .pipe(finalize(() => this.downloadingFileId.set(null)))
      .subscribe({
        next: (blob) => {
          this.saveBlob(blob, file.name);
          this.downloadMessage.set('ดาวน์โหลดไฟล์สำเร็จ');
        },
        error: () => {
          this.downloadError.set('ไม่สามารถดาวน์โหลดไฟล์ได้');
        },
      });
  }

  deleteFile(file: DriveFile): void {
    if (this.deletingFileId() !== null) {
      return;
    }

    this.closeActionMenu();
    this.deleteTarget.set(file);
    this.deleteMessage.set('');
    this.deleteError.set('');
  }

  cancelDeleteFile(): void {
    if (this.deletingFileId() !== null) {
      return;
    }

    this.deleteTarget.set(null);
  }

  confirmDeleteFile(): void {
    const file = this.deleteTarget();

    if (!file || this.deletingFileId() !== null) {
      return;
    }

    this.deletingFileId.set(file.id);
    this.deleteMessage.set('');
    this.deleteError.set('');

    this.fileService.delete(file.id)
      .pipe(finalize(() => this.deletingFileId.set(null)))
      .subscribe({
        next: () => {
          this.revokeFilePreview(file.id);
          this.files.update((files) => files.filter((item) => item.id !== file.id));
          this.deleteMessage.set('ลบไฟล์สำเร็จ');
          this.deleteTarget.set(null);
        },
        error: () => {
          this.deleteError.set('ไม่สามารถลบไฟล์ได้');
        },
      });
  }

  openRenameDialog(file: DriveFile): void {
    this.closeActionMenu();
    this.renameTarget.set(file);
    this.renameName.set(file.name);
    this.renameError.set('');
    this.renameMessage.set('');
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

    if (!file || this.renamingFileId() !== null) {
      return;
    }

    if (!nextName) {
      this.renameError.set('กรุณากรอกชื่อไฟล์');
      return;
    }

    if (nextName === file.name) {
      this.cancelRename();
      return;
    }

    this.renamingFileId.set(file.id);
    this.renameError.set('');
    this.renameMessage.set('');

    this.fileService.rename({
      fileId: file.id,
      originalName: nextName,
    })
      .pipe(finalize(() => this.renamingFileId.set(null)))
      .subscribe({
        next: (response) => {
          this.files.update((files) => {
            return files.map((item) => {
              return item.id === file.id
                ? { ...item, name: response.originalName }
                : item;
            });
          });
          this.renameMessage.set('เปลี่ยนชื่อไฟล์สำเร็จ');
          this.renameTarget.set(null);
          this.renameName.set('');
          this.closeActionMenu();
        },
        error: () => {
          this.renameError.set('ไม่สามารถเปลี่ยนชื่อไฟล์ได้');
        },
      });
  }

  toggleActionMenu(fileId: number, event: MouseEvent): void {
    const button = event.currentTarget as HTMLElement;
    const buttonRect = button.getBoundingClientRect();
    const menuWidth = 176;
    const menuGap = 8;

    // The menu is fixed-position so it can float above the table overflow area.
    this.actionMenuPosition.set({
      top: buttonRect.bottom + menuGap,
      left: Math.max(12, buttonRect.right - menuWidth),
    });

    this.openActionFileId.update((currentFileId) => {
      return currentFileId === fileId ? null : fileId;
    });
  }

  closeActionMenu(): void {
    this.openActionFileId.set(null);
  }

  setFileViewMode(mode: FileViewMode): void {
    this.closeActionMenu();
    this.fileViewMode.set(mode);
    localStorage.setItem(fileViewModeStorageKey, mode);
  }

  sortBy(field: FileSortField): void {
    if (this.sortField() === field) {
      this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortField.set(field);
    this.sortDirection.set(field === 'updated' ? 'desc' : 'asc');
  }

  sortIndicator(field: FileSortField): string {
    if (this.sortField() !== field) {
      return '';
    }

    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  moveFile(file: DriveFile): void {
    this.closeActionMenu();
    this.moveMessage.set(`เลือกตำแหน่งใหม่สำหรับ "${file.name}"`);
  }

  uploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (!file || this.uploading()) {
      return;
    }

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadProgressLabel.set(file.name);
    this.uploadError.set('');
    this.uploadMessage.set('');

    this.fileService.uploadWithProgress(file)
      .pipe(
        finalize(() => {
          this.uploading.set(false);
          this.uploadProgress.set(0);
          this.uploadProgressLabel.set('');
          input.value = '';
        }),
      )
      .subscribe({
        next: (event) => {
          if (event.type === 'progress') {
            this.uploadProgress.set(event.progress);
            return;
          }

          const uploadedFile = this.toDriveFile(event.response.file);

          this.files.update((files) => [
            uploadedFile,
            ...files,
          ]);
          this.loadImagePreviews([uploadedFile]);
          this.loadFilesError.set('');
          this.uploadProgress.set(100);
          this.uploadMessage.set('อัปโหลดไฟล์สำเร็จ');
        },
        error: (error) => {
          this.uploadError.set(
            error.status === 413
              ? 'ไฟล์มีขนาดใหญ่เกินไป'
              : 'ไม่สามารถอัปโหลดไฟล์ได้',
          );
        },
      });
  }

  logout(): void {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);

    this.authService.logout()
      .pipe(finalize(() => this.loggingOut.set(false)))
      .subscribe({
        next: () => {
          this.router.navigateByUrl('/login');
        },
        error: () => {
          this.router.navigateByUrl('/login');
        },
      });
  }

  fileIcon(type: DriveFile['type']): 'image' | 'text' | 'file' {
    if (type === 'image') {
      return 'image';
    }

    if (type === 'document') {
      return 'text';
    }

    return 'file';
  }

  fileIconAsset(file: DriveFile): string | null {
    const mimeType = file.mimeType.toLowerCase();
    const fileName = file.name.toLowerCase();

    if (mimeType.includes('pdf') || fileName.endsWith('.pdf')) {
      return '/assets/fileIcon/pdf-icon.svg';
    }

    if (
      mimeType.includes('word') ||
      mimeType.includes('officedocument.wordprocessingml') ||
      fileName.endsWith('.doc') ||
      fileName.endsWith('.docx')
    ) {
      return '/assets/fileIcon/word-icon.svg';
    }

    if (
      mimeType.includes('excel') ||
      mimeType.includes('spreadsheetml') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.csv')
    ) {
      return '/assets/fileIcon/excel-icon.svg';
    }

    return null;
  }

  filePreviewUrl(file: DriveFile): string | null {
    return this.filePreviewUrls()[file.id] ?? null;
  }

  private toDriveFile(file: UserFile): DriveFile {
    const updatedAtTime = new Date(file.updatedAt).getTime();

    return {
      id: file.id,
      name: file.originalName,
      type: this.fileType(file),
      mimeType: file.mimeType,
      owner: 'คุณ',
      sizeBytes: file.sizeBytes,
      size: this.formatFileSize(file.sizeBytes),
      updatedAtTime: Number.isNaN(updatedAtTime) ? 0 : updatedAtTime,
      updatedAt: this.formatUpdatedAt(file.updatedAt),
    };
  }

  private saveBlob(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    // Trigger a normal browser download while keeping the API response credentialed.
    link.href = url;
    link.download = fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  private loadImagePreviews(files: DriveFile[]): void {
    files
      .filter((file) => file.type === 'image')
      .forEach((file) => {
        this.fileService.download(file.id).subscribe({
          next: (blob) => {
            this.setFilePreviewUrl(file.id, window.URL.createObjectURL(blob));
          },
          error: () => {
            this.revokeFilePreview(file.id);
          },
        });
      });
  }

  private setFilePreviewUrl(fileId: number, previewUrl: string): void {
    this.revokeFilePreview(fileId);
    this.previewObjectUrls.set(fileId, previewUrl);
    this.filePreviewUrls.update((previewUrls) => ({
      ...previewUrls,
      [fileId]: previewUrl,
    }));
  }

  private revokeFilePreview(fileId: number): void {
    const previewUrl = this.previewObjectUrls.get(fileId);

    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      this.previewObjectUrls.delete(fileId);
    }

    this.filePreviewUrls.update((previewUrls) => {
      const nextPreviewUrls = { ...previewUrls };
      delete nextPreviewUrls[fileId];
      return nextPreviewUrls;
    });
  }

  private revokeFilePreviews(): void {
    this.previewObjectUrls.forEach((previewUrl) => {
      window.URL.revokeObjectURL(previewUrl);
    });
    this.previewObjectUrls.clear();
    this.filePreviewUrls.set({});
  }

  private restoreFileViewMode(): void {
    const savedMode = localStorage.getItem(fileViewModeStorageKey);

    if (savedMode === 'grid' || savedMode === 'list') {
      this.fileViewMode.set(savedMode);
    }
  }

  private formatUpdatedAt(updatedAt: string): string {
    const date = new Date(updatedAt);

    if (Number.isNaN(date.getTime())) {
      return 'เมื่อสักครู่';
    }

    return new Intl.DateTimeFormat('th-TH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  private fileType(file: UserFile): DriveFile['type'] {
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

  private compareFiles(
    firstFile: DriveFile,
    secondFile: DriveFile,
    field: FileSortField,
  ): number {
    if (field === 'name') {
      return firstFile.name.localeCompare(secondFile.name, 'th', {
        numeric: true,
        sensitivity: 'base',
      });
    }

    if (field === 'type') {
      return firstFile.mimeType.localeCompare(secondFile.mimeType, 'th', {
        numeric: true,
        sensitivity: 'base',
      });
    }

    if (field === 'size') {
      return firstFile.sizeBytes - secondFile.sizeBytes;
    }

    return firstFile.updatedAtTime - secondFile.updatedAtTime;
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
