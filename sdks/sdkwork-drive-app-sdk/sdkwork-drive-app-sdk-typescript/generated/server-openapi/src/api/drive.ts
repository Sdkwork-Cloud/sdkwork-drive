import { appApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { ArchiveEntry, ChangeListData, CheckFavoriteNodesRequest, ClaimShareLinkResponse, CompleteUploadSessionRequest, CopyNodeRequest, CreateCommentReplyRequest, CreateCommentRequest, CreateDownloadGrantRequest, CreateDownloadPackageRequest, CreateDownloadUrlRequest, CreateDownloadUrlResponse, CreateDriveSandboxDirectoryRequest, CreateDriveSandboxFileRequest, CreateFileRequest, CreateFileResponse, CreateFolderRequest, CreatePermissionRequest, CreateShareLinkRequest, CreateShareLinkResponse, CreateSpaceRequest, CreateUploadSessionRequest, CreateWebsiteRootRequest, DownloadPackageResponse, DriveComment, DriveCommentReply, DriveNode, DriveNodeListData, DrivePermission, DriveSandboxEntry, DriveSandboxEntryListData, DriveSandboxFileContent, DriveSandboxMutationCommandData, DriveSandboxVolumeListData, DriveShareLink, DriveSpace, DriveUploadSession, EffectivePermission, EmptyTrashRequest, EmptyTrashResponse, ExtractArchiveEntriesRequest, ExtractArchiveEntriesResponse, FavoriteNodeRequest, FavoriteNodeResponse, FileVersion, FileVersionListData, MarkUploaderPartUploadedRequest, MoveNodeRequest, NodeCapabilitiesResponse, NodeCommandRequest, NodePathResponse, PageInfo, PrepareUploaderUploadRequest, PrepareUploaderUploadResponse, PresignedUploadPart, PresignUploadPartRequest, PurgeDriveSandboxEntryRequest, QuotaSummary, StartPageTokenResponse, UpdateCommentReplyRequest, UpdateCommentRequest, UpdateDriveSandboxEntryRequest, UpdateDriveSandboxFileContentRequest, UpdateNodeRequest, UpdatePermissionRequest, UpdateShareLinkRequest, UpdateSpaceRequest, UploaderUploadPart, WebsiteRoot, WebsiteRootPageData } from '../types';


export class DriveUploaderUploadsPartsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async update(uploadItemId: string, partNo: number, body: MarkUploaderPartUploadedRequest): Promise<UploaderUploadPart> {
    return this.client.put<UploaderUploadPart>(appApiPath(`/drive/uploader/uploads/${serializePathParameter(uploadItemId, { name: 'uploadItemId', style: 'simple', explode: false })}/parts/${serializePathParameter(partNo, { name: 'partNo', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class DriveUploaderUploadsApi {
  private client: HttpClient;
  public readonly parts: DriveUploaderUploadsPartsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.parts = new DriveUploaderUploadsPartsApi(client);
  }


async create(body: PrepareUploaderUploadRequest): Promise<PrepareUploaderUploadResponse> {
    return this.client.post<PrepareUploaderUploadResponse>(appApiPath(`/drive/uploader/uploads`), body, undefined, undefined, 'application/json');
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


async list(nodeId: string): Promise<Record<string, unknown>> {
    return this.client.get<Record<string, unknown>>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/archive_entries`));
  }

async extract(nodeId: string, body: ExtractArchiveEntriesRequest): Promise<ExtractArchiveEntriesResponse> {
    return this.client.post<ExtractArchiveEntriesResponse>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/archive_entries/extract`), body, undefined, undefined, 'application/json');
  }
}

export class DriveDownloadPackagesDownloadUrlsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(packageId: string): Promise<DownloadPackageResponse> {
    return this.client.get<DownloadPackageResponse>(appApiPath(`/drive/download_packages/${serializePathParameter(packageId, { name: 'packageId', style: 'simple', explode: false })}/download_url`));
  }
}

export class DriveDownloadPackagesApi {
  private client: HttpClient;
  public readonly downloadUrls: DriveDownloadPackagesDownloadUrlsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.downloadUrls = new DriveDownloadPackagesDownloadUrlsApi(client);
  }


async create(body: CreateDownloadPackageRequest): Promise<DownloadPackageResponse> {
    return this.client.post<DownloadPackageResponse>(appApiPath(`/drive/download_packages`), body, undefined, undefined, 'application/json');
  }
}

export class DriveUploadSessionsPartsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async update(uploadSessionId: string, partNo: number, body: PresignUploadPartRequest): Promise<PresignedUploadPart> {
    return this.client.put<PresignedUploadPart>(appApiPath(`/drive/upload_sessions/${serializePathParameter(uploadSessionId, { name: 'uploadSessionId', style: 'simple', explode: false })}/parts/${serializePathParameter(partNo, { name: 'partNo', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }
}

export class DriveUploadSessionsApi {
  private client: HttpClient;
  public readonly parts: DriveUploadSessionsPartsApi;

  constructor(client: HttpClient) {
    this.client = client;
    this.parts = new DriveUploadSessionsPartsApi(client);
  }


async create(body: CreateUploadSessionRequest): Promise<DriveUploadSession> {
    return this.client.post<DriveUploadSession>(appApiPath(`/drive/upload_sessions`), body, undefined, undefined, 'application/json');
  }

async retrieve(uploadSessionId: string): Promise<DriveUploadSession> {
    return this.client.get<DriveUploadSession>(appApiPath(`/drive/upload_sessions/${serializePathParameter(uploadSessionId, { name: 'uploadSessionId', style: 'simple', explode: false })}`));
  }

async abort(uploadSessionId: string, body: NodeCommandRequest): Promise<DriveUploadSession> {
    return this.client.post<DriveUploadSession>(appApiPath(`/drive/upload_sessions/${serializePathParameter(uploadSessionId, { name: 'uploadSessionId', style: 'simple', explode: false })}/abort`), body, undefined, undefined, 'application/json');
  }

async complete(uploadSessionId: string, body: CompleteUploadSessionRequest): Promise<DriveUploadSession> {
    return this.client.post<DriveUploadSession>(appApiPath(`/drive/upload_sessions/${serializePathParameter(uploadSessionId, { name: 'uploadSessionId', style: 'simple', explode: false })}/complete`), body, undefined, undefined, 'application/json');
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


async list(spaceId: string, params?: DriveMoveDestinationsListParams): Promise<DriveNodeListData> {
    const query = buildQueryString([
      { name: 'excludeNodeIds', value: params?.excludeNodeIds, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveNodeListData>(appendQueryString(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}/move_destinations`), query));
  }
}

export interface DriveWebsiteRootsListParams {
  pageSize?: number;
  cursor?: string;
}

export class DriveWebsiteRootsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(spaceId: string, params?: DriveWebsiteRootsListParams): Promise<WebsiteRootPageData> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<WebsiteRootPageData>(appendQueryString(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}/website_roots`), query));
  }

async create(spaceId: string, body: CreateWebsiteRootRequest): Promise<WebsiteRoot> {
    return this.client.post<WebsiteRoot>(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}/website_roots`), body, undefined, undefined, 'application/json');
  }

async retrieve(rootUuid: string): Promise<WebsiteRoot> {
    return this.client.get<WebsiteRoot>(appApiPath(`/drive/website_roots/${serializePathParameter(rootUuid, { name: 'rootUuid', style: 'simple', explode: false })}`));
  }
}

export interface DriveSpacesListParams {
  ownerSubjectType?: string;
  ownerSubjectId?: string;
  spaceType?: 'personal' | 'team' | 'knowledge_base' | 'ai_generated' | 'git_repository' | 'deployment' | 'app_upload' | 'im' | 'rtc' | 'notary' | 'website';
  pageSize?: number;
  cursor?: string;
}

export class DriveSpacesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveSpacesListParams): Promise<Record<string, unknown>> {
    const query = buildQueryString([
      { name: 'ownerSubjectType', value: params?.ownerSubjectType, style: 'form', explode: true, allowReserved: false },
      { name: 'ownerSubjectId', value: params?.ownerSubjectId, style: 'form', explode: true, allowReserved: false },
      { name: 'spaceType', value: params?.spaceType, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<Record<string, unknown>>(appendQueryString(appApiPath(`/drive/spaces`), query));
  }

async create(body: CreateSpaceRequest): Promise<DriveSpace> {
    return this.client.post<DriveSpace>(appApiPath(`/drive/spaces`), body, undefined, undefined, 'application/json');
  }

async retrieve(spaceId: string): Promise<DriveSpace> {
    return this.client.get<DriveSpace>(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}`));
  }

async update(spaceId: string, body: UpdateSpaceRequest): Promise<DriveSpace> {
    return this.client.patch<DriveSpace>(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async delete(spaceId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}`));
  }
}

export interface DriveSandboxFileContentsRetrieveParams {
  logicalPath: string;
  encoding?: 'utf8' | 'base64';
}

export interface DriveSandboxFileContentsUpdateParams {
  ifMatch: string;
  idempotencyKey: string;
}

export class DriveSandboxFileContentsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(sandboxId: string, entryId: string, params: DriveSandboxFileContentsRetrieveParams): Promise<DriveSandboxFileContent> {
    const query = buildQueryString([
      { name: 'logical_path', value: params.logicalPath, style: 'form', explode: true, allowReserved: false },
      { name: 'encoding', value: params.encoding, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveSandboxFileContent>(appendQueryString(appApiPath(`/drive/sandboxes/${serializePathParameter(sandboxId, { name: 'sandboxId', style: 'simple', explode: false })}/files/${serializePathParameter(entryId, { name: 'entryId', style: 'simple', explode: false })}/content`), query));
  }

async update(sandboxId: string, entryId: string, body: UpdateDriveSandboxFileContentRequest, params: DriveSandboxFileContentsUpdateParams): Promise<DriveSandboxEntry> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.put<DriveSandboxEntry>(appApiPath(`/drive/sandboxes/${serializePathParameter(sandboxId, { name: 'sandboxId', style: 'simple', explode: false })}/files/${serializePathParameter(entryId, { name: 'entryId', style: 'simple', explode: false })}/content`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface DriveSandboxFilesCreateParams {
  idempotencyKey: string;
}

export class DriveSandboxFilesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(sandboxId: string, body: CreateDriveSandboxFileRequest, params: DriveSandboxFilesCreateParams): Promise<DriveSandboxEntry> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<DriveSandboxEntry>(appApiPath(`/drive/sandboxes/${serializePathParameter(sandboxId, { name: 'sandboxId', style: 'simple', explode: false })}/files`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface DriveSandboxDirectoriesCreateParams {
  idempotencyKey: string;
}

export class DriveSandboxDirectoriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(sandboxId: string, body: CreateDriveSandboxDirectoryRequest, params: DriveSandboxDirectoriesCreateParams): Promise<DriveSandboxEntry> {
    const requestHeaders = buildRequestHeaders(
      {
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<DriveSandboxEntry>(appApiPath(`/drive/sandboxes/${serializePathParameter(sandboxId, { name: 'sandboxId', style: 'simple', explode: false })}/directories`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface DriveSandboxEntriesListParams {
  parentPath?: string;
  cursor?: string;
  pageSize?: number;
}

export interface DriveSandboxEntriesUpdateParams {
  ifMatch: string;
  idempotencyKey: string;
}

export interface DriveSandboxEntriesPurgeParams {
  ifMatch: string;
  idempotencyKey: string;
}

export class DriveSandboxEntriesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(sandboxId: string, params?: DriveSandboxEntriesListParams): Promise<DriveSandboxEntryListData> {
    const query = buildQueryString([
      { name: 'parent_path', value: params?.parentPath, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveSandboxEntryListData>(appendQueryString(appApiPath(`/drive/sandboxes/${serializePathParameter(sandboxId, { name: 'sandboxId', style: 'simple', explode: false })}/entries`), query));
  }

async update(sandboxId: string, entryId: string, body: UpdateDriveSandboxEntryRequest, params: DriveSandboxEntriesUpdateParams): Promise<DriveSandboxEntry> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.patch<DriveSandboxEntry>(appApiPath(`/drive/sandboxes/${serializePathParameter(sandboxId, { name: 'sandboxId', style: 'simple', explode: false })}/entries/${serializePathParameter(entryId, { name: 'entryId', style: 'simple', explode: false })}`), body, undefined, requestHeaders, 'application/json');
  }

async purge(sandboxId: string, entryId: string, body: PurgeDriveSandboxEntryRequest, params: DriveSandboxEntriesPurgeParams): Promise<DriveSandboxMutationCommandData> {
    const requestHeaders = buildRequestHeaders(
      {
        'If-Match': { value: params.ifMatch, style: 'simple', explode: false },
        'Idempotency-Key': { value: params.idempotencyKey, style: 'simple', explode: false },
      },
      {}
    );
    return this.client.post<DriveSandboxMutationCommandData>(appApiPath(`/drive/sandboxes/${serializePathParameter(sandboxId, { name: 'sandboxId', style: 'simple', explode: false })}/entries/${serializePathParameter(entryId, { name: 'entryId', style: 'simple', explode: false })}/purge`), body, undefined, requestHeaders, 'application/json');
  }
}

export interface DriveSandboxesListParams {
  page?: number;
  pageSize?: number;
}

export class DriveSandboxesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(params?: DriveSandboxesListParams): Promise<DriveSandboxVolumeListData> {
    const query = buildQueryString([
      { name: 'page', value: params?.page, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveSandboxVolumeListData>(appendQueryString(appApiPath(`/drive/sandboxes`), query));
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


async list(params?: DriveSharedWithMeListParams): Promise<DriveNodeListData> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveNodeListData>(appendQueryString(appApiPath(`/drive/shared_with_me`), query));
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


async list(params?: DriveSearchListParams): Promise<DriveNodeListData> {
    const query = buildQueryString([
      { name: 'q', value: params?.q, style: 'form', explode: true, allowReserved: false },
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveNodeListData>(appendQueryString(appApiPath(`/drive/search`), query));
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


async list(params?: DriveRecentListParams): Promise<DriveNodeListData> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveNodeListData>(appendQueryString(appApiPath(`/drive/recent`), query));
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


async list(nodeId: string, params?: DriveVersionsListParams): Promise<FileVersionListData> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<FileVersionListData>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/versions`), query));
  }

async delete(nodeId: string, versionId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/versions/${serializePathParameter(versionId, { name: 'versionId', style: 'simple', explode: false })}`));
  }

async retrieve(nodeId: string, versionId: string): Promise<FileVersion> {
    return this.client.get<FileVersion>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/versions/${serializePathParameter(versionId, { name: 'versionId', style: 'simple', explode: false })}`));
  }

