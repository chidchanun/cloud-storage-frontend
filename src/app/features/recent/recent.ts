import {
  afterNextRender,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import {
  Router,
  RouterLink,
} from '@angular/router';
import {
  LucideArrowLeft,
  LucideClock,
  LucideDownload,
  LucideFile,
  LucideFileImage,
  LucideFileText,
  LucideFolderOpen,
  LucideGrid3X3,
  LucideList,
  LucideRefreshCw,
  LucideSearch,
} from '@lucide/angular';
import { finalize } from 'rxjs';

import {
  FileService,
  UserFile,
} from '../../core/services/file.service';
import { AppHeader } from '../../shared/components/app-header/app-header';
import { AppSidebar } from '../../shared/components/app-sidebar/app-sidebar';

interface RecentViewFile {
  id: number;
  folderId: number | null;
  name: string;
  type: 'document' | 'image' | 'file';
  mimeType: string;
  size: string;
  updatedAt: string;
  updatedAtTime: number;
}

interface ActionMenuPosition {
  top: number;
  left: number;
}

type RecentViewMode = 'grid' | 'table';

const recentViewModeStorageKey = 'anucloud:recent-view-mode';

@Component({
  selector: 'app-recent',
  imports: [
    RouterLink,
    AppHeader,
    AppSidebar,
    LucideArrowLeft,
    LucideClock,
    LucideDownload,
    LucideFile,
    LucideFileImage,
    LucideFileText,
    LucideFolderOpen,
    LucideGrid3X3,
    LucideList,
    LucideRefreshCw,
    LucideSearch,
  ],
  templateUrl: './recent.html',
  styleUrl: './recent.scss',
})
export class Recent {
  private readonly fileService = inject(FileService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly files = signal<RecentViewFile[]>([]);
  readonly searchTerm = signal('');
  readonly loadError = signal('');
  readonly actionMessage = signal('');
  readonly actionError = signal('');
  readonly downloadingFileId = signal<number | null>(null);
  readonly viewMode = signal<RecentViewMode>('grid');
  readonly contextMenuFile = signal<RecentViewFile | null>(null);
  readonly actionMenuPosition = signal<ActionMenuPosition>({
    top: 0,
    left: 0,
  });

  readonly filteredFiles = computed(() => {
    const keyword = this.searchTerm().trim().toLowerCase();
    const files = [...this.files()].sort((firstFile, secondFile) => {
      return secondFile.updatedAtTime - firstFile.updatedAtTime;
    });

    if (!keyword) {
      return files;
    }

    return files.filter((file) => {
      return (
        file.name.toLowerCase().includes(keyword) ||
        file.mimeType.toLowerCase().includes(keyword)
      );
    });
  });

  constructor() {
    afterNextRender(() => {
      this.restoreViewMode();
      window.setTimeout(() => this.loadRecentFiles(), 0);
    });
  }

  @HostListener('document:click')
  closeContextMenuOnLeftClick(): void {
    this.closeContextMenu();
  }

  loadRecentFiles(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    this.fileService
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (files) => this.files.set(files.map((file) => this.toViewFile(file))),
        error: () => this.loadError.set('ไม่สามารถโหลดไฟล์ล่าสุดได้'),
      });
  }

  updateSearchTerm(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  setViewMode(mode: RecentViewMode): void {
    this.viewMode.set(mode);
    localStorage.setItem(recentViewModeStorageKey, mode);
  }

  downloadFile(file: RecentViewFile): void {
    if (this.downloadingFileId() !== null) {
      return;
    }

    this.closeContextMenu();
    this.downloadingFileId.set(file.id);
    this.actionMessage.set('');
    this.actionError.set('');
    this.openDownloadUrl(file.id, file.name);
    this.actionMessage.set('เริ่มดาวน์โหลดไฟล์แล้ว');
    window.setTimeout(() => this.downloadingFileId.set(null), 1000);
  }

  openFileLocation(file: RecentViewFile): void {
    this.closeContextMenu();
    const queryParams = { fileId: file.id };

    if (file.folderId) {
      void this.router.navigate(['/my-drive/folders', file.folderId], { queryParams });
      return;
    }

    void this.router.navigate(['/my-drive'], { queryParams });
  }

  openFileContextMenu(file: RecentViewFile, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.contextMenuFile.set(file);
    this.actionMenuPosition.set(this.fitMenuPosition(event.clientX, event.clientY));
  }

  closeContextMenu(): void {
    this.contextMenuFile.set(null);
  }

  fileIcon(file: RecentViewFile): 'image' | 'text' | 'file' {
    if (file.type === 'image') {
      return 'image';
    }

    if (file.type === 'document') {
      return 'text';
    }

    return 'file';
  }

  private toViewFile(file: UserFile): RecentViewFile {
    const updatedAtTime = new Date(file.updatedAt).getTime();

    return {
      id: file.id,
      folderId: file.folderId ?? null,
      name: file.originalName,
      type: this.fileType(file),
      mimeType: file.mimeType,
      size: this.formatFileSize(file.sizeBytes),
      updatedAt: this.formatDate(file.updatedAt),
      updatedAtTime: Number.isNaN(updatedAtTime) ? 0 : updatedAtTime,
    };
  }

  private fileType(file: UserFile): RecentViewFile['type'] {
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
    const savedMode = localStorage.getItem(recentViewModeStorageKey);

    if (savedMode === 'grid' || savedMode === 'table') {
      this.viewMode.set(savedMode);
    }
  }

  private fitMenuPosition(left: number, top: number): ActionMenuPosition {
    const menuWidth = 200;
    const menuHeight = 96;
    const padding = 12;

    return {
      left: Math.min(left, window.innerWidth - menuWidth - padding),
      top: Math.min(top, window.innerHeight - menuHeight - padding),
    };
  }
}
