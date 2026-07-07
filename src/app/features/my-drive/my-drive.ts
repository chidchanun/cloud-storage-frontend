import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  LucideChevronDown,
  LucideChevronRight,
  LucideCopy,
  LucideDownload,
  LucideFile,
  LucideFileImage,
  LucideFileText,
  LucideFolder,
  LucideFolderPlus,
  LucideGrid3X3,
  LucideLink,
  LucideList,
  LucideMoreVertical,
  LucideMoveRight,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideShare2,
  LucideTrash2,
  LucideUpload,
  LucideX,
} from '@lucide/angular';
import { catchError, finalize, firstValueFrom, forkJoin, map, Observable, of } from 'rxjs';

import {
  FileService,
  RemoveSharedFilePermissionResponse,
  SharedFilePermission,
  ShareFileResponse,
  ShareUserSuggestion,
  UpdateSharedFilePermissionResponse,
  UserFile,
} from '../../core/services/file.service';
import {
  FolderService,
  RemoveSharedFolderPermissionResponse,
  SharedFolderPermission,
  ShareFolderResponse,
  UpdateSharedFolderPermissionResponse,
  UserFolder,
} from '../../core/services/folder.service';
import { AppSidebar } from '../../shared/components/app-sidebar/app-sidebar';
import { AppHeader } from '../../shared/components/app-header/app-header';

interface MyDriveFile {
  id: number;
  folderId: number | null;
  name: string;
  type: 'document' | 'image' | 'archive' | 'file';
  mimeType: string;
  sizeBytes: number;
  size: string;
  updatedAtTime: number;
  updatedAt: string;
  previewUrl?: string;
}

interface MyDriveFolder {
  id: number;
  parentId: number | null;
  name: string;
  updatedAtTime: number;
  updatedAt: string;
}

interface FolderPathItem {
  id: number;
  name: string;
}

interface ActionMenuPosition {
  top: number;
  left: number;
}

type MyDriveViewMode = 'grid' | 'list';
type MyDriveSortField = 'name' | 'type' | 'updated' | 'size';
type SortDirection = 'asc' | 'desc';
type ShareMode = 'user' | 'link';
type ShareTarget =
  | {
      kind: 'file';
      item: MyDriveFile;
    }
  | {
      kind: 'folder';
      item: MyDriveFolder;
    };
type DriveSharePermission = SharedFilePermission | SharedFolderPermission;
type DriveShareResponse = ShareFileResponse | ShareFolderResponse;
type DriveUpdateSharePermissionResponse =
  | UpdateSharedFilePermissionResponse
  | UpdateSharedFolderPermissionResponse;
type DriveRemoveSharePermissionResponse =
  | RemoveSharedFilePermissionResponse
  | RemoveSharedFolderPermissionResponse;

const myDriveViewModeStorageKey = 'anucloud:my-drive-view-mode';

@Component({
  selector: 'app-my-drive',
  imports: [
    AppSidebar,
    AppHeader,
    LucideChevronDown,
    LucideChevronRight,
    LucideCopy,
    LucideDownload,
    LucideFile,
    LucideFileImage,
    LucideFileText,
    LucideFolder,
    LucideFolderPlus,
    LucideGrid3X3,
    LucideLink,
    LucideList,
    LucideMoreVertical,
    LucideMoveRight,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
    LucideShare2,
    LucideTrash2,
    LucideUpload,
    LucideX,
  ],
  templateUrl: './my-drive.html',
  styleUrl: './my-drive.scss',
})
export class MyDrive {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fileService = inject(FileService);
  private readonly folderService = inject(FolderService);
  private readonly previewObjectUrls = new Map<number, string>();

