import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { CheckFavoriteNodesRequest, CompleteUploadSessionRequest, CopyNodeRequest, CreateCommentReplyRequest, CreateCommentRequest, CreateDownloadGrantRequest, CreateDownloadPackageRequest, CreateDownloadUrlRequest, CreateFileRequest, CreateFolderRequest, CreatePermissionRequest, CreateShareLinkRequest, CreateSpaceRequest, CreateUploadSessionRequest, EmptyTrashRequest, ExtractArchiveEntriesRequest, FavoriteNodeRequest, MarkUploaderPartUploadedRequest, MoveNodeRequest, NodeCommandRequest, PrepareUploaderUploadRequest, PresignUploadPartRequest, UpdateCommentReplyRequest, UpdateCommentRequest, UpdateNodeRequest, UpdatePermissionRequest, UpdateShareLinkRequest, UpdateSpaceRequest } from '../types';


export class DriveUploaderUploadsPartsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async update(uploadItemId: string, partNo: number, body: MarkUploaderPartUploadedRequest): Promise<unknown> {
    return this.client.put<unknown>(appApiPath(`/drive/uploader/uploads/${serializePathParameter(uploadItemId, { name: 'uploadItemId', style: 'simple', explode: false })}/parts/${serializePathParameter(partNo, { name: 'partNo', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class DriveUploaderUploadsApi {
  private client: HttpClient;
  public readonly parts: DriveUploaderUploadsPartsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.parts = new DriveUploaderUploadsPartsApi(client);
  }


async create(body: PrepareUploaderUploadRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/uploader/uploads`), body, undefined, undefined, 'application/json');
  }
}

export class DriveUploaderApi {
  private client: HttpClient;
  public readonly uploads: DriveUploaderUploadsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.uploads = new DriveUploaderUploadsApi(client);
  }

}

export class DriveArchiveEntriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(nodeId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/archive_entries`));
  }

async extract(nodeId: string, body: ExtractArchiveEntriesRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/archive_entries/extract`), body, undefined, undefined, 'application/json');
  }
}

export class DriveDownloadPackagesDownloadUrlsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(packageId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/download_packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}/download_url`));
  }
}

export class DriveDownloadPackagesApi {
  private client: HttpClient;
  public readonly downloadUrls: DriveDownloadPackagesDownloadUrlsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.downloadUrls = new DriveDownloadPackagesDownloadUrlsApi(client);
  }


async create(body: CreateDownloadPackageRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/download_packages`), body, undefined, undefined, 'application/json');
  }
}

export class DriveUploadSessionsPartsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async update(uploadSessionId: string, partNo: number, body: PresignUploadPartRequest): Promise<unknown> {
    return this.client.put<unknown>(appApiPath(`/drive/upload_sessions/${serializePathParameter(uploadSessionId, { name: 'uploadSessionId', style: 'simple', explode: false })}/parts/${serializePathParameter(partNo, { name: 'partNo', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class DriveUploadSessionsApi {
  private client: HttpClient;
  public readonly parts: DriveUploadSessionsPartsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.parts = new DriveUploadSessionsPartsApi(client);
  }


async create(body: CreateUploadSessionRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/upload_sessions`), body, undefined, undefined, 'application/json');
  }

async retrieve(uploadSessionId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/upload_sessions/${serializePathParameter(uploadSessionId, { name: 'uploadSessionId', style: 'simple', explode: false })}`));
  }

async abort(uploadSessionId: string, body: NodeCommandRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/upload_sessions/${serializePathParameter(uploadSessionId, { name: 'uploadSessionId', style: 'simple', explode: false })}/abort`), body, undefined, undefined, 'application/json');
  }

async complete(uploadSessionId: string, body: CompleteUploadSessionRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/upload_sessions/${serializePathParameter(uploadSessionId, { name: 'uploadSessionId', style: 'simple', explode: false })}/complete`), body, undefined, undefined, 'application/json');
  }
}

export interface DriveMoveDestinationsListParams {
  excludeNodeIds?: string;
  pageSize?: string;
  cursor?: string;
}

export class DriveMoveDestinationsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(spaceId: string, params?: DriveMoveDestinationsListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'excludeNodeIds', value: params?.excludeNodeIds, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}/move_destinations`), query));
  }
}

export interface DriveSpacesListParams {
  ownerSubjectType?: string;
  ownerSubjectId?: string;
  spaceType?: 'personal' | 'team' | 'knowledge_base' | 'git_repository' | 'app_upload' | 'rtc';
  pageSize?: number;
  cursor?: string;
}

