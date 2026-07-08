import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, map, Observable, Subscription } from 'rxjs';

import { environment } from '../../../environments/environment';

interface ApiUserFile {
  id: number;
  folder_id?: number | null;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256?: string;
  created_at: string;
  updated_at: string;
}

interface ApiUploadFileResponse {
  message: string;
  file: ApiUserFile;
}

interface ApiStartChunkUploadResponse {
  upload_id: string;
  chunk_size: number;
}

interface ApiListFilesResponse {
  message: string;
  files: ApiUserFile[];
  total: number;
}

interface ApiSearchFilesResponse {
  message: string;
  keyword: string;
  files: ApiUserFile[];
  total: number;
}

interface ApiListTrashFilesResponse {
  message: string;
  files: ApiUserFile[];
  total: number;
}

interface ApiListSharedWithMeResponse {
  message: string;
  files: ApiSharedWithMeFile[];
  total: number;
}

interface ApiSearchUsersResponse {
  message: string;
  users: ApiShareUser[];
  total: number;
}

interface ApiDeleteFileResponse {
  message: string;
  file_id: number;
}

interface ApiRestoreFileResponse {
  message: string;
  file_id: number;
}

interface ApiRenameFileResponse {
  message: string;
  file_id: number;
  original_name: string;
}

interface ApiMoveFileResponse {
  message: string;
  file_id: number;
  folder_id: number | null;
}

interface ApiShareFileResponse {
  message: string;
  shared_file: ApiSharedFile;
}

interface ApiListSharedFilePermissionsResponse {
  message: string;
  permissions: ApiSharedFilePermission[];
  total: number;
}

interface ApiUpdateSharedFilePermissionResponse {
  message: string;
  shared_file: {
    file_id: number;
    shared_by_user_id: number;
    shared_with_user_id: number;
    permission: string;
    expires_at?: string | null;
  };
}

interface ApiRemoveSharedFilePermissionResponse {
  message: string;
}

interface ApiCreatePublicLinkResponse {
  message: string;
  public_link: ApiPublicFileLink;
}