async restore(nodeId: string, versionId: string, body: NodeCommandRequest): Promise<DriveNode> {
    return this.client.post<DriveNode>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/versions/${serializePathParameter(versionId, { name: 'versionId', style: 'simple', explode: false })}/restore`), body, undefined, undefined, 'application/json');
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


async create(nodeId: string, body: NodeCommandRequest): Promise<DriveNode> {
    return this.client.post<DriveNode>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/trash`), body, undefined, undefined, 'application/json');
  }

async list(params?: DriveTrashListParams): Promise<DriveNodeListData> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'parentNodeId', value: params?.parentNodeId, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveNodeListData>(appendQueryString(appApiPath(`/drive/trash`), query));
  }

async restore(nodeId: string, body: NodeCommandRequest): Promise<DriveNode> {
    return this.client.post<DriveNode>(appApiPath(`/drive/trash/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/restore`), body, undefined, undefined, 'application/json');
  }

async empty(body: EmptyTrashRequest): Promise<EmptyTrashResponse> {
    return this.client.post<EmptyTrashResponse>(appApiPath(`/drive/trash/empty`), body, undefined, undefined, 'application/json');
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


async create(nodeId: string, body: CreateShareLinkRequest): Promise<CreateShareLinkResponse> {
    return this.client.post<CreateShareLinkResponse>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/share_links`), body, undefined, undefined, 'application/json');
  }

async list(nodeId: string, params?: DriveShareLinksListParams): Promise<Record<string, unknown>> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<Record<string, unknown>>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/share_links`), query));
  }