export class DriveSpacesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveSpacesListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'ownerSubjectType', value: params?.ownerSubjectType, style: 'form', explode: true, allowReserved: false },
      { name: 'ownerSubjectId', value: params?.ownerSubjectId, style: 'form', explode: true, allowReserved: false },
      { name: 'spaceType', value: params?.spaceType, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/spaces`), query));
  }

async create(body: CreateSpaceRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/spaces`), body, undefined, undefined, 'application/json');
  }

async retrieve(spaceId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}`));
  }

async update(spaceId: string, body: UpdateSpaceRequest): Promise<unknown> {
    return this.client.patch<unknown>(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async delete(spaceId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}`));
  }
}

export interface DriveSharedWithMeListParams {
  spaceId?: string;
  pageSize?: string;
  cursor?: string;
  sortBy?: 'name' | 'owner' | 'lastModified' | 'contentLength' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export class DriveSharedWithMeApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveSharedWithMeListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/shared_with_me`), query));
  }
}

export interface DriveSearchListParams {
  q?: string;
  spaceId?: string;
  pageSize?: string;
  cursor?: string;
}

export class DriveSearchApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveSearchListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/search`), query));
  }
}

export interface DriveRecentListParams {
  spaceId?: string;
  pageSize?: string;
  cursor?: string;
  sortBy?: 'name' | 'owner' | 'lastModified' | 'contentLength' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export class DriveRecentApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveRecentListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/recent`), query));
  }
}

export interface DriveVersionsListParams {
  pageSize?: string;
  cursor?: string;
}

export class DriveVersionsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(nodeId: string, params?: DriveVersionsListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/versions`), query));
  }

async delete(nodeId: string, versionId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/versions/${serializePathParameter(versionId, { name: 'versionId', style: 'simple', explode: false })}`));
  }

async retrieve(nodeId: string, versionId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/versions/${serializePathParameter(versionId, { name: 'versionId', style: 'simple', explode: false })}`));
  }

async restore(nodeId: string, versionId: string, body: NodeCommandRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/versions/${serializePathParameter(versionId, { name: 'versionId', style: 'simple', explode: false })}/restore`), body, undefined, undefined, 'application/json');
  }
}

export interface DriveTrashListParams {
  spaceId?: string;
  pageSize?: string;
  cursor?: string;
  parentNodeId?: string;
  sortBy?: 'name' | 'owner' | 'lastModified' | 'contentLength' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export class DriveTrashApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(nodeId: string, body: NodeCommandRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/trash`), body, undefined, undefined, 'application/json');
  }

async list(params?: DriveTrashListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'parentNodeId', value: params?.parentNodeId, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/trash`), query));
  }

async restore(nodeId: string, body: NodeCommandRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/trash/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/restore`), body, undefined, undefined, 'application/json');
  }

async empty(body: EmptyTrashRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/trash/empty`), body, undefined, undefined, 'application/json');
  }
}

export interface DriveShareLinksListParams {
  pageSize?: string;
  cursor?: string;
}

export class DriveShareLinksApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(nodeId: string, body: CreateShareLinkRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/share_links`), body, undefined, undefined, 'application/json');
  }

async list(nodeId: string, params?: DriveShareLinksListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/share_links`), query));
  }

async claim(token: string): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/share_links/${serializePathParameter(token, { name: 'token', style: 'simple', explode: false })}/claim`));
  }

async delete(shareLinkId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/share_links/${serializePathParameter(shareLinkId, { name: 'shareLinkId', style: 'simple', explode: false })}`));
  }

async update(shareLinkId: string, body: UpdateShareLinkRequest): Promise<unknown> {
    return this.client.patch<unknown>(appApiPath(`/drive/share_links/${serializePathParameter(shareLinkId, { name: 'shareLinkId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async retrieve(shareLinkId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/share_links/${serializePathParameter(shareLinkId, { name: 'shareLinkId', style: 'simple', explode: false })}`));
  }
}

export interface DrivePermissionsEffectiveListParams {
  pageSize?: string;
  cursor?: string;
}

export class DrivePermissionsEffectiveApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(nodeId: string, params?: DrivePermissionsEffectiveListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions/effective`), query));
  }
}

export interface DrivePermissionsListParams {
  pageSize?: string;
  cursor?: string;
}

export class DrivePermissionsApi {
  private client: HttpClient;
  public readonly effective: DrivePermissionsEffectiveApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.effective = new DrivePermissionsEffectiveApi(client);
  }


async list(nodeId: string, params?: DrivePermissionsListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions`), query));
  }