interface ApiSharedFile {
  id: number;
  file_id: number;
  shared_by_user_id: number;
  shared_with_user_id: number;
  permission: string;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiPublicFileLink {
  id: number;
  file_id: number;
  permission: string;
  url: string;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiSharedWithMeFile {
  id: number;
  file_id: number;
  file_name: string;
  permission: string;
  expires_at?: string | null;
}

interface ApiShareUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  picture_path?: string | null;
}

interface ApiSharedFilePermission {
  id: number;
  file_id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  picture_path?: string | null;
  permission: string;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFile {
  id: number;
  folderId?: number | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadFileResponse {
  message: string;
  file: UserFile;
}

export type UploadProgressEvent =
  | {
      type: 'progress';
      progress: number;
    }
  | {
      type: 'complete';
      response: UploadFileResponse;
    };

export interface DeleteFileResponse {
  message: string;
  fileId: number;
}

export interface RestoreFileResponse {
  message: string;
  fileId: number;
}

export interface RenameFileRequest {
  fileId: number;
  originalName: string;
}

export interface RenameFileResponse {
  message: string;
  fileId: number;
  originalName: string;
}

export interface MoveFileRequest {
  fileId: number;
  folderId: number | null;
}

export interface MoveFileResponse {
  message: string;
  fileId: number;
  folderId: number | null;
}

export interface ShareFileRequest {
  fileId: number;
  email: string;
  permission: 'viewer' | 'editor';
  expiresAt?: string | null;
}

export interface SharedFile {
  id: number;
  fileId: number;
  sharedByUserId: number;
  sharedWithUserId: number;
  permission: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShareFileResponse {
  message: string;
  sharedFile: SharedFile;
}

export interface SharedFilePermission {
  id: number;
  fileId: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  picturePath?: string | null;
  permission: 'viewer' | 'editor';
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSharedFilePermissionRequest {
  fileId: number;
  email: string;
  permission: 'viewer' | 'editor';
  expiresAt?: string | null;
}

export interface UpdateSharedFilePermissionResponse {
  message: string;
  fileId: number;
  permission: string;
  expiresAt?: string | null;
}

export interface RemoveSharedFilePermissionRequest {
  sharedFileId: number;
  email: string;
}

export interface RemoveSharedFilePermissionResponse {
  message: string;
}

export interface CreatePublicLinkRequest {
  fileId: number;
  expiresAt?: string | null;
}

export interface PublicFileLink {
  id: number;
  fileId: number;
  permission: string;
  url: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublicLinkResponse {
  message: string;
  publicLink: PublicFileLink;
}

export interface SharedWithMeFile {
  id: number;
  fileId: number;
  fileName: string;
  permission: string;
  expiresAt?: string | null;
}

export interface ShareUserSuggestion {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  picturePath?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class FileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/files`;
  private readonly apiTrashUrl = `${environment.apiUrl}/trash/files`;

  list(folderId?: number | null): Observable<UserFile[]> {
    let params = new HttpParams();

    if (folderId) {
      params = params.set('folder_id', folderId);
    }

    return this.http
      .get<ApiListFilesResponse>(this.apiUrl, {
        params,
        withCredentials: true,
      })
      .pipe(map((response) => response.files.map((file) => this.normalizeFile(file))));
  }

  search(keyword: string): Observable<UserFile[]> {
    const params = new HttpParams().set('q', keyword);

    return this.http
      .get<ApiSearchFilesResponse>(`${this.apiUrl}/search`, {
        params,
        withCredentials: true,
      })
      .pipe(map((response) => response.files.map((file) => this.normalizeFile(file))));
  }

  trashList(): Observable<UserFile[]> {
    return this.http
      .get<ApiListTrashFilesResponse>(this.apiTrashUrl, { withCredentials: true })
      .pipe(map((response) => response.files.map((file) => this.normalizeFile(file))));
  }

  sharedWithMe(): Observable<SharedWithMeFile[]> {
    return this.http
      .get<ApiListSharedWithMeResponse>(`${this.apiUrl}/share-file`, {
        withCredentials: true,
      })
      .pipe(map((response) => response.files.map((file) => this.normalizeSharedWithMeFile(file))));
  }

  searchShareUsers(keyword: string): Observable<ShareUserSuggestion[]> {
    const params = new HttpParams().set('q', keyword);

    return this.http
      .get<ApiSearchUsersResponse>(`${environment.apiUrl}/users/search`, {
        params,
        withCredentials: true,
      })
      .pipe(map((response) => response.users.map((user) => this.normalizeShareUser(user))));
  }

  restore(fileId: number): Observable<RestoreFileResponse> {
    return this.http
      .patch<ApiRestoreFileResponse>(
        `${this.apiTrashUrl}/${fileId}/restore`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          fileId: response.file_id,
        })),
      );
  }

  rename(data: RenameFileRequest): Observable<RenameFileResponse> {
    return this.http
      .patch<ApiRenameFileResponse>(
        `${this.apiUrl}/${data.fileId}/rename`,
        // Backend expects snake_case JSON, while Angular uses camelCase in the app.
        {
          original_name: data.originalName,
        },
        {
          withCredentials: true,
        },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          fileId: response.file_id,
          originalName: response.original_name,
        })),
      );
  }

  move(data: MoveFileRequest): Observable<MoveFileResponse> {
    return this.http
      .patch<ApiMoveFileResponse>(
        `${this.apiUrl}/${data.fileId}/move`,
        // Backend treats null as moving the file back to My Drive root.
        {
          folder_id: data.folderId,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          fileId: response.file_id,
          folderId: response.folder_id,
        })),
      );
  }

  share(data: ShareFileRequest): Observable<ShareFileResponse> {
    return this.http
      .post<ApiShareFileResponse>(
        `${this.apiUrl}/share-file`,
        {
          file_id: data.fileId,
          email: data.email,
          permission: data.permission,
          expires_at: data.expiresAt || null,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          sharedFile: this.normalizeSharedFile(response.shared_file),
        })),
      );
  }

  listSharePermissions(fileId: number): Observable<SharedFilePermission[]> {
    const params = new HttpParams().set('file_id', fileId);

    return this.http
      .get<ApiListSharedFilePermissionsResponse>(`${this.apiUrl}/share-file/permissions`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map((response) =>
          response.permissions.map((permission) => this.normalizeSharedFilePermission(permission)),
        ),
      );
  }

  updateSharePermission(
    data: UpdateSharedFilePermissionRequest,
  ): Observable<UpdateSharedFilePermissionResponse> {
    return this.http
      .patch<ApiUpdateSharedFilePermissionResponse>(
        `${this.apiUrl}/share-file/permissions`,
        {
          file_id: data.fileId,
          email: data.email,
          permission: data.permission,
          expires_at: data.expiresAt || null,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          fileId: response.shared_file.file_id,
          permission: response.shared_file.permission,
          expiresAt: response.shared_file.expires_at ?? null,
        })),
      );
  }

  removeSharePermission(
    data: RemoveSharedFilePermissionRequest,
  ): Observable<RemoveSharedFilePermissionResponse> {
    return this.http
      .delete<ApiRemoveSharedFilePermissionResponse>(
        `${this.apiUrl}/share-file/permissions/${data.sharedFileId}`,
        {
          body: {
            email: data.email,
          },
          withCredentials: true,
        },
      )
      .pipe(
        map((response) => ({
          message: response.message,
        })),
      );
  }

  createPublicLink(data: CreatePublicLinkRequest): Observable<CreatePublicLinkResponse> {
    return this.http
      .post<ApiCreatePublicLinkResponse>(
        `${this.apiUrl}/share-link`,
        {
          file_id: data.fileId,
          expires_at: data.expiresAt || null,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          publicLink: this.normalizePublicFileLink(response.public_link),
        })),
      );
  }

  delete(fileId: number): Observable<DeleteFileResponse> {
    return this.http
      .delete<ApiDeleteFileResponse>(`${this.apiUrl}/${fileId}`, { withCredentials: true })
      .pipe(
        map((response) => ({
          message: response.message,
          fileId: response.file_id,
        })),
      );
  }

  permanentDelete(fileId: number): Observable<DeleteFileResponse> {
    return this.http
      .delete<ApiDeleteFileResponse>(`${this.apiUrl}/${fileId}/delete`, { withCredentials: true })
      .pipe(
        map((response) => ({
          message: response.message,
          fileId: response.file_id,
        })),
      );
  }

  upload(file: File, folderId?: number | null): Observable<UploadFileResponse> {
    const formData = this.buildUploadFormData(file, folderId);

    return this.http
      .post<ApiUploadFileResponse>(this.apiUrl, formData, { withCredentials: true })
      .pipe(
        map((response) => ({
          message: response.message,
          file: this.normalizeFile(response.file),
        })),
      );
  }

  uploadWithProgress(file: File, folderId?: number | null): Observable<UploadProgressEvent> {
    return new Observable<UploadProgressEvent>((observer) => {
      const subscriptions = new Subscription();
      let uploadedBytes = 0;

      const startSubscription = this.startChunkUpload(file, folderId).subscribe({
        next: (session) => {
          const chunkSize = session.chunk_size;
          const totalChunks = Math.ceil(file.size / chunkSize);
          let chunkIndex = 0;

          const uploadNextChunk = (): void => {
            if (chunkIndex >= totalChunks) {
              const completeSubscription = this.completeChunkUpload(session.upload_id).subscribe({
                next: (response) => {
                  observer.next({
                    type: 'complete',
                    response: {
                      message: response.message,
                      file: this.normalizeFile(response.file),
                    },
                  });
                  observer.complete();
                },
                error: (error) => observer.error(error),
              });

              subscriptions.add(completeSubscription);
              return;
            }

            const chunkStart = chunkIndex * chunkSize;
            const chunkEnd = Math.min(chunkStart + chunkSize, file.size);
            const chunk = file.slice(chunkStart, chunkEnd);
            const currentChunkIndex = chunkIndex;

            const chunkSubscription = this
              .uploadChunk(session.upload_id, currentChunkIndex, chunk)
              .subscribe({
                next: (chunkProgress) => {
                  const currentChunkBytes = Math.round(chunk.size * (chunkProgress / 100));
                  const progress = file.size > 0
                    ? Math.round(((uploadedBytes + currentChunkBytes) / file.size) * 100)
                    : 0;

                  observer.next({
                    type: 'progress',
                    progress: Math.min(progress, 99),
                  });
                },
                error: (error) => observer.error(error),
                complete: () => {
                  uploadedBytes += chunk.size;
                  chunkIndex += 1;
                  observer.next({
                    type: 'progress',
                    progress: Math.min(Math.round((uploadedBytes / file.size) * 100), 99),
                  });
                  uploadNextChunk();
                },
              });

            subscriptions.add(chunkSubscription);
          };

          uploadNextChunk();
        },
        error: (error) => observer.error(error),
      });

      subscriptions.add(startSubscription);

      return () => subscriptions.unsubscribe();
    });
  }

  download(fileId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${fileId}/download`, {
      responseType: 'blob',
      withCredentials: true,
    });
  }

  private buildUploadFormData(file: File, folderId?: number | null): FormData {
    const formData = new FormData();
    formData.append('file', file);

    if (folderId) {
      formData.append('folder_id', String(folderId));
    }

    return formData;
  }

  private startChunkUpload(
    file: File,
    folderId?: number | null,
  ): Observable<ApiStartChunkUploadResponse> {
    return this.http.post<ApiStartChunkUploadResponse>(
      `${this.apiUrl}/chunk-upload/start`,
      {
        original_name: file.name,
        size_bytes: file.size,
        folder_id: folderId ?? null,
      },
      { withCredentials: true },
    );
  }

  private uploadChunk(
    uploadId: string,
    chunkIndex: number,
    chunk: Blob,
  ): Observable<number> {
    const formData = new FormData();
    formData.append('chunk', chunk, `chunk-${chunkIndex}`);

    return this.http
      .post(`${this.apiUrl}/chunk-upload/${uploadId}/chunks/${chunkIndex}`, formData, {
        observe: 'events',
        reportProgress: true,
        withCredentials: true,
      })
      .pipe(
        filter((event) => {
          return (
            event.type === HttpEventType.UploadProgress || event.type === HttpEventType.Response
          );
        }),
        map((event) => {
          if (event.type === HttpEventType.UploadProgress) {
            const total = event.total ?? chunk.size;
            return total > 0 ? Math.round((event.loaded / total) * 100) : 0;
          }

          return 100;
        }),
      );
  }

  private completeChunkUpload(uploadId: string): Observable<ApiUploadFileResponse> {
    return this.http.post<ApiUploadFileResponse>(
      `${this.apiUrl}/chunk-upload/${uploadId}/complete`,
      {},
      { withCredentials: true },
    );
  }

  private normalizeSharedFile(sharedFile: ApiSharedFile): SharedFile {
    return {
      id: sharedFile.id,
      fileId: sharedFile.file_id,
      sharedByUserId: sharedFile.shared_by_user_id,
      sharedWithUserId: sharedFile.shared_with_user_id,
      permission: sharedFile.permission,
      expiresAt: sharedFile.expires_at ?? null,
      createdAt: sharedFile.created_at,
      updatedAt: sharedFile.updated_at,
    };
  }

  private normalizePublicFileLink(publicLink: ApiPublicFileLink): PublicFileLink {
    return {
      id: publicLink.id,
      fileId: publicLink.file_id,
      permission: publicLink.permission,
      url: publicLink.url,
      expiresAt: publicLink.expires_at ?? null,
      createdAt: publicLink.created_at,
      updatedAt: publicLink.updated_at,
    };
  }

  private normalizeSharedWithMeFile(file: ApiSharedWithMeFile): SharedWithMeFile {
    return {
      id: file.id,
      fileId: file.file_id,
      fileName: file.file_name,
      permission: file.permission,
      expiresAt: file.expires_at ?? null,
    };
  }

  private normalizeSharedFilePermission(
    permission: ApiSharedFilePermission,
  ): SharedFilePermission {
    return {
      id: permission.id,
      fileId: permission.file_id,
      userId: permission.user_id,
      firstName: permission.first_name,
      lastName: permission.last_name,
      email: permission.email,
      picturePath: permission.picture_path ?? null,
      permission: permission.permission === 'editor' ? 'editor' : 'viewer',
      expiresAt: permission.expires_at ?? null,
      createdAt: permission.created_at,
      updatedAt: permission.updated_at,
    };
  }

  private normalizeShareUser(user: ApiShareUser): ShareUserSuggestion {
    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      emailVerified: user.email_verified,
      picturePath: user.picture_path ?? null,
    };
  }

  private normalizeFile(file: ApiUserFile): UserFile {
    return {
      id: file.id,
      folderId: file.folder_id ?? null,
      originalName: file.original_name,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      checksumSha256: file.checksum_sha256,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    };
  }
}