async claim(token: string): Promise<ClaimShareLinkResponse> {
    return this.client.post<ClaimShareLinkResponse>(appApiPath(`/drive/share_links/${serializePathParameter(token, { name: 'token', style: 'simple', explode: false })}/claim`));
  }

async delete(shareLinkId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/share_links/${serializePathParameter(shareLinkId, { name: 'shareLinkId', style: 'simple', explode: false })}`));
  }

async update(shareLinkId: string, body: UpdateShareLinkRequest): Promise<DriveShareLink> {
    return this.client.patch<DriveShareLink>(appApiPath(`/drive/share_links/${serializePathParameter(shareLinkId, { name: 'shareLinkId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async retrieve(shareLinkId: string): Promise<DriveShareLink> {
    return this.client.get<DriveShareLink>(appApiPath(`/drive/share_links/${serializePathParameter(shareLinkId, { name: 'shareLinkId', style: 'simple', explode: false })}`));
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


async list(nodeId: string, params?: DrivePermissionsEffectiveListParams): Promise<Record<string, unknown>> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<Record<string, unknown>>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions/effective`), query));
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


async list(nodeId: string, params?: DrivePermissionsListParams): Promise<Record<string, unknown>> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<Record<string, unknown>>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions`), query));
  }

async create(nodeId: string, body: CreatePermissionRequest): Promise<DrivePermission> {
    return this.client.post<DrivePermission>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions`), body, undefined, undefined, 'application/json');
  }

async delete(nodeId: string, permissionId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`));
  }