async create(nodeId: string, body: CreatePermissionRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions`), body, undefined, undefined, 'application/json');
  }

async delete(nodeId: string, permissionId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`));
  }

async update(nodeId: string, permissionId: string, body: UpdatePermissionRequest): Promise<unknown> {
    return this.client.patch<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async retrieve(nodeId: string, permissionId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`));
  }
}

export class DriveDownloadGrantsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(nodeId: string, body?: CreateDownloadGrantRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/download_grants`), body, undefined, undefined, 'application/json');
  }
}

export interface DriveCommentRepliesListParams {
  pageSize?: string;
  cursor?: string;
}

export class DriveCommentRepliesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(nodeId: string, commentId: string, params?: DriveCommentRepliesListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}/replies`), query));
  }

async create(nodeId: string, commentId: string, body: CreateCommentReplyRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}/replies`), body, undefined, undefined, 'application/json');
  }

async retrieve(nodeId: string, commentId: string, replyId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}/replies/${serializePathParameter(replyId, { name: 'replyId', style: 'simple', explode: false })}`));
  }

async update(nodeId: string, commentId: string, replyId: string, body: UpdateCommentReplyRequest): Promise<unknown> {
    return this.client.patch<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}/replies/${serializePathParameter(replyId, { name: 'replyId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async delete(nodeId: string, commentId: string, replyId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}/replies/${serializePathParameter(replyId, { name: 'replyId', style: 'simple', explode: false })}`));
  }
}

export interface DriveCommentsListParams {
  pageSize?: string;
  cursor?: string;
}

export class DriveCommentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(nodeId: string, params?: DriveCommentsListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments`), query));
  }

async create(nodeId: string, body: CreateCommentRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments`), body, undefined, undefined, 'application/json');
  }

async retrieve(nodeId: string, commentId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}`));
  }

async update(nodeId: string, commentId: string, body: UpdateCommentRequest): Promise<unknown> {
    return this.client.patch<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async delete(nodeId: string, commentId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}`));
  }
}

export class DriveNodesFoldersApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(body: CreateFolderRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/folders`), body, undefined, undefined, 'application/json');
  }
}

export class DriveNodesFilesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(body: CreateFileRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/files`), body, undefined, undefined, 'application/json');
  }
}

export class DriveNodesPathApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(nodeId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/path`));
  }
}

export interface DriveNodesDownloadUrlsRetrieveParams {
  requestedTtlSeconds?: number;
}

export class DriveNodesDownloadUrlsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(nodeId: string, params?: DriveNodesDownloadUrlsRetrieveParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'requestedTtlSeconds', value: params?.requestedTtlSeconds, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/download_url`), query));
  }
}

export class DriveNodesCapabilitiesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(nodeId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/capabilities`));
  }
}

export interface DriveNodesListParams {
  parentNodeId?: string;
  pageSize?: string;
  cursor?: string;
  sortBy?: 'name' | 'owner' | 'lastModified' | 'contentLength' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export class DriveNodesApi {
  private client: HttpClient;
  public readonly capabilities: DriveNodesCapabilitiesApi;
  public readonly downloadUrls: DriveNodesDownloadUrlsApi;
  public readonly path: DriveNodesPathApi;
  public readonly files: DriveNodesFilesApi;
  public readonly folders: DriveNodesFoldersApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.capabilities = new DriveNodesCapabilitiesApi(client);
    this.downloadUrls = new DriveNodesDownloadUrlsApi(client);
    this.path = new DriveNodesPathApi(client);
    this.files = new DriveNodesFilesApi(client);
    this.folders = new DriveNodesFoldersApi(client);
  }


async update(nodeId: string, body: UpdateNodeRequest): Promise<unknown> {
    return this.client.patch<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async retrieve(nodeId: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }

async delete(nodeId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }

async copy(nodeId: string, body: CopyNodeRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/copy`), body, undefined, undefined, 'application/json');
  }

async move(nodeId: string, body: MoveNodeRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/move`), body, undefined, undefined, 'application/json');
  }

async list(spaceId: string, params?: DriveNodesListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'parentNodeId', value: params?.parentNodeId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}/nodes`), query));
  }
}

