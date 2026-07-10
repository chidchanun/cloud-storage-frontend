import {
  afterNextRender,
  Component,
  computed,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
  RouterLink,
} from '@angular/router';
import {
  LucideArrowLeft,
  LucideDownload,
  LucideFile,
  LucideFileImage,
  LucideFileText,
  LucideFolder,
  LucideFolderOpen,
  LucideGrid3X3,
  LucideList,
  LucideRefreshCw,
  LucideSearch,
  LucideStar,
} from '@lucide/angular';
import {
  finalize,
  forkJoin,
  Observable,
} from 'rxjs';

import {
  FileService,
  StarredFile,
  UserFile,
} from '../../core/services/file.service';
import {
  FolderService,
  StarredFolder,
  UserFolder,
} from '../../core/services/folder.service';
import { AppHeader } from '../../shared/components/app-header/app-header';
import { AppSidebar } from '../../shared/components/app-sidebar/app-sidebar';

interface StarredViewFile {
  kind: 'file' | 'folder' | 'folder-file';
  id: number;
  folderId: number | null;
  sourceFolderName?: string;
  name: string;
  type: 'document' | 'image' | 'file' | 'folder';
  mimeType: string;
  size: string;
  starredAtTime: number;
  starredAt: string;
  updatedAt: string;
}