  readonly folders = signal<MyDriveFolder[]>([]);
  readonly files = signal<MyDriveFile[]>([]);
  readonly currentFolderId = signal<number | null>(null);
  readonly folderPath = signal<FolderPathItem[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly uploading = signal(false);
  readonly uploadProgress = signal(0);
  readonly uploadProgressLabel = signal('');
  readonly uploadMessage = signal('');
  readonly uploadError = signal('');
  readonly creatingFolder = signal(false);
  readonly createFolderDialogOpen = signal(false);
  readonly newFolderName = signal('');
  readonly createFolderError = signal('');
  readonly newMenuOpen = signal(false);
  readonly newMenuPosition = signal<ActionMenuPosition>({
    top: 0,
    left: 0,
  });
  readonly downloadingFileId = signal<number | null>(null);
  readonly deletingFileId = signal<number | null>(null);
  readonly deleteTarget = signal<MyDriveFile | null>(null);
  readonly selectedFileIds = signal<Set<number>>(new Set());
  readonly bulkDeleteDialogOpen = signal(false);
  readonly bulkDeleting = signal(false);
  readonly bulkDeleteError = signal('');
  readonly deletingFolderId = signal<number | null>(null);
  readonly deleteFolderTarget = signal<MyDriveFolder | null>(null);
  readonly deleteFolderError = signal('');
  readonly renamingFileId = signal<number | null>(null);
  readonly renameTarget = signal<MyDriveFile | null>(null);
  readonly renameName = signal('');
  readonly renameError = signal('');
  readonly renameFolderTarget = signal<MyDriveFolder | null>(null);
  readonly renamingFolderId = signal<number | null>(null);
  readonly renameFolderName = signal('');
  readonly renameFolderError = signal('');
  readonly movingFileId = signal<number | null>(null);
  readonly moveTarget = signal<MyDriveFile | null>(null);
  readonly moveDestinationId = signal<number | null>(null);
  readonly moveFolderPath = signal<FolderPathItem[]>([]);
  readonly moveFolders = signal<MyDriveFolder[]>([]);
  readonly moveFoldersLoading = signal(false);
  readonly moveError = signal('');
  readonly movingFolderId = signal<number | null>(null);
  readonly moveFolderTarget = signal<MyDriveFolder | null>(null);
  readonly moveFolderDestinationId = signal<number | null>(null);
  readonly moveFolderDestinationPath = signal<FolderPathItem[]>([]);
  readonly moveFolderChoices = signal<MyDriveFolder[]>([]);
  readonly moveFolderChoicesLoading = signal(false);
  readonly moveFolderError = signal('');
  readonly actionMessage = signal('');
  readonly actionError = signal('');
  readonly moveMessage = signal('');
  readonly sharingFileId = signal<number | null>(null);
  readonly shareTarget = signal<ShareTarget | null>(null);
  readonly shareMode = signal<ShareMode>('user');
  readonly shareEmail = signal('');
  readonly shareUserSuggestions = signal<ShareUserSuggestion[]>([]);
  readonly searchingShareUsers = signal(false);
  readonly sharePermission = signal<'viewer' | 'editor'>('viewer');
  readonly shareExpiresAt = signal('');
  readonly shareLinkUrl = signal('');
  readonly shareMessage = signal('');
  readonly shareError = signal('');
  readonly creatingShareLink = signal(false);
  readonly sharePermissions = signal<DriveSharePermission[]>([]);
  readonly loadingSharePermissions = signal(false);
  readonly updatingSharePermissionId = signal<number | null>(null);
  readonly removingSharePermissionId = signal<number | null>(null);
  readonly viewMode = signal<MyDriveViewMode>('list');
  readonly isMobileView = signal(false);
  readonly sortField = signal<MyDriveSortField>('updated');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly openActionFileId = signal<number | null>(null);
  readonly openActionFolderId = signal<number | null>(null);
  readonly actionMenuPosition = signal<ActionMenuPosition>({
    top: 0,
    left: 0,
  });
  readonly highlightedFileId = signal<number | null>(null);
  readonly selectedFiles = computed(() => {
    const selectedIds = this.selectedFileIds();

    return this.files().filter((file) => selectedIds.has(file.id));
  });
  readonly selectedFileCount = computed(() => this.selectedFileIds().size);
  readonly allFilesSelected = computed(() => {
    const files = this.files();

    return files.length > 0 && files.every((file) => this.selectedFileIds().has(file.id));
  });
  readonly sortedFiles = computed(() => {
    const field = this.sortField();
    const direction = this.sortDirection();
    const directionWeight = direction === 'asc' ? 1 : -1;

    return [...this.files()].sort((firstFile, secondFile) => {
      const result = this.compareFiles(firstFile, secondFile, field);

      return result * directionWeight;
    });
  });
  readonly sortedFolders = computed(() => {
    const field = this.sortField();
    const direction = this.sortDirection();
    const directionWeight = direction === 'asc' ? 1 : -1;

    return [...this.folders()].sort((firstFolder, secondFolder) => {
      const result = this.compareFolders(firstFolder, secondFolder, field);

      return result * directionWeight;
    });
  });

  constructor() {
    // Keep API fetching on the client so the server-rendered shell stays quick.
    afterNextRender(() => {
      this.syncMobileViewMode();
      this.restoreViewMode();
      this.route.paramMap.subscribe((params) => {
        window.setTimeout(() => {
          void this.loadFromRoute(params.get('id'));
        }, 0);
      });
      this.route.queryParamMap.subscribe((params) => {
        const fileId = Number(params.get('fileId'));
        this.highlightedFileId.set(Number.isInteger(fileId) && fileId > 0 ? fileId : null);
        this.revealHighlightedFile();
      });
    });

    this.destroyRef.onDestroy(() => {
      this.clearSvgPreviewUrls();
    });
  }

  @HostListener('document:click')
  closeContextMenusOnLeftClick(): void {
    this.closeDriveMenus();
  }

  loadFiles(): void {
    this.loading.set(true);
    this.loadError.set('');

    forkJoin({
      files: this.fileService.list(this.currentFolderId()),
      folders: this.folderService.list(this.currentFolderId()),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ files, folders }) => {
          this.clearSvgPreviewUrls();
          this.folders.set(folders.map((folder) => this.toMyDriveFolder(folder)));
          const nextFiles = files.map((file) => this.toMyDriveFile(file));

          this.files.set(nextFiles);
          this.selectedFileIds.set(new Set());
          nextFiles
            .filter((file) => this.canPreviewSvg(file))
            .forEach((file) => this.loadSvgPreview(file));
          this.revealHighlightedFile();
        },
        error: () => {
          this.loadError.set('ไม่สามารถโหลดไฟล์ของคุณได้');
        },
      });
  }

  openFolder(folder: MyDriveFolder): void {
    if (this.loading()) {
      return;
    }

    this.closeActionMenu();
    this.closeNewMenu();
    void this.router.navigate(['/my-drive/folders', folder.id]);
  }

  openRootFolder(): void {
    if (this.loading()) {
      return;
    }

    void this.router.navigate(['/my-drive']);
  }

  openFolderPath(index: number): void {
    if (this.loading()) {
      return;
    }

    const nextPath = this.folderPath().slice(0, index + 1);
    const targetFolder = nextPath.at(-1) ?? null;

    if (targetFolder) {
      void this.router.navigate(['/my-drive/folders', targetFolder.id]);
      return;
    }

    void this.router.navigate(['/my-drive']);
  }

  toggleNewMenu(event: MouseEvent): void {
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    const buttonRect = button.getBoundingClientRect();
    const menuGap = 8;

    this.closeActionMenu();
    this.newMenuPosition.set({
      top: buttonRect.bottom + menuGap,
      left: Math.max(12, buttonRect.left),
    });
    this.newMenuOpen.update((open) => !open);
  }

  closeNewMenu(): void {
    this.newMenuOpen.set(false);
  }

  closeDriveMenus(): void {
    this.closeActionMenu();
    this.closeNewMenu();
  }

  openCreateFolderDialog(): void {
    this.closeNewMenu();
    this.createFolderDialogOpen.set(true);
    this.newFolderName.set('');
    this.createFolderError.set('');
  }

  cancelCreateFolder(): void {
    if (this.creatingFolder()) {
      return;
    }

    this.createFolderDialogOpen.set(false);
    this.newFolderName.set('');
    this.createFolderError.set('');
  }

  submitCreateFolder(event?: Event): void {
    event?.preventDefault();

    const folderName = this.newFolderName().trim();

    if (this.creatingFolder()) {
      return;
    }

    if (!folderName) {
      this.createFolderError.set('กรุณากรอกชื่อโฟลเดอร์');
      return;
    }

    this.creatingFolder.set(true);
    this.createFolderError.set('');
    this.uploadMessage.set('');
    this.uploadError.set('');

    this.folderService
      .create(folderName, this.currentFolderId())
      .pipe(finalize(() => this.creatingFolder.set(false)))
      .subscribe({
        next: (response) => {
          this.folders.update((folders) => [this.toMyDriveFolder(response.folder), ...folders]);
          this.uploadMessage.set('สร้างโฟลเดอร์สำเร็จ');
          this.createFolderDialogOpen.set(false);
          this.newFolderName.set('');
        },
        error: () => {
          this.createFolderError.set('ไม่สามารถสร้างโฟลเดอร์ได้');
        },
      });
  }

  uploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.closeNewMenu();

    if (!file || this.uploading()) {
      return;
    }

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadProgressLabel.set(file.name);
    this.uploadMessage.set('');
    this.uploadError.set('');

    this.fileService
      .uploadWithProgress(file, this.currentFolderId())
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

          const uploadedFile = this.toMyDriveFile(event.response.file);

          this.files.update((files) => [uploadedFile, ...files]);
          if (this.canPreviewSvg(uploadedFile)) {
            this.loadSvgPreview(uploadedFile);
          }
          this.uploadProgress.set(100);
          this.uploadMessage.set('อัปโหลดไฟล์สำเร็จ');
        },
        error: () => {
          this.uploadError.set('ไม่สามารถอัปโหลดไฟล์ได้');
        },
      });
  }

  uploadFolder(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.closeNewMenu();

    if (files.length === 0 || this.uploading()) {
      return;
    }

    this.uploading.set(true);
    this.uploadProgress.set(0);
    this.uploadProgressLabel.set(`0/${files.length} ไฟล์`);
    this.uploadMessage.set('');
    this.uploadError.set('');

    const fileProgress = new Map<string, number>();
    const uploadedFiles: MyDriveFile[] = [];
    let finishedCount = 0;
    let failedCount = 0;

    files.forEach((file, index) => {
      const progressKey = `${index}:${file.name}`;
      fileProgress.set(progressKey, 0);

      this.fileService.uploadWithProgress(file, this.currentFolderId()).subscribe({
        next: (event) => {
          if (event.type === 'progress') {
            fileProgress.set(progressKey, event.progress);
            this.updateFolderUploadProgress(fileProgress, files.length, finishedCount);
            return;
          }

          fileProgress.set(progressKey, 100);
          uploadedFiles.push(this.toMyDriveFile(event.response.file));
        },
        error: () => {
          failedCount += 1;
          finishedCount += 1;
          fileProgress.set(progressKey, 100);
          this.finishFolderUploadIfDone(
            input,
            files.length,
            finishedCount,
            failedCount,
            uploadedFiles,
          );
        },
        complete: () => {
          finishedCount += 1;
          this.finishFolderUploadIfDone(
            input,
            files.length,
            finishedCount,
            failedCount,
            uploadedFiles,
          );
        },
      });
    });
  }

  downloadFile(file: MyDriveFile): void {
    if (this.downloadingFileId() !== null) {
      return;
    }

    this.closeActionMenu();
    this.downloadingFileId.set(file.id);
    this.actionMessage.set('');
    this.actionError.set('');

    this.fileService
      .download(file.id)
      .pipe(finalize(() => this.downloadingFileId.set(null)))
      .subscribe({
        next: (blob) => {
          this.saveBlob(blob, file.name);
          this.actionMessage.set('ดาวน์โหลดไฟล์สำเร็จ');
        },
        error: () => {
          this.actionError.set('ไม่สามารถดาวน์โหลดไฟล์ได้');
        },
      });
  }

  deleteFile(file: MyDriveFile): void {
    if (this.deletingFileId() !== null) {
      return;
    }

    this.closeActionMenu();
    this.deleteTarget.set(file);
    this.actionMessage.set('');
    this.actionError.set('');
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
    this.actionMessage.set('');
    this.actionError.set('');

    this.fileService
      .delete(file.id)
      .pipe(finalize(() => this.deletingFileId.set(null)))
      .subscribe({
        next: () => {
          const previewUrl = this.previewObjectUrls.get(file.id);
          if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl);
            this.previewObjectUrls.delete(file.id);
          }

          this.files.update((files) => files.filter((item) => item.id !== file.id));
          this.actionMessage.set('ลบไฟล์สำเร็จ');
          this.deleteTarget.set(null);
        },
        error: () => {
          this.actionError.set('ไม่สามารถลบไฟล์ได้');
        },
      });
  }

  isFileSelected(fileId: number): boolean {
    return this.selectedFileIds().has(fileId);
  }

  toggleFileSelection(file: MyDriveFile, event?: Event): void {
    event?.stopPropagation();
    this.closeActionMenu();

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
    this.closeActionMenu();

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
    this.bulkDeleteError.set('');
  }

  openBulkDeleteDialog(): void {
    if (this.selectedFileCount() === 0 || this.bulkDeleting()) {
      return;
    }

    this.closeActionMenu();
    this.bulkDeleteDialogOpen.set(true);
    this.bulkDeleteError.set('');
    this.actionMessage.set('');
    this.actionError.set('');
  }

  cancelBulkDeleteFiles(): void {
    if (this.bulkDeleting()) {
      return;
    }

    this.bulkDeleteDialogOpen.set(false);
    this.bulkDeleteError.set('');
  }

  confirmBulkDeleteFiles(): void {
    const files = this.selectedFiles();

    if (files.length === 0 || this.bulkDeleting()) {
      return;
    }

    this.bulkDeleting.set(true);
    this.bulkDeleteError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    forkJoin(
      files.map((file) => {
        return this.fileService.delete(file.id).pipe(
          map(() => ({
            file,
            deleted: true,
          })),
          catchError(() =>
            of({
              file,
              deleted: false,
            }),
          ),
        );
      }),
    )
      .pipe(finalize(() => this.bulkDeleting.set(false)))
      .subscribe((results) => {
        const deletedFileIds = new Set(
          results.filter((result) => result.deleted).map((result) => result.file.id),
        );
        const failedFileIds = new Set(
          results.filter((result) => !result.deleted).map((result) => result.file.id),
        );

        // Clean up object URLs for deleted SVG previews before removing them from the view.
        deletedFileIds.forEach((fileId) => {
          const previewUrl = this.previewObjectUrls.get(fileId);

          if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl);
            this.previewObjectUrls.delete(fileId);
          }
        });

        this.files.update((currentFiles) =>
          currentFiles.filter((file) => !deletedFileIds.has(file.id)),
        );
        this.selectedFileIds.set(failedFileIds);

        if (deletedFileIds.size > 0) {
          this.actionMessage.set(`ลบไฟล์ ${deletedFileIds.size} รายการสำเร็จ`);
        }

        if (failedFileIds.size > 0) {
          this.bulkDeleteError.set(`มี ${failedFileIds.size} ไฟล์ที่ลบไม่สำเร็จ กรุณาลองอีกครั้ง`);
          return;
        }

        this.bulkDeleteDialogOpen.set(false);
      });
  }

  deleteFolder(folder: MyDriveFolder): void {
    if (this.deletingFolderId() !== null) {
      return;
    }

    this.closeActionMenu();
    this.deleteFolderTarget.set(folder);
    this.deleteFolderError.set('');
    this.actionMessage.set('');
    this.actionError.set('');
  }

  cancelDeleteFolder(): void {
    if (this.deletingFolderId() !== null) {
      return;
    }

    this.deleteFolderTarget.set(null);
    this.deleteFolderError.set('');
  }

  confirmDeleteFolder(): void {
    const folder = this.deleteFolderTarget();

    if (!folder || this.deletingFolderId() !== null) {
      return;
    }

    this.deletingFolderId.set(folder.id);
    this.deleteFolderError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    this.folderService
      .deleteFolder(folder.id)
      .pipe(finalize(() => this.deletingFolderId.set(null)))
      .subscribe({
        next: () => {
          // Remove only the deleted folder from the current view to avoid a full page reload flash.
          this.folders.update((folders) => folders.filter((item) => item.id !== folder.id));
          this.actionMessage.set('ลบโฟลเดอร์สำเร็จ');
          this.deleteFolderTarget.set(null);
        },
        error: (error) => {
          const message =
            error.status === 409
              ? 'ลบไม่ได้ เพราะโฟลเดอร์นี้ยังมีไฟล์หรือโฟลเดอร์ย่อยอยู่'
              : 'ไม่สามารถลบโฟลเดอร์ได้';

          this.deleteFolderError.set(message);
        },
      });
  }

  openRenameDialog(file: MyDriveFile): void {
    this.closeActionMenu();
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
    this.actionMessage.set('');
    this.actionError.set('');

    this.fileService
      .rename({
        fileId: file.id,
        originalName: nextName,
      })
      .pipe(finalize(() => this.renamingFileId.set(null)))
      .subscribe({
        next: (response) => {
          this.files.update((files) => {
            return files.map((item) => {
              return item.id === file.id ? { ...item, name: response.originalName } : item;
            });
          });
          this.actionMessage.set('เปลี่ยนชื่อไฟล์สำเร็จ');
          this.renameTarget.set(null);
          this.renameName.set('');
          this.closeActionMenu();
        },
        error: () => {
          this.renameError.set('ไม่สามารถเปลี่ยนชื่อไฟล์ได้');
        },
      });
  }

  openRenameFolderDialog(folder: MyDriveFolder): void {
    this.closeActionMenu();
    this.renameFolderTarget.set(folder);
    this.renameFolderName.set(folder.name);
    this.renameFolderError.set('');
    this.actionMessage.set('');
    this.actionError.set('');
  }

  cancelRenameFolder(): void {
    if (this.renamingFolderId() !== null) {
      return;
    }

    this.renameFolderTarget.set(null);
    this.renameFolderName.set('');
    this.renameFolderError.set('');
  }

  submitRenameFolder(event?: Event): void {
    event?.preventDefault();

    const folder = this.renameFolderTarget();
    const nextName = this.renameFolderName().trim();

    if (!folder || this.renamingFolderId() !== null) {
      return;
    }

    if (!nextName) {
      this.renameFolderError.set('กรุณากรอกชื่อโฟลเดอร์');
      return;
    }

    if (nextName === folder.name) {
      this.cancelRenameFolder();
      return;
    }

    this.renamingFolderId.set(folder.id);
    this.renameFolderError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    this.folderService
      .rename({
        folderId: folder.id,
        folderName: nextName,
      })
      .pipe(finalize(() => this.renamingFolderId.set(null)))
      .subscribe({
        next: (response) => {
          // Update only local folder labels so the page does not flash from a full reload.
          this.folders.update((folders) => {
            return folders.map((item) => {
              return item.id === folder.id ? { ...item, name: response.folderName } : item;
            });
          });
          this.folderPath.update((items) => {
            return items.map((item) => {
              return item.id === folder.id ? { ...item, name: response.folderName } : item;
            });
          });
          this.actionMessage.set('เปลี่ยนชื่อโฟลเดอร์สำเร็จ');
          this.renameFolderTarget.set(null);
          this.renameFolderName.set('');
        },
        error: () => {
          this.renameFolderError.set('ไม่สามารถเปลี่ยนชื่อโฟลเดอร์ได้');
        },
      });
  }

  moveFolder(folder: MyDriveFolder): void {
    this.closeActionMenu();
    this.moveFolderTarget.set(folder);
    this.moveFolderDestinationId.set(this.currentFolderId());
    this.moveFolderDestinationPath.set([...this.folderPath()]);
    this.moveFolderError.set('');
    this.actionMessage.set('');
    this.actionError.set('');
    this.loadFolderMoveChoices(this.currentFolderId());
  }

  cancelMoveFolder(): void {
    if (this.movingFolderId() !== null) {
      return;
    }

    this.moveFolderTarget.set(null);
    this.moveFolderDestinationId.set(null);
    this.moveFolderDestinationPath.set([]);
    this.moveFolderChoices.set([]);
    this.moveFolderError.set('');
  }

  openMoveFolderRoot(): void {
    this.moveFolderDestinationId.set(null);
    this.moveFolderDestinationPath.set([]);
    this.loadFolderMoveChoices(null);
  }

  openMoveFolderDestination(folder: MyDriveFolder): void {
    this.moveFolderDestinationId.set(folder.id);
    this.moveFolderDestinationPath.update((items) => [
      ...items,
      {
        id: folder.id,
        name: folder.name,
      },
    ]);
    this.loadFolderMoveChoices(folder.id);
  }

  openMoveFolderDestinationPath(index: number): void {
    const nextPath = this.moveFolderDestinationPath().slice(0, index + 1);
    const targetFolder = nextPath.at(-1) ?? null;

    this.moveFolderDestinationPath.set(nextPath);
    this.moveFolderDestinationId.set(targetFolder?.id ?? null);
    this.loadFolderMoveChoices(targetFolder?.id ?? null);
  }

  submitMoveFolder(): void {
    const folder = this.moveFolderTarget();

    if (!folder || this.movingFolderId() !== null) {
      return;
    }

    const destinationId = this.moveFolderDestinationId();

    if (destinationId === folder.parentId) {
      this.cancelMoveFolder();
      return;
    }

    if (destinationId === folder.id) {
      this.moveFolderError.set('ไม่สามารถย้ายโฟลเดอร์เข้าไปในตัวเองได้');
      return;
    }

    this.movingFolderId.set(folder.id);
    this.moveFolderError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    this.folderService
      .move({
        folderId: folder.id,
        parentId: destinationId,
      })
      .pipe(finalize(() => this.movingFolderId.set(null)))
      .subscribe({
        next: (response) => {
          if (response.parentId !== this.currentFolderId()) {
            this.folders.update((folders) => folders.filter((item) => item.id !== folder.id));
          } else {
            this.folders.update((folders) => {
              return folders.map((item) => {
                return item.id === folder.id ? { ...item, parentId: response.parentId } : item;
              });
            });
          }

          this.actionMessage.set('ย้ายโฟลเดอร์สำเร็จ');
          this.movingFolderId.set(null);
          this.cancelMoveFolder();
        },
        error: () => {
          this.moveFolderError.set('ไม่สามารถย้ายโฟลเดอร์ได้');
        },
      });
  }

  moveFile(file: MyDriveFile): void {
    this.closeActionMenu();
    this.moveTarget.set(file);
    this.moveDestinationId.set(this.currentFolderId());
    this.moveFolderPath.set([...this.folderPath()]);
    this.moveError.set('');
    this.actionMessage.set('');
    this.actionError.set('');
    this.moveMessage.set('');
    this.loadMoveFolders(this.currentFolderId());
  }

  openShareDialog(file: MyDriveFile): void {
    this.closeActionMenu();
    this.shareTarget.set({ kind: 'file', item: file });
    this.shareMode.set('user');
    this.shareEmail.set('');
    this.shareUserSuggestions.set([]);
    this.sharePermission.set('viewer');
    this.shareExpiresAt.set('');
    this.shareLinkUrl.set('');
    this.shareMessage.set('');
    this.shareError.set('');
    this.sharePermissions.set([]);
    this.loadSharePermissions();
    this.actionMessage.set('');
    this.actionError.set('');
  }

  openShareFolderDialog(folder: MyDriveFolder): void {
    this.closeActionMenu();
    this.shareTarget.set({ kind: 'folder', item: folder });
    this.shareMode.set('user');
    this.shareEmail.set('');
    this.shareUserSuggestions.set([]);
    this.sharePermission.set('viewer');
    this.shareExpiresAt.set('');
    this.shareLinkUrl.set('');
    this.shareMessage.set('');
    this.shareError.set('');
    this.sharePermissions.set([]);
    this.loadSharePermissions();
    this.actionMessage.set('');
    this.actionError.set('');
  }

  cancelShare(): void {
    if (this.sharingFileId() !== null || this.creatingShareLink()) {
      return;
    }

    this.shareTarget.set(null);
    this.shareMode.set('user');
    this.shareEmail.set('');
    this.shareUserSuggestions.set([]);
    this.sharePermission.set('viewer');
    this.shareExpiresAt.set('');
    this.shareLinkUrl.set('');
    this.shareMessage.set('');
    this.shareError.set('');
    this.sharePermissions.set([]);
    this.loadingSharePermissions.set(false);
    this.updatingSharePermissionId.set(null);
    this.removingSharePermissionId.set(null);
  }

  setShareMode(mode: ShareMode): void {
    if (this.sharingFileId() !== null || this.creatingShareLink()) {
      return;
    }

    this.shareMode.set(mode);
    this.shareError.set('');
    this.shareMessage.set('');
  }

  onShareEmailInput(value: string): void {
    this.shareEmail.set(value);
    this.shareError.set('');

    const keyword = value.trim();
    if (keyword.length < 2) {
      this.shareUserSuggestions.set([]);
      return;
    }

    this.searchingShareUsers.set(true);
    this.fileService
      .searchShareUsers(keyword)
      .pipe(finalize(() => this.searchingShareUsers.set(false)))
      .subscribe({
        next: (users) => {
          if (this.shareEmail().trim() === keyword) {
            this.shareUserSuggestions.set(users);
          }
        },
        error: () => {
          this.shareUserSuggestions.set([]);
        },
      });
  }

  selectShareUser(user: ShareUserSuggestion): void {
    this.shareEmail.set(user.email);
    this.shareUserSuggestions.set([]);
    this.shareError.set('');
  }

  loadSharePermissions(): void {
    const target = this.shareTarget();

    if (!target) {
      return;
    }

    this.loadingSharePermissions.set(true);
    this.shareError.set('');

    const request: Observable<DriveSharePermission[]> =
      target.kind === 'file'
        ? this.fileService.listSharePermissions(target.item.id)
        : this.folderService.listSharePermissions(target.item.id);

    request
      .pipe(finalize(() => this.loadingSharePermissions.set(false)))
      .subscribe({
        next: (permissions) => {
          this.sharePermissions.set(permissions);
        },
        error: () => {
          this.sharePermissions.set([]);
          this.shareError.set('ไม่สามารถโหลดรายการสิทธิ์ของไฟล์นี้ได้');
        },
      });
  }

  updateSharePermission(
    permission: DriveSharePermission,
    nextPermission: 'viewer' | 'editor',
  ): void {
    const target = this.shareTarget();

    if (!target || this.updatingSharePermissionId() !== null) {
      return;
    }

    this.updatingSharePermissionId.set(permission.id);
    this.shareError.set('');
    this.shareMessage.set('');

    const request: Observable<DriveUpdateSharePermissionResponse> =
      target.kind === 'file'
        ? this.fileService.updateSharePermission({
            fileId: target.item.id,
            email: permission.email,
            permission: nextPermission,
            expiresAt: permission.expiresAt ?? null,
          })
        : this.folderService.updateSharePermission({
            folderId: target.item.id,
            email: permission.email,
            permission: nextPermission,
            expiresAt: permission.expiresAt ?? null,
          });

    request
      .pipe(finalize(() => this.updatingSharePermissionId.set(null)))
      .subscribe({
        next: (response) => {
          this.shareMessage.set(response.message || 'อัปเดตสิทธิ์เรียบร้อย');
          this.sharePermissions.update((permissions) =>
            permissions.map((item) =>
              item.id === permission.id ? { ...item, permission: nextPermission } : item,
            ),
          );
        },
        error: () => {
          this.shareError.set('ไม่สามารถอัปเดตสิทธิ์ได้');
        },
      });
  }

  removeSharePermission(permission: DriveSharePermission): void {
    const target = this.shareTarget();

    if (this.removingSharePermissionId() !== null || this.updatingSharePermissionId() !== null) {
      return;
    }

    if (!target) {
      return;
    }

    this.removingSharePermissionId.set(permission.id);
    this.shareError.set('');
    this.shareMessage.set('');

    const request: Observable<DriveRemoveSharePermissionResponse> =
      target.kind === 'file'
        ? this.fileService.removeSharePermission({
            sharedFileId: permission.id,
            email: permission.email,
          })
        : this.folderService.removeSharePermission({
            sharedFolderId: permission.id,
            email: permission.email,
          });

    request
      .pipe(finalize(() => this.removingSharePermissionId.set(null)))
      .subscribe({
        next: (response) => {
          this.shareMessage.set(response.message || 'ลบสิทธิ์ผู้ใช้เรียบร้อย');
          this.sharePermissions.update((permissions) =>
            permissions.filter((item) => item.id !== permission.id),
          );
        },
        error: () => {
          this.shareError.set('ไม่สามารถลบสิทธิ์ผู้ใช้นี้ได้');
        },
      });
  }

  submitShare(event?: Event): void {
    event?.preventDefault();

    const target = this.shareTarget();
    const email = this.shareEmail().trim().toLowerCase();
    const expiresAt = this.shareExpiresAt();

    if (!target || this.sharingFileId() !== null) {
      return;
    }

    if (!email || !email.includes('@')) {
      this.shareError.set('กรุณากรอกอีเมลให้ถูกต้อง');
      return;
    }

    this.sharingFileId.set(target.item.id);
    this.shareError.set('');
    this.actionMessage.set('');
    this.actionError.set('');

    const request: Observable<DriveShareResponse> =
      target.kind === 'file'
        ? this.fileService.share({
            fileId: target.item.id,
            email,
            permission: this.sharePermission(),
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          })
        : this.folderService.share({
            folderId: target.item.id,
            email,
            permission: this.sharePermission(),
            expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          });

    request
      .pipe(finalize(() => this.sharingFileId.set(null)))
      .subscribe({
        next: () => {
          this.actionMessage.set(`แชร์ "${target.item.name}" สำเร็จ`);
          this.shareEmail.set('');
          this.shareUserSuggestions.set([]);
          this.loadSharePermissions();
        },
        error: (error) => {
          this.shareError.set(
            error.status === 400 ? 'ข้อมูลการแชร์ไม่ถูกต้อง' : 'ไม่สามารถแชร์ไฟล์ได้',
          );
        },
      });
  }

  createPublicShareLink(event?: Event): void {
    event?.preventDefault();

    const target = this.shareTarget();
    const expiresAt = this.shareExpiresAt();

    if (!target || target.kind !== 'file' || this.creatingShareLink()) {
      return;
    }

    this.creatingShareLink.set(true);
    this.shareError.set('');
    this.shareMessage.set('');
    this.shareLinkUrl.set('');

    this.fileService
      .createPublicLink({
        fileId: target.item.id,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      })
      .pipe(finalize(() => this.creatingShareLink.set(false)))
      .subscribe({
        next: (response) => {
          this.shareLinkUrl.set(response.publicLink.url);
          this.shareMessage.set('สร้างลิงก์เรียบร้อย ใครมีลิงก์นี้จะดาวน์โหลดไฟล์ได้');
        },
        error: (error) => {
          this.shareError.set(
            error.status === 400 ? 'ข้อมูลลิงก์แชร์ไม่ถูกต้อง' : 'ไม่สามารถสร้างลิงก์แชร์ได้',
          );
        },
      });
  }

  copyShareLink(): void {
    const linkUrl = this.shareLinkUrl();

    if (!linkUrl) {
      return;
    }

    if (!navigator?.clipboard) {
      this.shareError.set('เบราว์เซอร์นี้ไม่รองรับการคัดลอกอัตโนมัติ');
      return;
    }

    navigator.clipboard
      .writeText(linkUrl)
      .then(() => {
        this.shareMessage.set('คัดลอกลิงก์แล้ว');
        this.shareError.set('');
      })
      .catch(() => {
        this.shareError.set('ไม่สามารถคัดลอกลิงก์ได้');
      });
  }

  cancelMove(): void {
    if (this.movingFileId() !== null) {
      return;
    }

    this.moveTarget.set(null);
    this.moveDestinationId.set(null);
    this.moveFolderPath.set([]);
    this.moveFolders.set([]);
    this.moveError.set('');
  }

  openMoveRoot(): void {
    this.moveDestinationId.set(null);
    this.moveFolderPath.set([]);
    this.loadMoveFolders(null);
  }

  openMoveFolder(folder: MyDriveFolder): void {
    this.moveDestinationId.set(folder.id);
    this.moveFolderPath.update((items) => [
      ...items,
      {
        id: folder.id,
        name: folder.name,
      },
    ]);
    this.loadMoveFolders(folder.id);
  }

  openMoveFolderPath(index: number): void {
    const nextPath = this.moveFolderPath().slice(0, index + 1);
    const targetFolder = nextPath.at(-1) ?? null;

    this.moveFolderPath.set(nextPath);
    this.moveDestinationId.set(targetFolder?.id ?? null);
    this.loadMoveFolders(targetFolder?.id ?? null);
  }

  submitMove(): void {
    const file = this.moveTarget();

    if (!file || this.movingFileId() !== null) {
      return;
    }

    const destinationId = this.moveDestinationId();

    if (destinationId === file.folderId) {
      this.cancelMove();
      return;
    }

    this.movingFileId.set(file.id);
    this.moveError.set('');
    this.actionMessage.set('');
    this.actionError.set('');
    this.moveMessage.set('');

    this.fileService
      .move({
        fileId: file.id,
        folderId: destinationId,
      })
      .pipe(finalize(() => this.movingFileId.set(null)))
      .subscribe({
        next: (response) => {
          if (response.folderId !== this.currentFolderId()) {
            this.files.update((files) => files.filter((item) => item.id !== file.id));
          } else {
            this.files.update((files) => {
              return files.map((item) => {
                return item.id === file.id ? { ...item, folderId: response.folderId } : item;
              });
            });
          }

          this.actionMessage.set('ย้ายไฟล์สำเร็จ');
          this.movingFileId.set(null);
          this.cancelMove();
        },
        error: () => {
          this.moveError.set('ไม่สามารถย้ายไฟล์ได้');
        },
      });
  }

  setViewMode(mode: MyDriveViewMode): void {
    this.closeActionMenu();
    this.closeNewMenu();
    this.viewMode.set(mode);
    localStorage.setItem(myDriveViewModeStorageKey, mode);
  }

  effectiveViewMode(): MyDriveViewMode {
    return this.isMobileView() ? 'grid' : this.viewMode();
  }

  sortBy(field: MyDriveSortField): void {
    if (this.sortField() === field) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortField.set(field);
    this.sortDirection.set(field === 'updated' ? 'desc' : 'asc');
  }

  sortIndicator(field: MyDriveSortField): string {
    if (this.sortField() !== field) {
      return '';
    }

    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  toggleActionMenu(fileId: number, event: MouseEvent): void {
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    const buttonRect = button.getBoundingClientRect();
    const menuWidth = 176;
    const menuGap = 8;

    // Keep the menu outside table/card overflow so it behaves like the dashboard menu.
    this.closeNewMenu();
    this.openActionFolderId.set(null);
    this.actionMenuPosition.set({
      top: buttonRect.bottom + menuGap,
      left: Math.max(12, buttonRect.right - menuWidth),
    });

    this.openActionFileId.update((currentFileId) => {
      return currentFileId === fileId ? null : fileId;
    });
  }

  openFileContextMenu(fileId: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 176;
    const menuHeight = 216;
    const viewportPadding = 12;

    // Right-click should feel like a desktop drive: open actions at the pointer.
    this.closeNewMenu();
    this.openActionFolderId.set(null);
    this.actionMenuPosition.set({
      top: Math.max(
        viewportPadding,
        Math.min(event.clientY, window.innerHeight - menuHeight - viewportPadding),
      ),
      left: Math.max(
        viewportPadding,
        Math.min(event.clientX, window.innerWidth - menuWidth - viewportPadding),
      ),
    });
    this.openActionFileId.set(fileId);
  }

  openFolderContextMenu(folderId: number, event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const menuWidth = 176;
    const menuHeight = 176;
    const viewportPadding = 12;

    this.closeNewMenu();
    this.openActionFileId.set(null);
    this.actionMenuPosition.set({
      top: Math.max(
        viewportPadding,
        Math.min(event.clientY, window.innerHeight - menuHeight - viewportPadding),
      ),
      left: Math.max(
        viewportPadding,
        Math.min(event.clientX, window.innerWidth - menuWidth - viewportPadding),
      ),
    });
    this.openActionFolderId.set(folderId);
  }

  openBlankContextMenu(event: MouseEvent): void {
    event.preventDefault();

    const target = event.target as HTMLElement;

    if (target.closest('[data-drive-item], [data-drive-menu], button, a, input, label, select')) {
      return;
    }

    const menuWidth = 224;
    const menuHeight = 144;
    const viewportPadding = 12;

    this.closeActionMenu();
    this.newMenuPosition.set({
      top: Math.max(
        viewportPadding,
        Math.min(event.clientY, window.innerHeight - menuHeight - viewportPadding),
      ),
      left: Math.max(
        viewportPadding,
        Math.min(event.clientX, window.innerWidth - menuWidth - viewportPadding),
      ),
    });
    this.newMenuOpen.set(true);
  }

  toggleFolderActionMenu(folderId: number, event: MouseEvent): void {
    event.stopPropagation();

    const button = event.currentTarget as HTMLElement;
    const buttonRect = button.getBoundingClientRect();
    const menuWidth = 176;
    const menuGap = 8;

    this.closeNewMenu();
    this.openActionFileId.set(null);
    this.actionMenuPosition.set({
      top: buttonRect.bottom + menuGap,
      left: Math.max(12, buttonRect.right - menuWidth),
    });

    this.openActionFolderId.update((currentFolderId) => {
      return currentFolderId === folderId ? null : folderId;
    });
  }

  closeActionMenu(): void {
    this.openActionFileId.set(null);
    this.openActionFolderId.set(null);
  }

  fileIcon(type: MyDriveFile['type']): 'image' | 'text' | 'file' {
    if (type === 'image') {
      return 'image';
    }

    if (type === 'document') {
      return 'text';
    }

    return 'file';
  }

  fileIconAsset(file: MyDriveFile): string | null {
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

  canPreviewSvg(file: MyDriveFile): boolean {
    const mimeType = file.mimeType.toLowerCase();
    const fileName = file.name.toLowerCase();

    return mimeType.includes('svg') || fileName.endsWith('.svg');
  }

  private updateFolderUploadProgress(
    fileProgress: Map<string, number>,
    totalFiles: number,
    finishedCount: number,
  ): void {
    const totalProgress = Array.from(fileProgress.values()).reduce(
      (sum, progress) => sum + progress,
      0,
    );
    const progress = totalFiles > 0 ? Math.round(totalProgress / totalFiles) : 0;

    this.uploadProgress.set(Math.min(progress, 99));
    this.uploadProgressLabel.set(`${finishedCount}/${totalFiles} ไฟล์`);
  }

  private finishFolderUploadIfDone(
    input: HTMLInputElement,
    totalFiles: number,
    finishedCount: number,
    failedCount: number,
    uploadedFiles: MyDriveFile[],
  ): void {
    this.uploadProgressLabel.set(`${finishedCount}/${totalFiles} ไฟล์`);

    if (finishedCount < totalFiles) {
      return;
    }

    this.uploading.set(false);
    this.uploadProgress.set(0);
    this.uploadProgressLabel.set('');
    input.value = '';

    if (uploadedFiles.length > 0) {
      this.files.update((currentFiles) => [...uploadedFiles, ...currentFiles]);
      uploadedFiles
        .filter((file) => this.canPreviewSvg(file))
        .forEach((file) => this.loadSvgPreview(file));
    }

    if (failedCount > 0) {
      this.uploadError.set(`อัปโหลดไม่สำเร็จ ${failedCount} ไฟล์`);
    }

    if (uploadedFiles.length > 0) {
      this.uploadMessage.set(`อัปโหลด ${uploadedFiles.length} ไฟล์สำเร็จ`);
    }
  }

  private async loadFromRoute(folderIdParam: string | null): Promise<void> {
    this.closeActionMenu();
    this.closeNewMenu();
    this.uploadMessage.set('');
    this.uploadError.set('');
    this.actionMessage.set('');
    this.actionError.set('');
    this.moveMessage.set('');

    if (!folderIdParam) {
      this.currentFolderId.set(null);
      this.folderPath.set([]);
      this.loadFiles();
      return;
    }

    const folderId = Number(folderIdParam);

    if (!Number.isInteger(folderId) || folderId <= 0) {
      this.currentFolderId.set(null);
      this.folderPath.set([]);
      this.loadError.set('รหัสโฟลเดอร์ไม่ถูกต้อง');
      this.files.set([]);
      this.folders.set([]);
      return;
    }

    this.currentFolderId.set(folderId);

    try {
      this.folderPath.set(await this.buildFolderPath(folderId));
      this.loadFiles();
    } catch {
      this.loadError.set('ไม่สามารถโหลดข้อมูลโฟลเดอร์ได้');
      this.files.set([]);
      this.folders.set([]);
    }
  }

  private async buildFolderPath(folderId: number): Promise<FolderPathItem[]> {
    const pathItems: FolderPathItem[] = [];
    let nextFolderId: number | null = folderId;

    while (nextFolderId !== null) {
      const folder: UserFolder = await firstValueFrom(this.folderService.getById(nextFolderId));

      pathItems.unshift({
        id: folder.id,
        name: folder.folderName,
      });
      nextFolderId = folder.parentId;
    }

    return pathItems;
  }

  private revealHighlightedFile(): void {
    const fileId = this.highlightedFileId();

    if (!fileId) {
      return;
    }

    window.setTimeout(() => {
      const target = document.getElementById(`my-drive-file-${fileId}`);

      if (!target) {
        return;
      }

      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 100);
  }

  private loadMoveFolders(parentId: number | null): void {
    this.moveFoldersLoading.set(true);
    this.moveError.set('');

    this.folderService
      .list(parentId)
      .pipe(finalize(() => this.moveFoldersLoading.set(false)))
      .subscribe({
        next: (folders) => {
          const movingFile = this.moveTarget();
          this.moveFolders.set(
            folders
              .map((folder) => this.toMyDriveFolder(folder))
              .filter((folder) => folder.id !== movingFile?.folderId),
          );
        },
        error: () => {
          this.moveError.set('ไม่สามารถโหลดรายการโฟลเดอร์ได้');
        },
      });
  }

  private loadFolderMoveChoices(parentId: number | null): void {
    this.moveFolderChoicesLoading.set(true);
    this.moveFolderError.set('');

    this.folderService
      .list(parentId)
      .pipe(finalize(() => this.moveFolderChoicesLoading.set(false)))
      .subscribe({
        next: (folders) => {
          const movingFolder = this.moveFolderTarget();

          // Hide the folder being moved so users cannot choose itself as destination.
          this.moveFolderChoices.set(
            folders
              .map((folder) => this.toMyDriveFolder(folder))
              .filter((folder) => folder.id !== movingFolder?.id),
          );
        },
        error: () => {
          this.moveFolderError.set('ไม่สามารถโหลดรายการโฟลเดอร์ได้');
        },
      });
  }

  private loadSvgPreview(file: MyDriveFile): void {
    if (this.previewObjectUrls.has(file.id)) {
      return;
    }

    this.fileService.download(file.id).subscribe({
      next: (blob) => {
        // Uploaded SVG files can be detected by the backend as text/plain or octet-stream.
        // Force the preview blob MIME so <img> can decode the SVG reliably.
        const previewBlob = new Blob([blob], { type: 'image/svg+xml' });
        const previewUrl = window.URL.createObjectURL(previewBlob);

        this.previewObjectUrls.set(file.id, previewUrl);
        this.files.update((files) => {
          return files.map((item) => {
            return item.id === file.id ? { ...item, previewUrl } : item;
          });
        });
      },
      error: () => {
        // Preview is optional; the normal file icon still works when download fails.
      },
    });
  }

  private clearSvgPreviewUrls(): void {
    this.previewObjectUrls.forEach((url) => window.URL.revokeObjectURL(url));
    this.previewObjectUrls.clear();
  }

  private toMyDriveFolder(folder: UserFolder): MyDriveFolder {
    const updatedAtTime = new Date(folder.updatedAt).getTime();

    return {
      id: folder.id,
      parentId: folder.parentId,
      name: folder.folderName,
      updatedAtTime: Number.isNaN(updatedAtTime) ? 0 : updatedAtTime,
      updatedAt: this.formatDate(folder.updatedAt),
    };
  }

  private toMyDriveFile(file: UserFile): MyDriveFile {
    const updatedAtTime = new Date(file.updatedAt).getTime();

    return {
      id: file.id,
      folderId: file.folderId ?? null,
      name: file.originalName,
      type: this.fileType(file),
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      size: this.formatFileSize(file.sizeBytes),
      updatedAtTime: Number.isNaN(updatedAtTime) ? 0 : updatedAtTime,
      updatedAt: this.formatDate(file.updatedAt),
    };
  }

  private fileType(file: UserFile): MyDriveFile['type'] {
    const mimeType = file.mimeType.toLowerCase();
    const originalName = file.originalName.toLowerCase();

    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.startsWith('text/')) {
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
    firstFile: MyDriveFile,
    secondFile: MyDriveFile,
    field: MyDriveSortField,
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

  private compareFolders(
    firstFolder: MyDriveFolder,
    secondFolder: MyDriveFolder,
    field: MyDriveSortField,
  ): number {
    if (field === 'updated') {
      return firstFolder.updatedAtTime - secondFolder.updatedAtTime;
    }

    return firstFolder.name.localeCompare(secondFolder.name, 'th', {
      numeric: true,
      sensitivity: 'base',
    });
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

  private restoreViewMode(): void {
    const savedMode = localStorage.getItem(myDriveViewModeStorageKey);

    if (savedMode === 'grid' || savedMode === 'list') {
      this.viewMode.set(savedMode);
    }
  }

  private syncMobileViewMode(): void {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const updateMobileView = (matches: boolean) => {
      this.isMobileView.set(matches);
      this.closeActionMenu();
    };
    const onMediaQueryChange = (event: MediaQueryListEvent) => updateMobileView(event.matches);

    updateMobileView(mediaQuery.matches);
    mediaQuery.addEventListener('change', onMediaQueryChange);
    this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', onMediaQueryChange));
  }
}
