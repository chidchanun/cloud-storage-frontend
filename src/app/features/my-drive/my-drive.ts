import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import {
  ActivatedRoute,
  Router,
} from '@angular/router';
import {
  LucideChevronRight,
  LucideDownload,
  LucideFile,
  LucideFileImage,
  LucideFileText,
  LucideFolder,
  LucideFolderPlus,
  LucideGrid3X3,
  LucideList,
  LucideMoreVertical,
  LucideMoveRight,
  LucidePencil,
  LucidePlus,
  LucideRefreshCw,
  LucideTrash2,
  LucideUpload,
  LucideX,
} from '@lucide/angular';
import {
  finalize,
  firstValueFrom,
  forkJoin,
} from 'rxjs';

import {
  FileService,
  UserFile,
} from '../../core/services/file.service';
import {
  FolderService,
  UserFolder,
} from '../../core/services/folder.service';
import { AppSidebar } from '../../shared/components/app-sidebar/app-sidebar';

interface MyDriveFile {
  id: number;
  folderId: number | null;
  name: string;
  type: 'document' | 'image' | 'archive' | 'file';
  mimeType: string;
  size: string;
  updatedAt: string;
  previewUrl?: string;
}

interface MyDriveFolder {
  id: number;
  parentId: number | null;
  name: string;
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

const myDriveViewModeStorageKey = 'anucloud:my-drive-view-mode';

@Component({
  selector: 'app-my-drive',
  imports: [
    AppSidebar,
    LucideChevronRight,
    LucideDownload,
    LucideFile,
    LucideFileImage,
    LucideFileText,
    LucideFolder,
    LucideFolderPlus,
    LucideGrid3X3,
    LucideList,
    LucideMoreVertical,
    LucideMoveRight,
    LucidePencil,
    LucidePlus,
    LucideRefreshCw,
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
  readonly viewMode = signal<MyDriveViewMode>('list');
  readonly openActionFileId = signal<number | null>(null);
  readonly openActionFolderId = signal<number | null>(null);
  readonly actionMenuPosition = signal<ActionMenuPosition>({
    top: 0,
    left: 0,
  });

  constructor() {
    // Keep API fetching on the client so the server-rendered shell stays quick.
    afterNextRender(() => {
      this.restoreViewMode();
      this.route.paramMap.subscribe((params) => {
        window.setTimeout(() => {
          void this.loadFromRoute(params.get('id'));
        }, 0);
      });
    });

    this.destroyRef.onDestroy(() => {
      this.clearSvgPreviewUrls();
    });
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
          nextFiles
            .filter((file) => this.canPreviewSvg(file))
            .forEach((file) => this.loadSvgPreview(file));
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

    this.folderService.create(folderName, this.currentFolderId())
      .pipe(finalize(() => this.creatingFolder.set(false)))
      .subscribe({
        next: (response) => {
          this.folders.update((folders) => [
            this.toMyDriveFolder(response.folder),
            ...folders,
          ]);
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
    this.uploadMessage.set('');
    this.uploadError.set('');

    this.fileService.upload(file, this.currentFolderId())
      .pipe(
        finalize(() => {
          this.uploading.set(false);
          input.value = '';
        }),
      )
      .subscribe({
        next: (response) => {
          const uploadedFile = this.toMyDriveFile(response.file);

          this.files.update((files) => [
            uploadedFile,
            ...files,
          ]);
          if (this.canPreviewSvg(uploadedFile)) {
            this.loadSvgPreview(uploadedFile);
          }
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
    this.uploadMessage.set('');
    this.uploadError.set('');

    forkJoin(files.map((file) => this.fileService.upload(file, this.currentFolderId())))
      .pipe(
        finalize(() => {
          this.uploading.set(false);
          input.value = '';
        }),
      )
      .subscribe({
        next: (responses) => {
          const uploadedFiles = responses.map((response) => this.toMyDriveFile(response.file));

          this.files.update((currentFiles) => [
            ...uploadedFiles,
            ...currentFiles,
          ]);
          uploadedFiles
            .filter((file) => this.canPreviewSvg(file))
            .forEach((file) => this.loadSvgPreview(file));
          this.uploadMessage.set(`อัปโหลด ${responses.length} ไฟล์สำเร็จ`);
        },
        error: () => {
          this.uploadError.set('ไม่สามารถอัปโหลดโฟลเดอร์ได้');
        },
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

    this.fileService.download(file.id)
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

    const confirmed = window.confirm(`ลบไฟล์ "${file.name}" ใช่ไหม?`);

    if (!confirmed) {
      return;
    }

    this.closeActionMenu();
    this.deletingFileId.set(file.id);
    this.actionMessage.set('');
    this.actionError.set('');

    this.fileService.delete(file.id)
      .pipe(finalize(() => this.deletingFileId.set(null)))
      .subscribe({
        next: () => {
          this.files.update((files) => files.filter((item) => item.id !== file.id));
          this.actionMessage.set('ลบไฟล์สำเร็จ');
        },
        error: () => {
          this.actionError.set('ไม่สามารถลบไฟล์ได้');
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

    this.folderService.rename({
      folderId: folder.id,
      folderName: nextName,
    })
      .pipe(finalize(() => this.renamingFolderId.set(null)))
      .subscribe({
        next: (response) => {
          // Update only local folder labels so the page does not flash from a full reload.
          this.folders.update((folders) => {
            return folders.map((item) => {
              return item.id === folder.id
                ? { ...item, name: response.folderName }
                : item;
            });
          });
          this.folderPath.update((items) => {
            return items.map((item) => {
              return item.id === folder.id
                ? { ...item, name: response.folderName }
                : item;
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

    this.folderService.move({
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
                return item.id === folder.id
                  ? { ...item, parentId: response.parentId }
                  : item;
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

    this.fileService.move({
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
                return item.id === file.id
                  ? { ...item, folderId: response.folderId }
                  : item;
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

  toggleActionMenu(fileId: number, event: MouseEvent): void {
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

  private loadMoveFolders(parentId: number | null): void {
    this.moveFoldersLoading.set(true);
    this.moveError.set('');

    this.folderService.list(parentId)
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

    this.folderService.list(parentId)
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

    this.fileService.download(file.id)
      .subscribe({
        next: (blob) => {
          // Uploaded SVG files can be detected by the backend as text/plain or octet-stream.
          // Force the preview blob MIME so <img> can decode the SVG reliably.
          const previewBlob = new Blob(
            [blob],
            { type: 'image/svg+xml' },
          );
          const previewUrl = window.URL.createObjectURL(previewBlob);

          this.previewObjectUrls.set(file.id, previewUrl);
          this.files.update((files) => {
            return files.map((item) => {
              return item.id === file.id
                ? { ...item, previewUrl }
                : item;
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
    return {
      id: folder.id,
      parentId: folder.parentId,
      name: folder.folderName,
      updatedAt: this.formatDate(folder.updatedAt),
    };
  }

  private toMyDriveFile(file: UserFile): MyDriveFile {
    return {
      id: file.id,
      folderId: file.folderId ?? null,
      name: file.originalName,
      type: this.fileType(file),
      mimeType: file.mimeType,
      size: this.formatFileSize(file.sizeBytes),
      updatedAt: this.formatDate(file.updatedAt),
    };
  }

  private fileType(file: UserFile): MyDriveFile['type'] {
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
}