interface ActionMenuPosition {
  top: number;
  left: number;
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
    LucideFolder,
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
  private readonly folderService = inject(FolderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly files = signal<StarredViewFile[]>([]);
  readonly currentFolderId = signal<number | null>(null);
  readonly currentFolderName = signal('');
  readonly searchTerm = signal('');
  readonly loadError = signal('');
  readonly actionMessage = signal('');
  readonly actionError = signal('');
  readonly downloadingFileId = signal<number | null>(null);
  readonly unstarringFileId = signal<number | null>(null);
  readonly viewMode = signal<StarredViewMode>('grid');
  readonly contextMenuFile = signal<StarredViewFile | null>(null);
  readonly actionMenuPosition = signal<ActionMenuPosition>({
    top: 0,
    left: 0,
  });

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
      this.route.paramMap.subscribe((params) => {
        const folderId = Number(params.get('id'));

        window.setTimeout(() => {
          if (Number.isInteger(folderId) && folderId > 0) {
            this.loadStarredFolder(folderId);
            return;
          }

          this.currentFolderId.set(null);
          this.currentFolderName.set('');
          this.loadStarredFiles();
        }, 0);
      });
    });
  }

  @HostListener('document:click')
  closeContextMenuOnLeftClick(): void {
    this.closeContextMenu();
  }

  loadStarredFiles(): void {
    if (this.loading()) {
      return;
    }

    this.loading.set(true);
    this.loadError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    forkJoin({
      files: this.fileService.starredFiles(),
      folders: this.folderService.starredFolders(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ files, folders }) => {
          this.files.set(this.buildStarredItems(files, folders));
        },
        error: () => {
          this.loadError.set('ไม่สามารถโหลดรายการโปรดได้');
        },
      });
  }

  loadStarredFolder(folderId: number): void {
    if (this.loading()) {
      return;
    }

    this.currentFolderId.set(folderId);
    this.loading.set(true);
    this.loadError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    forkJoin({
      folder: this.folderService.getById(folderId),
      folders: this.folderService.list(folderId),
      files: this.fileService.list(folderId),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ folder, folders, files }) => {
          this.currentFolderName.set(folder.folderName);
          this.files.set([
            ...folders.map((childFolder) => this.toViewChildFolder(childFolder)),
            ...files.map((file) => this.toViewFolderContentFile(file)),
          ]);
        },
        error: () => {
          this.currentFolderName.set('');
          this.files.set([]);
          this.loadError.set('ไม่สามารถโหลดโฟลเดอร์รายการโปรดได้');
        },
      });
  }

  refresh(): void {
    const folderId = this.currentFolderId();

    if (folderId) {
      this.loadStarredFolder(folderId);
      return;
    }

    this.loadStarredFiles();
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
    if (file.kind === 'folder') {
      this.openFileLocation(file);
      return;
    }

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

  unstarFile(file: StarredViewFile): void {
    if (this.unstarringFileId() !== null) {
      return;
    }

    this.closeContextMenu();
    this.unstarringFileId.set(file.id);
    this.actionMessage.set('');
    this.actionError.set('');

    const request: Observable<unknown> =
      file.kind === 'folder'
        ? this.folderService.unstar(file.id)
        : this.fileService.unstar(file.id);

    request
      .pipe(finalize(() => this.unstarringFileId.set(null)))
      .subscribe({
        next: () => {
          this.files.update((files) => this.removeUnstarredItems(files, file));
          this.actionMessage.set('นำออกจากรายการโปรดแล้ว');
        },
        error: () => {
          this.actionError.set('ไม่สามารถนำไฟล์ออกจากรายการโปรดได้');
        },
      });
  }

  openFileLocation(file: StarredViewFile): void {
    this.closeContextMenu();

    if (file.kind === 'folder') {
      void this.router.navigate(['/starred/folders', file.id]);
      return;
    }

    const queryParams = { fileId: file.id };

    if (this.currentFolderId()) {
      void this.router.navigate(['/starred/folders', this.currentFolderId()], { queryParams });
      return;
    }

    if (file.folderId) {
      void this.router.navigate(['/my-drive/folders', file.folderId], { queryParams });
      return;
    }

    void this.router.navigate(['/my-drive'], { queryParams });
  }

  openFileContextMenu(file: StarredViewFile, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.contextMenuFile.set(file);
    this.actionMenuPosition.set(this.fitMenuPosition(event.clientX, event.clientY));
  }

  closeContextMenu(): void {
    this.contextMenuFile.set(null);
  }

  fileIcon(file: StarredViewFile): 'image' | 'text' | 'file' | 'folder' {
    if (file.type === 'folder') {
      return 'folder';
    }

    if (file.type === 'image') {
      return 'image';
    }

    if (file.type === 'document') {
      return 'text';
    }

    return 'file';
  }

  private toViewFile(file: StarredFile): StarredViewFile {
    const starredAtTime = new Date(file.starredAt).getTime();

    return {
      kind: 'file',
      id: file.id,
      folderId: file.folderId ?? null,
      name: file.originalName,
      type: this.fileType(file),
      mimeType: file.mimeType,
      size: this.formatFileSize(file.sizeBytes),
      starredAtTime: Number.isNaN(starredAtTime) ? 0 : starredAtTime,
      starredAt: this.formatDate(file.starredAt),
      updatedAt: this.formatDate(file.updatedAt),
    };
  }

  private buildStarredItems(
    files: StarredFile[],
    folders: StarredFolder[],
  ): StarredViewFile[] {
    return [
      ...folders.map((folder) => this.toViewFolder(folder)),
      ...files.map((file) => this.toViewFile(file)),
    ].sort((firstItem, secondItem) => secondItem.starredAtTime - firstItem.starredAtTime);
  }

  private toViewFolder(folder: StarredFolder): StarredViewFile {
    const starredAtTime = new Date(folder.starredAt).getTime();

    return {
      kind: 'folder',
      id: folder.id,
      folderId: folder.parentId ?? null,
      name: folder.folderName,
      type: 'folder',
      mimeType: 'โฟลเดอร์',
      size: '-',
      starredAtTime: Number.isNaN(starredAtTime) ? 0 : starredAtTime,
      starredAt: this.formatDate(folder.starredAt),
      updatedAt: this.formatDate(folder.updatedAt),
    };
  }

  private toViewChildFolder(folder: UserFolder): StarredViewFile {
    const updatedAtTime = new Date(folder.updatedAt).getTime();

    return {
      kind: 'folder',
      id: folder.id,
      folderId: folder.parentId,
      name: folder.folderName,
      type: 'folder',
      mimeType: 'โฟลเดอร์',
      size: '-',
      starredAtTime: Number.isNaN(updatedAtTime) ? 0 : updatedAtTime,
      starredAt: '-',
      updatedAt: this.formatDate(folder.updatedAt),
    };
  }

  private toViewFolderContentFile(file: UserFile): StarredViewFile {
    const updatedAtTime = new Date(file.updatedAt).getTime();

    return {
      kind: 'file',
      id: file.id,
      folderId: file.folderId ?? this.currentFolderId(),
      name: file.originalName,
      type: this.fileType(file),
      mimeType: file.mimeType,
      size: this.formatFileSize(file.sizeBytes),
      starredAtTime: Number.isNaN(updatedAtTime) ? 0 : updatedAtTime,
      starredAt: '-',
      updatedAt: this.formatDate(file.updatedAt),
    };
  }

  private removeUnstarredItems(
    files: StarredViewFile[],
    unstarredFile: StarredViewFile,
  ): StarredViewFile[] {
    return files.filter((item) => item.kind !== unstarredFile.kind || item.id !== unstarredFile.id);
  }

  private fileType(file: StarredFile | UserFile): StarredViewFile['type'] {
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

  private fitMenuPosition(left: number, top: number): ActionMenuPosition {
    const menuWidth = 208;
    const menuHeight = 136;
    const padding = 12;

    return {
      left: Math.min(left, window.innerWidth - menuWidth - padding),
      top: Math.min(top, window.innerHeight - menuHeight - padding),
    };
  }
}
