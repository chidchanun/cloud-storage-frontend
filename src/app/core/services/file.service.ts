import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

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

interface ApiListFilesResponse {
  message: string;
  files: ApiUserFile[];
  total: number;
}

interface ApiListTrashFilesResponse {
  message: string;
  files: ApiUserFile[];
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
      .get<ApiListFilesResponse>(
        this.apiUrl,
        {
          params,
          withCredentials: true,
        },
      )
      .pipe(
        map((response) => response.files.map((file) => this.normalizeFile(file))),
      );
  }

  trashList(): Observable<UserFile[]> {
    return this.http
      .get<ApiListTrashFilesResponse>(
        this.apiTrashUrl,
        { withCredentials: true },
      )
      .pipe(
        map((response) => response.files.map((file) => this.normalizeFile(file))),
      );
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

  delete(fileId: number): Observable<DeleteFileResponse> {
    return this.http
      .delete<ApiDeleteFileResponse>(
        `${this.apiUrl}/${fileId}`,
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          fileId: response.file_id,
        })),
      );
  }

  upload(file: File, folderId?: number | null): Observable<UploadFileResponse> {
    const formData = new FormData();
    formData.append('file', file);

    if (folderId) {
      formData.append('folder_id', String(folderId));
    }

    return this.http
      .post<ApiUploadFileResponse>(
        this.apiUrl,
        formData,
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          file: this.normalizeFile(response.file),
        })),
      );
  }

  download(fileId: number): Observable<Blob> {
    return this.http.get(
      `${this.apiUrl}/${fileId}/download`,
      {
        responseType: 'blob',
        withCredentials: true,
      },
    );
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