async update(nodeId: string, permissionId: string, body: UpdatePermissionRequest): Promise<DrivePermission> {
    return this.client.patch<DrivePermission>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async retrieve(nodeId: string, permissionId: string): Promise<DrivePermission> {
    return this.client.get<DrivePermission>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/permissions/${serializePathParameter(permissionId, { name: 'permissionId', style: 'simple', explode: false })}`));
  }
}

export class DriveDownloadGrantsApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(nodeId: string, body?: CreateDownloadGrantRequest): Promise<CreateDownloadUrlResponse> {
    return this.client.post<CreateDownloadUrlResponse>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/download_grants`), body, undefined, undefined, 'application/json');
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


async list(nodeId: string, commentId: string, params?: DriveCommentRepliesListParams): Promise<Record<string, unknown>> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<Record<string, unknown>>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}/replies`), query));
  }

async create(nodeId: string, commentId: string, body: CreateCommentReplyRequest): Promise<DriveCommentReply> {
    return this.client.post<DriveCommentReply>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}/replies`), body, undefined, undefined, 'application/json');
  }

async retrieve(nodeId: string, commentId: string, replyId: string): Promise<DriveCommentReply> {
    return this.client.get<DriveCommentReply>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}/replies/${serializePathParameter(replyId, { name: 'replyId', style: 'simple', explode: false })}`));
  }

async update(nodeId: string, commentId: string, replyId: string, body: UpdateCommentReplyRequest): Promise<DriveCommentReply> {
    return this.client.patch<DriveCommentReply>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}/replies/${serializePathParameter(replyId, { name: 'replyId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
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


async list(nodeId: string, params?: DriveCommentsListParams): Promise<Record<string, unknown>> {
    const query = buildQueryString([
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<Record<string, unknown>>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments`), query));
  }