export class DriveQuotasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/quotas/summary`));
  }
}

export interface DriveFavoritesListParams {
  spaceId?: string;
  pageSize?: string;
  cursor?: string;
  sortBy?: 'name' | 'owner' | 'lastModified' | 'contentLength' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export class DriveFavoritesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveFavoritesListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/favorites`), query));
  }

async check(body: CheckFavoriteNodesRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/favorites/check`), body, undefined, undefined, 'application/json');
  }

async update(nodeId: string, body: FavoriteNodeRequest): Promise<unknown> {
    return this.client.put<unknown>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/favorite`), body, undefined, undefined, 'application/json');
  }

async delete(nodeId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/favorite`));
  }
}

export class DriveDownloadUrlsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(body: CreateDownloadUrlRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/download_urls`), body, undefined, undefined, 'application/json');
  }
}

export class DriveDownloadTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(token: string): Promise<unknown> {
    return this.client.get<unknown>(appApiPath(`/drive/download_tokens/${serializePathParameter(token, { name: 'token', style: 'simple', explode: false })}`));
  }
}

export interface DriveChangesStartPageTokenRetrieveParams {
  spaceId: string;
}

export class DriveChangesStartPageTokenApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(params: DriveChangesStartPageTokenRetrieveParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'spaceId', value: params.spaceId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/changes/start_page_token`), query));
  }
}

export interface DriveChangesListParams {
  spaceId: string;
  cursor?: string;
  pageSize?: string;
}

export class DriveChangesApi {
  private client: HttpClient;
  public readonly startPageToken: DriveChangesStartPageTokenApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.startPageToken = new DriveChangesStartPageTokenApi(client);
  }


async list(params: DriveChangesListParams): Promise<unknown> {
    const query = buildQueryString([
      { name: 'spaceId', value: params.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<unknown>(appendQueryString(appApiPath(`/drive/changes`), query));
  }
}

export class DriveApi {
  private client: HttpClient;
  public readonly changes: DriveChangesApi;
  public readonly downloadTokens: DriveDownloadTokensApi;
  public readonly downloadUrls: DriveDownloadUrlsApi;
  public readonly favorites: DriveFavoritesApi;
  public readonly quotas: DriveQuotasApi;
  public readonly nodes: DriveNodesApi;
  public readonly comments: DriveCommentsApi;
  public readonly commentReplies: DriveCommentRepliesApi;
  public readonly downloadGrants: DriveDownloadGrantsApi;
  public readonly permissions: DrivePermissionsApi;
  public readonly shareLinks: DriveShareLinksApi;
  public readonly trash: DriveTrashApi;
  public readonly versions: DriveVersionsApi;
  public readonly recent: DriveRecentApi;
  public readonly search: DriveSearchApi;
  public readonly sharedWithMe: DriveSharedWithMeApi;
  public readonly spaces: DriveSpacesApi;
  public readonly moveDestinations: DriveMoveDestinationsApi;
  public readonly uploadSessions: DriveUploadSessionsApi;
  public readonly downloadPackages: DriveDownloadPackagesApi;
  public readonly archiveEntries: DriveArchiveEntriesApi;
  public readonly uploader: DriveUploaderApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.changes = new DriveChangesApi(client);
    this.downloadTokens = new DriveDownloadTokensApi(client);
    this.downloadUrls = new DriveDownloadUrlsApi(client);
    this.favorites = new DriveFavoritesApi(client);
    this.quotas = new DriveQuotasApi(client);
    this.nodes = new DriveNodesApi(client);
    this.comments = new DriveCommentsApi(client);
    this.commentReplies = new DriveCommentRepliesApi(client);
    this.downloadGrants = new DriveDownloadGrantsApi(client);
    this.permissions = new DrivePermissionsApi(client);
    this.shareLinks = new DriveShareLinksApi(client);
    this.trash = new DriveTrashApi(client);
    this.versions = new DriveVersionsApi(client);
    this.recent = new DriveRecentApi(client);
    this.search = new DriveSearchApi(client);
    this.sharedWithMe = new DriveSharedWithMeApi(client);
    this.spaces = new DriveSpacesApi(client);
    this.moveDestinations = new DriveMoveDestinationsApi(client);
    this.uploadSessions = new DriveUploadSessionsApi(client);
    this.downloadPackages = new DriveDownloadPackagesApi(client);
    this.archiveEntries = new DriveArchiveEntriesApi(client);
    this.uploader = new DriveUploaderApi(client);
  }

}

export function createDriveApi(client: HttpClient): DriveApi {
  return new DriveApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
