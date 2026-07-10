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

interface ApiStarredFolder {
  star_id: number;
  folder_id: number;
  parent_id: number | null;
  folder_name: string;
  folder_created_at: string;
  folder_updated_at: string;
  starred_at: string;
}

interface ApiListStarredFoldersResponse {
  message: string;
  folders: ApiStarredFolder[];
  total: number;
}

interface ApiFolderStarResponse {
  message: string;
  folder_id?: number;
  is_starred: boolean;
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

interface ApiDeleteFolderResponse {
  message: string;
  folder_id: number;
}

interface ApiListSharedFoldersResponse {
  message: string;
  folders: ApiSharedWithMeFolder[];
  total: number;
}

interface ApiShareFolderResponse {
  message: string;
  shared_folder: ApiSharedFolder;
}

interface ApiListSharedFolderPermissionsResponse {
  message: string;
  permissions: ApiSharedFolderPermission[];
  total: number;
}

interface ApiUpdateSharedFolderPermissionResponse {
  message: string;
  shared_folder: {
    folder_id: number;
    shared_by_user_id: number;
    shared_with_user_id: number;
    permission: string;
    expires_at?: string | null;
  };
}

interface ApiRemoveSharedFolderPermissionResponse {
  message: string;
}

interface ApiSharedFolder {
  id: number;
  folder_id: number;
  shared_by_user_id: number;
  shared_with_user_id: number;
  permission: string;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiSharedWithMeFolder {
  id: number;
  folder_id: number;
  folder_name: string;
  permission: string;
  expires_at?: string | null;
}

interface ApiSharedFolderPermission {
  id: number;
  folder_id: number;
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

export interface UserFolder {
  id: number;
  parentId: number | null;
  folderName: string;
  createdAt: string;
  updatedAt: string;
}

export interface StarredFolder extends UserFolder {
  starId: number;
  starredAt: string;
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

export interface DeleteFolderResponse {
  message: string;
  folderId: number;
}

export interface SharedWithMeFolder {
  id: number;
  folderId: number;
  folderName: string;
  permission: string;
  expiresAt?: string | null;
}

export interface ShareFolderRequest {
  folderId: number;
  email: string;
  permission: 'viewer' | 'editor';
  expiresAt?: string | null;
}

export interface SharedFolder {
  id: number;
  folderId: number;
  sharedByUserId: number;
  sharedWithUserId: number;
  permission: string;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShareFolderResponse {
  message: string;
  sharedFolder: SharedFolder;
}

export interface SharedFolderPermission {
  id: number;
  folderId: number;
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

export interface UpdateSharedFolderPermissionRequest {
  folderId: number;
  email: string;
  permission: 'viewer' | 'editor';
  expiresAt?: string | null;
}

export interface UpdateSharedFolderPermissionResponse {
  message: string;
  folderId: number;
  permission: string;
  expiresAt?: string | null;
}

export interface RemoveSharedFolderPermissionRequest {
  sharedFolderId: number;
  email: string;
}

export interface RemoveSharedFolderPermissionResponse {
  message: string;
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

  starredFolders(): Observable<StarredFolder[]> {
    return this.http
      .get<ApiListStarredFoldersResponse>(`${this.apiUrl}/starred`, { withCredentials: true })
      .pipe(
        map((response) => response.folders.map((folder) => this.normalizeStarredFolder(folder))),
      );
  }

  star(folderId: number): Observable<ApiFolderStarResponse> {
    return this.http.post<ApiFolderStarResponse>(
      `${this.apiUrl}/${folderId}/star`,
      {},
      { withCredentials: true },
    );
  }

  unstar(folderId: number): Observable<ApiFolderStarResponse> {
    return this.http.delete<ApiFolderStarResponse>(`${this.apiUrl}/${folderId}/star`, {
      withCredentials: true,
    });
  }

