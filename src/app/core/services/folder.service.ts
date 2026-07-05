import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

interface ApiUserFolder {
  id: number;
  parent_id: number | null;
  folder_name: string;
  created_at: string;
  updated_at: string;
}

interface ApiListFoldersResponse {
  message: string;
  folders: ApiUserFolder[];
  total: number;
  parent_id: number | null;
}

interface ApiCreateFolderResponse {
  message: string;
  folder: ApiUserFolder;
}

interface ApiGetFolderResponse {
  message: string;
  folder: ApiUserFolder;
}

interface ApiRenameFolderResponse {
  message: string;
  folder_id: number;
  folder_name: string;
}

interface ApiMoveFolderResponse {
  message: string;
  folder_id: number;
  parent_id: number | null;
}

export interface UserFolder {
  id: number;
  parentId: number | null;
  folderName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderResponse {
  message: string;
  folder: UserFolder;
}

export interface RenameFolderRequest {
  folderId: number;
  folderName: string;
}

export interface RenameFolderResponse {
  message: string;
  folderId: number;
  folderName: string;
}

export interface MoveFolderRequest {
  folderId: number;
  parentId: number | null;
}

export interface MoveFolderResponse {
  message: string;
  folderId: number;
  parentId: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class FolderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/folders`;

  list(parentId?: number | null): Observable<UserFolder[]> {
    let params = new HttpParams();

    if (parentId) {
      params = params.set('parent_id', parentId);
    }

    return this.http
      .get<ApiListFoldersResponse>(
        this.apiUrl,
        {
          params,
          withCredentials: true,
        },
      )
      .pipe(
        map((response) => response.folders.map((folder) => this.normalizeFolder(folder))),
      );
  }

  create(folderName: string, parentId?: number | null): Observable<CreateFolderResponse> {
    return this.http
      .post<ApiCreateFolderResponse>(
        this.apiUrl,
        // Backend expects snake_case JSON; the app keeps camelCase at the component layer.
        {
          folder_name: folderName,
          parent_id: parentId ?? null,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          folder: this.normalizeFolder(response.folder),
        })),
      );
  }

  getById(folderId: number): Observable<UserFolder> {
    return this.http
      .get<ApiGetFolderResponse>(
        `${this.apiUrl}/${folderId}`,
        { withCredentials: true },
      )
      .pipe(
        map((response) => this.normalizeFolder(response.folder)),
      );
  }

  rename(data: RenameFolderRequest): Observable<RenameFolderResponse> {
    return this.http
      .patch<ApiRenameFolderResponse>(
        `${this.apiUrl}/${data.folderId}/rename`,
        // Backend uses snake_case JSON, while components keep camelCase names.
        {
          folder_name: data.folderName,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          folderId: response.folder_id,
          folderName: response.folder_name,
        })),
      );
  }

  move(data: MoveFolderRequest): Observable<MoveFolderResponse> {
    return this.http
      .patch<ApiMoveFolderResponse>(
        `${this.apiUrl}/${data.folderId}/move`,
        // Backend uses folder_id for the destination parent folder. Null means root.
        {
          folder_id: data.parentId,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          folderId: response.folder_id,
          parentId: response.parent_id,
        })),
      );
  }

  private normalizeFolder(folder: ApiUserFolder): UserFolder {
    return {
      id: folder.id,
      parentId: folder.parent_id,
      folderName: folder.folder_name,
      createdAt: folder.created_at,
      updatedAt: folder.updated_at,
    };
  }
}