async create(nodeId: string, body: CreateCommentRequest): Promise<DriveComment> {
    return this.client.post<DriveComment>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments`), body, undefined, undefined, 'application/json');
  }

async retrieve(nodeId: string, commentId: string): Promise<DriveComment> {
    return this.client.get<DriveComment>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}`));
  }

async update(nodeId: string, commentId: string, body: UpdateCommentRequest): Promise<DriveComment> {
    return this.client.patch<DriveComment>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/comments/${serializePathParameter(commentId, { name: 'commentId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
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


async create(body: CreateFolderRequest): Promise<DriveNode> {
    return this.client.post<DriveNode>(appApiPath(`/drive/nodes/folders`), body, undefined, undefined, 'application/json');
  }
}

export class DriveNodesFilesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async create(body: CreateFileRequest): Promise<CreateFileResponse> {
    return this.client.post<CreateFileResponse>(appApiPath(`/drive/nodes/files`), body, undefined, undefined, 'application/json');
  }
}

export class DriveNodesPathApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(nodeId: string): Promise<NodePathResponse> {
    return this.client.get<NodePathResponse>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/path`));
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


async retrieve(nodeId: string, params?: DriveNodesDownloadUrlsRetrieveParams): Promise<CreateDownloadUrlResponse> {
    const query = buildQueryString([
      { name: 'requestedTtlSeconds', value: params?.requestedTtlSeconds, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<CreateDownloadUrlResponse>(appendQueryString(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/download_url`), query));
  }
}

export class DriveNodesCapabilitiesApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async list(nodeId: string): Promise<NodeCapabilitiesResponse> {
    return this.client.get<NodeCapabilitiesResponse>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/capabilities`));
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


async update(nodeId: string, body: UpdateNodeRequest): Promise<DriveNode> {
    return this.client.patch<DriveNode>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`), body, undefined, undefined, 'application/json');
  }

async retrieve(nodeId: string): Promise<DriveNode> {
    return this.client.get<DriveNode>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }

async delete(nodeId: string): Promise<void> {
    return this.client.delete<void>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}`));
  }

async copy(nodeId: string, body: CopyNodeRequest): Promise<DriveNode> {
    return this.client.post<DriveNode>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/copy`), body, undefined, undefined, 'application/json');
  }

async move(nodeId: string, body: MoveNodeRequest): Promise<DriveNode> {
    return this.client.post<DriveNode>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/move`), body, undefined, undefined, 'application/json');
  }

async list(spaceId: string, params?: DriveNodesListParams): Promise<DriveNodeListData> {
    const query = buildQueryString([
      { name: 'parentNodeId', value: params?.parentNodeId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveNodeListData>(appendQueryString(appApiPath(`/drive/spaces/${serializePathParameter(spaceId, { name: 'spaceId', style: 'simple', explode: false })}/nodes`), query));
  }
}

export class DriveQuotasApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(): Promise<QuotaSummary> {
    return this.client.get<QuotaSummary>(appApiPath(`/drive/quotas/summary`));
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


async list(params?: DriveFavoritesListParams): Promise<DriveNodeListData> {
    const query = buildQueryString([
      { name: 'spaceId', value: params?.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params?.pageSize, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params?.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'sortBy', value: params?.sortBy, style: 'form', explode: true, allowReserved: false },
      { name: 'sortOrder', value: params?.sortOrder, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<DriveNodeListData>(appendQueryString(appApiPath(`/drive/favorites`), query));
  }

async check(body: CheckFavoriteNodesRequest): Promise<unknown> {
    return this.client.post<unknown>(appApiPath(`/drive/favorites/check`), body, undefined, undefined, 'application/json');
  }

async update(nodeId: string, body: FavoriteNodeRequest): Promise<FavoriteNodeResponse> {
    return this.client.put<FavoriteNodeResponse>(appApiPath(`/drive/nodes/${serializePathParameter(nodeId, { name: 'nodeId', style: 'simple', explode: false })}/favorite`), body, undefined, undefined, 'application/json');
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


async create(body: CreateDownloadUrlRequest): Promise<CreateDownloadUrlResponse> {
    return this.client.post<CreateDownloadUrlResponse>(appApiPath(`/drive/download_urls`), body, undefined, undefined, 'application/json');
  }
}

export class DriveDownloadTokensApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }


async retrieve(token: string): Promise<CreateDownloadUrlResponse> {
    return this.client.get<CreateDownloadUrlResponse>(appApiPath(`/drive/download_tokens/${serializePathParameter(token, { name: 'token', style: 'simple', explode: false })}`));
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


async retrieve(params: DriveChangesStartPageTokenRetrieveParams): Promise<StartPageTokenResponse> {
    const query = buildQueryString([
      { name: 'spaceId', value: params.spaceId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<StartPageTokenResponse>(appendQueryString(appApiPath(`/drive/changes/start_page_token`), query));
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


async list(params: DriveChangesListParams): Promise<ChangeListData> {
    const query = buildQueryString([
      { name: 'spaceId', value: params.spaceId, style: 'form', explode: true, allowReserved: false },
      { name: 'cursor', value: params.cursor, style: 'form', explode: true, allowReserved: false },
      { name: 'page_size', value: params.pageSize, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<ChangeListData>(appendQueryString(appApiPath(`/drive/changes`), query));
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
  public readonly sandboxes: DriveSandboxesApi;
  public readonly sandboxEntries: DriveSandboxEntriesApi;
  public readonly sandboxDirectories: DriveSandboxDirectoriesApi;
  public readonly sandboxFiles: DriveSandboxFilesApi;
  public readonly sandboxFileContents: DriveSandboxFileContentsApi;
  public readonly spaces: DriveSpacesApi;
  public readonly websiteRoots: DriveWebsiteRootsApi;
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
    this.sandboxes = new DriveSandboxesApi(client);
    this.sandboxEntries = new DriveSandboxEntriesApi(client);
    this.sandboxDirectories = new DriveSandboxDirectoriesApi(client);
    this.sandboxFiles = new DriveSandboxFilesApi(client);
    this.sandboxFileContents = new DriveSandboxFileContentsApi(client);
    this.spaces = new DriveSpacesApi(client);
    this.websiteRoots = new DriveWebsiteRootsApi(client);
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
function buildRequestHeaders(
  headers: Record<string, HeaderParameterSpec | undefined>,
  cookies: Record<string, HeaderParameterSpec | undefined> = {},
): Record<string, string> | undefined {
  const requestHeaders: Record<string, string> = {};

  for (const [name, parameter] of Object.entries(headers)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      requestHeaders[name] = serialized;
    }
  }

  const cookieHeader = buildCookieHeader(cookies);
  if (cookieHeader) {
    requestHeaders.Cookie = requestHeaders.Cookie
      ? `${requestHeaders.Cookie}; ${cookieHeader}`
      : cookieHeader;
  }

  return Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined;
}

interface HeaderParameterSpec {
  value: unknown;
  style: string;
  explode: boolean;
  contentType?: string;
}

function buildCookieHeader(cookies: Record<string, HeaderParameterSpec | undefined>): string | undefined {
  const pairs: string[] = [];
  for (const [name, parameter] of Object.entries(cookies)) {
    const serialized = serializeParameterValue(parameter);
    if (serialized !== undefined) {
      pairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(serialized)}`);
    }
  }
  return pairs.length > 0 ? pairs.join('; ') : undefined;
}

function serializeParameterValue(parameter: HeaderParameterSpec | undefined): string | undefined {
  const value = parameter?.value;
  if (value === undefined || value === null) {
    return undefined;
  }
  if (parameter?.contentType) {
    return JSON.stringify(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeHeaderPrimitive(item)).join(',');
  }
  if (typeof value === 'object' && value !== null) {
    return serializeHeaderObject(value as Record<string, unknown>, parameter?.explode === true);
  }
  return serializeHeaderPrimitive(value);
}

function serializeHeaderObject(value: Record<string, unknown>, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (explode) {
    return entries.map(([key, entryValue]) => `${key}=${serializeHeaderPrimitive(entryValue)}`).join(',');
  }
  return entries.flatMap(([key, entryValue]) => [key, serializeHeaderPrimitive(entryValue)]).join(',');
}

function serializeHeaderPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}