  checkStar(folderId: number): Observable<boolean> {
    return this.http
      .get<ApiFolderStarResponse>(`${this.apiUrl}/${folderId}/star`, { withCredentials: true })
      .pipe(map((response) => response.is_starred));
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

  deleteFolder(folderId: number): Observable<DeleteFolderResponse> {
    return this.http
      .patch<ApiDeleteFolderResponse>(
        `${this.apiUrl}/${folderId}/delete`,
        {},
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          folderId: response.folder_id,
        })),
      );
  }

  sharedWithMe(): Observable<SharedWithMeFolder[]> {
    return this.http
      .get<ApiListSharedFoldersResponse>(`${this.apiUrl}/share-folder`, {
        withCredentials: true,
      })
      .pipe(
        map((response) =>
          response.folders.map((folder) => this.normalizeSharedWithMeFolder(folder)),
        ),
      );
  }

  share(data: ShareFolderRequest): Observable<ShareFolderResponse> {
    return this.http
      .post<ApiShareFolderResponse>(
        `${this.apiUrl}/share-folder`,
        {
          folder_id: data.folderId,
          email: data.email,
          permission: data.permission,
          expires_at: data.expiresAt || null,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          sharedFolder: this.normalizeSharedFolder(response.shared_folder),
        })),
      );
  }

  listSharePermissions(folderId: number): Observable<SharedFolderPermission[]> {
    const params = new HttpParams().set('folder_id', folderId);

    return this.http
      .get<ApiListSharedFolderPermissionsResponse>(`${this.apiUrl}/share-folder/permissions`, {
        params,
        withCredentials: true,
      })
      .pipe(
        map((response) =>
          response.permissions.map((permission) =>
            this.normalizeSharedFolderPermission(permission),
          ),
        ),
      );
  }

  updateSharePermission(
    data: UpdateSharedFolderPermissionRequest,
  ): Observable<UpdateSharedFolderPermissionResponse> {
    return this.http
      .patch<ApiUpdateSharedFolderPermissionResponse>(
        `${this.apiUrl}/share-folder/permissions`,
        {
          folder_id: data.folderId,
          email: data.email,
          permission: data.permission,
          expires_at: data.expiresAt || null,
        },
        { withCredentials: true },
      )
      .pipe(
        map((response) => ({
          message: response.message,
          folderId: response.shared_folder.folder_id,
          permission: response.shared_folder.permission,
          expiresAt: response.shared_folder.expires_at ?? null,
        })),
      );
  }

  removeSharePermission(
    data: RemoveSharedFolderPermissionRequest,
  ): Observable<RemoveSharedFolderPermissionResponse> {
    return this.http
      .delete<ApiRemoveSharedFolderPermissionResponse>(
        `${this.apiUrl}/share-folder/permissions/${data.sharedFolderId}`,
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

  private normalizeSharedFolder(sharedFolder: ApiSharedFolder): SharedFolder {
    return {
      id: sharedFolder.id,
      folderId: sharedFolder.folder_id,
      sharedByUserId: sharedFolder.shared_by_user_id,
      sharedWithUserId: sharedFolder.shared_with_user_id,
      permission: sharedFolder.permission,
      expiresAt: sharedFolder.expires_at ?? null,
      createdAt: sharedFolder.created_at,
      updatedAt: sharedFolder.updated_at,
    };
  }

  private normalizeSharedFolderPermission(
    permission: ApiSharedFolderPermission,
  ): SharedFolderPermission {
    return {
      id: permission.id,
      folderId: permission.folder_id,
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

  private normalizeSharedWithMeFolder(folder: ApiSharedWithMeFolder): SharedWithMeFolder {
    return {
      id: folder.id,
      folderId: folder.folder_id,
      folderName: folder.folder_name,
      permission: folder.permission,
      expiresAt: folder.expires_at ?? null,
    };
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

  private normalizeStarredFolder(folder: ApiStarredFolder): StarredFolder {
    return {
      id: folder.folder_id,
      starId: folder.star_id,
      parentId: folder.parent_id,
      folderName: folder.folder_name,
      createdAt: folder.folder_created_at,
      updatedAt: folder.folder_updated_at,
      starredAt: folder.starred_at,
    };
  }
}
