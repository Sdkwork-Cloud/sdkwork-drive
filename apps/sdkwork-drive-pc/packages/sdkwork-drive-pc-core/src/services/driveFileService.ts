import type { DriveUploaderBlobLike } from '@sdkwork/drive-app-sdk';
import {
  canCreateDriveFolderInSection,
  canUploadDriveFileToSection,
  decodeLocalFilesystemId,
  type DriveFile,
} from 'sdkwork-drive-pc-types';
import type { HostAdapter } from '../host/hostAdapter';
import { createHostAdapter } from '../host/hostAdapter';
import { isNativeLocalUploadFile } from '../host/nativeLocalUploadFile';
import {
  buildLocalFilesystemFolderPath,
  mapLocalFilesystemEntryToDriveFile,
} from '../host/localFilesystemService';
import { omitAuthProjectionBody, omitAuthProjectionQuery } from '../sdk/authProjection';
import type { DriveAppSdkClient, DriveAppSdkRequest } from '../sdk/driveAppSdkClient';
import type { SessionSnapshot } from '../session/sessionStore';

export interface SharedSpace {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  isCustom?: boolean;
}

export interface KnowledgeBaseSpace {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
}

export interface DriveDownloadUrl {
  downloadUrl: string;
  signedSourceUrl?: string;
  expiresAtEpochMs: number;
  method: string;
}

export interface DriveDownloadPackage extends DriveDownloadUrl {
  id: string;
  packageName: string;
  fileCount: number;
  totalBytes: number;
  archiveSizeBytes?: number;
}

export interface DriveStorageSummary {
  tenantId: string;
  usedBytes: number;
  totalBytes?: number;
  usagePercent?: number;
  objectCount: number;
}

export interface DriveArchiveEntry {
  path: string;
  name: string;
  isDirectory: boolean;
  uncompressedSizeBytes: number;
  compressedSizeBytes: number;
  contentType?: string;
}

export interface DriveFileTextContent {
  content: string;
  contentType?: string;
  downloadUrl: string;
  signedSourceUrl?: string;
  expiresAtEpochMs: number;
}

export interface DriveUploadFileOptions {
  signal?: AbortSignal;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  taskId?: string;
  checksumSha256Hex?: string;
}

export interface DriveDownloadGrantOptions {
  requestedTtlSeconds?: number;
  signal?: AbortSignal;
}

export interface DriveArchiveOperationOptions {
  signal?: AbortSignal;
}

export interface DriveFileReadOptions {
  signal?: AbortSignal;
  pageToken?: string;
  pageSize?: number;
}

export interface DriveFileListPage {
  files: DriveFile[];
  nextPageToken?: string;
}

export interface DriveFileWriteOptions {
  signal?: AbortSignal;
}

export interface DriveCopyFileOptions extends DriveFileWriteOptions {
  id?: string;
  targetSpaceId?: string;
  targetParentNodeId?: string | null;
  nodeName?: string;
}

export interface DriveEmptyTrashOptions extends DriveFileWriteOptions {
  spaceId?: string;
}

export type DriveShareLinkRole = 'reader' | 'commenter' | 'writer';

export interface DriveShareLink {
  id: string;
  nodeId: string;
  role: DriveShareLinkRole;
  expiresAtEpochMs?: number;
  downloadLimit?: number;
  downloadCount: number;
  lifecycleStatus: string;
  version: number;
}

export interface DriveShareLinkWithToken extends DriveShareLink {
  token: string;
}

export interface DriveCreateShareLinkOptions extends DriveFileWriteOptions {
  role?: DriveShareLinkRole;
  expiresAtEpochMs?: number;
  downloadLimit?: number;
}

export interface DriveFileService {
  getAllWorkspaceFiles(options?: DriveFileReadOptions): Promise<DriveFile[]>;
  getFolderPath(folderId: string, options?: DriveFileReadOptions): Promise<DriveFile[]>;
  listFiles(
    section: string,
    searchQuery?: string,
    parentId?: string | null,
    options?: DriveFileReadOptions,
  ): Promise<DriveFile[]>;
  listFilesPage(
    section: string,
    searchQuery?: string,
    parentId?: string | null,
    options?: DriveFileReadOptions,
  ): Promise<DriveFileListPage>;
  getFolderDetails(folderId: string, options?: DriveFileReadOptions): Promise<DriveFile | undefined>;
  setFolderColor(folderId: string, color?: string, options?: DriveFileWriteOptions): Promise<void>;
  createFolder(
    name: string,
    section: string,
    parentId?: string | null,
    options?: DriveFileWriteOptions,
  ): Promise<DriveFile>;
  renameFile(id: string, newName: string, options?: DriveFileWriteOptions): Promise<void>;
  moveFile(
    id: string,
    targetParentNodeId?: string | null,
    options?: DriveFileWriteOptions,
  ): Promise<DriveFile>;
  copyFile(id: string, options?: DriveCopyFileOptions): Promise<DriveFile>;
  deleteFile(id: string, options?: DriveFileWriteOptions): Promise<void>;
  permanentlyDeleteFile(id: string, options?: DriveFileWriteOptions): Promise<void>;
  restoreFile(id: string, options?: DriveFileWriteOptions): Promise<void>;
  emptyTrash(options?: DriveEmptyTrashOptions): Promise<number>;
  listShareLinks(nodeId: string, options?: DriveFileReadOptions): Promise<DriveShareLink[]>;
  createShareLink(
    nodeId: string,
    options?: DriveCreateShareLinkOptions,
  ): Promise<DriveShareLinkWithToken>;
  revokeShareLink(shareLinkId: string, options?: DriveFileWriteOptions): Promise<boolean>;
  toggleStar(id: string, options?: DriveFileWriteOptions): Promise<boolean>;
  uploadFile(
    file: DriveUploaderBlobLike,
    section: string,
    parentId?: string | null,
    options?: DriveUploadFileOptions,
  ): Promise<DriveFile>;
  createDownloadUrl(file: DriveFile, options?: DriveDownloadGrantOptions): Promise<DriveDownloadUrl>;
  readFileText(file: DriveFile, options?: DriveDownloadGrantOptions): Promise<DriveFileTextContent>;
  saveFileText(
    file: DriveFile,
    content: string,
    contentType?: string,
    options?: DriveFileWriteOptions,
  ): Promise<void>;
  listArchiveEntries(file: DriveFile, options?: DriveArchiveOperationOptions): Promise<DriveArchiveEntry[]>;
  extractArchiveEntries(
    file: DriveFile,
    entryPaths?: string[],
    options?: DriveArchiveOperationOptions,
  ): Promise<DriveFile[]>;
  signPdfFile(file: DriveFile, options?: DriveFileWriteOptions): Promise<void>;
  createDownloadPackage(
    files: DriveFile[],
    packageName?: string,
    options?: DriveDownloadGrantOptions,
  ): Promise<DriveDownloadPackage>;
  getStorageSummary(options?: DriveFileReadOptions): Promise<DriveStorageSummary>;
  listSharedSpaces(options?: DriveFileReadOptions): Promise<SharedSpace[]>;
  getSharedSpaces(): SharedSpace[];
  listKnowledgeBaseSpaces(options?: DriveFileReadOptions): Promise<KnowledgeBaseSpace[]>;
  getKnowledgeBaseSpaces(): KnowledgeBaseSpace[];
  createSharedSpace(
    name: string,
    icon: string,
    color: string,
    description?: string,
    options?: DriveFileWriteOptions,
  ): Promise<SharedSpace>;
  deleteSharedSpace(id: string, options?: DriveFileWriteOptions): Promise<void>;
}

export interface CreateDriveFileServiceOptions {
  appSdkClient: DriveAppSdkClient;
  getSession: () => SessionSnapshot;
  hostAdapter?: HostAdapter;
  uploadFetch?: typeof fetch;
  downloadFetch?: typeof fetch;
}

type JsonRecord = Record<string, unknown>;

const DEFAULT_PAGE_SIZE = 200;
const DEFAULT_DOWNLOAD_TTL_SECONDS = 300;
const FOLDER_COLOR_PROPERTY_KEY = 'ui.folderColor';
const PDF_SIGNATURE_PROPERTY_KEY = 'workflow.pdfSignature';
const PERSONAL_SECTION_ID = 'my-storage';
const PERSONAL_SPACE_DISPLAY_NAME = 'My Storage';
const APP_SECTION_ID = 'apps';
const GIT_REPOSITORY_SPACE_DISPLAY_NAME = 'Git Repositories';
const VIEW_SECTIONS = new Set([
  'recent',
  'starred',
  'shared',
  'trash',
  APP_SECTION_ID,
  'computers',
]);
let fallbackIdCounter = 0;

interface RemoteIdentity {
  tenantId: string;
  userId: string;
  actorId: string;
  subjectType: 'user' | 'group' | 'domain' | 'app';
  ownerLabel: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isAbortError(value: unknown): boolean {
  if (value instanceof DOMException && value.name === 'AbortError') {
    return true;
  }
  if (value instanceof Error) {
    return value.name === 'AbortError' || /\babort(?:ed)?\b/i.test(value.message);
  }
  return false;
}

function isConflictError(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const status = numberField(value, 'status');
  if (status === 409) {
    return true;
  }
  const code = stringField(value, 'code');
  return Boolean(code && /(?:conflict|already_exists|duplicate)/i.test(code));
}

function stringField(source: JsonRecord, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function numberField(source: JsonRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function booleanField(source: JsonRecord, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }
  return undefined;
}

function stringArrayField(source: JsonRecord, ...keys: string[]): string[] {
  for (const key of keys) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string');
    }
  }
  return [];
}

function requiredStringField(source: JsonRecord, label: string, ...keys: string[]): string {
  const value = stringField(source, ...keys);
  if (!value) {
    throw new Error(`Drive App SDK response is missing ${label}.`);
  }
  return value;
}

function requiredNumberField(source: JsonRecord, label: string, ...keys: string[]): number {
  const value = numberField(source, ...keys);
  if (value === undefined) {
    throw new Error(`Drive App SDK response is missing ${label}.`);
  }
  return value;
}

function requiredBooleanField(source: JsonRecord, label: string, ...keys: string[]): boolean {
  const value = booleanField(source, ...keys);
  if (value === undefined) {
    throw new Error(`Drive App SDK response is missing ${label}.`);
  }
  return value;
}

function extractItems(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (isRecord(response) && Array.isArray(response.items)) {
    return response.items;
  }
  return [];
}

function nextPageTokenFrom(response: unknown): string | undefined {
  return stringField(isRecord(response) ? response : {}, 'nextPageToken', 'next_page_token');
}

function fileTypeFromNode(node: JsonRecord): DriveFile['type'] {
  const nodeType = stringField(node, 'nodeType', 'node_type', 'type');
  return nodeType === 'folder' ? 'folder' : 'file';
}

function timestampFromNode(node: JsonRecord): string {
  const value = stringField(node, 'updatedAt', 'updated_at', 'createdAt', 'created_at');
  if (value) {
    return value;
  }

  const epochMs = numberField(node, 'updatedAtEpochMs', 'updated_at_epoch_ms', 'createdAtEpochMs');
  if (epochMs !== undefined) {
    return new Date(epochMs).toISOString();
  }

  return new Date().toISOString();
}

function normalizeSpaceId(section: string): string {
  return VIEW_SECTIONS.has(section) ? 'my-storage' : section;
}

function assertCanCreateFolderInSection(section: string): void {
  if (!canCreateDriveFolderInSection(section)) {
    throw new Error(`Drive section "${section}" does not support folder creation.`);
  }
}

function assertCanUploadFileToSection(section: string): void {
  if (!canUploadDriveFileToSection(section)) {
    throw new Error(`Drive section "${section}" does not support uploads.`);
  }
}

function randomHex(bytesLength: number): string | undefined {
  const bytes = new Uint8Array(bytesLength);
  if (!globalThis.crypto?.getRandomValues) {
    return undefined;
  }

  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function makeId(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) {
    return `${prefix}-${randomUuid}`;
  }

  const randomHexValue = randomHex(16);
  if (randomHexValue) {
    return `${prefix}-${Date.now().toString(36)}-${randomHexValue}`;
  }

  fallbackIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}`;
}

function makeShareToken(): string {
  return randomHex(32) || `${Date.now().toString(36)}-${makeId('share')}`;
}

function mapShareLink(record: unknown): DriveShareLink {
  const source = isRecord(record) ? record : {};
  const role = stringField(source, 'role');
  const normalizedRole: DriveShareLinkRole =
    role === 'writer' || role === 'commenter' ? role : 'reader';
  return {
    id: stringField(source, 'id') || makeId('share-link'),
    nodeId: stringField(source, 'nodeId', 'node_id') || '',
    role: normalizedRole,
    expiresAtEpochMs: numberField(source, 'expiresAtEpochMs', 'expires_at_epoch_ms'),
    downloadLimit: numberField(source, 'downloadLimit', 'download_limit'),
    downloadCount: numberField(source, 'downloadCount', 'download_count') ?? 0,
    lifecycleStatus:
      stringField(source, 'lifecycleStatus', 'lifecycle_status') || 'active',
    version: numberField(source, 'version') ?? 1,
  };
}

function driveUploaderFingerprint(fileName: string, contentType: string, contentLength: number): string {
  const normalizedName = fileName
    .trim()
    .replace(/[^A-Za-z0-9._:@-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
  return `pc:${normalizedName || 'file'}:size:${contentLength}:type:${contentType.replace('/', '.')}`;
}

function assignDefined<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function getMimeTypeFromName(name: string): string {
  const extension = name.includes('.') ? name.split('.').pop()?.toLowerCase() ?? '' : '';
  if (extension === 'pdf') return 'application/pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
    return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  }
  if (['doc', 'docx'].includes(extension)) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (['ppt', 'pptx'].includes(extension)) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (['xls', 'xlsx', 'csv'].includes(extension)) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(extension)) return 'application/zip';
  if (['mp4', 'mov', 'avi', 'mkv'].includes(extension)) return 'video/mp4';
  if (['mp3', 'wav', 'aac', 'ogg'].includes(extension)) return 'audio/mpeg';
  if (['txt', 'md'].includes(extension)) return 'text/plain';
  return 'application/octet-stream';
}

function normalizeSubjectType(value: string | undefined): RemoteIdentity['subjectType'] {
  if (value === 'group' || value === 'domain' || value === 'app') {
    return value;
  }
  return 'user';
}

function resolveIdentity(getSession: () => SessionSnapshot): RemoteIdentity {
  const snapshot = getSession();
  const tenantId = snapshot.context?.tenantId;
  const userId = snapshot.context?.userId ?? snapshot.user?.id;

  if (!tenantId || !userId) {
    throw new Error('Drive App SDK session context is missing tenantId or userId.');
  }

  return {
    tenantId,
    userId,
    actorId: snapshot.context?.actorId || userId,
    subjectType: normalizeSubjectType(snapshot.context?.actorKind),
    ownerLabel: snapshot.user?.displayName || snapshot.user?.email || userId,
  };
}

function mapNodeToDriveFile(
  node: unknown,
  identity: RemoteIdentity,
  overrides: Partial<DriveFile> = {},
): DriveFile {
  const { id: fallbackId, name: fallbackName, type: overrideType, ...remainingOverrides } = overrides;
  const record = isRecord(node) ? node : {};
  const id = stringField(record, 'id', 'nodeId', 'node_id') || fallbackId || makeId('node');
  const name = stringField(record, 'nodeName', 'node_name', 'name', 'displayName') || fallbackName || id;
  const type = overrideType || fileTypeFromNode(record);
  const parentId = stringField(record, 'parentNodeId', 'parent_node_id', 'parentId');
  const size = numberField(record, 'size', 'sizeBytes', 'contentLength', 'content_length');
  const isStarred = booleanField(record, 'isStarred', 'starred', 'isFavorite', 'favorite');
  const color = stringField(record, 'color', 'folderColor');

  const file: DriveFile = {
    id,
    name,
    type,
    updatedAt: timestampFromNode(record),
    ownerId: stringField(record, 'ownerId', 'owner_id', 'ownerSubjectId', 'createdBy') || identity.ownerLabel,
  };

  assignDefined(file, 'spaceId', stringField(record, 'spaceId', 'space_id'));
  assignDefined(file, 'mimeType', stringField(record, 'mimeType', 'mime_type', 'contentType', 'content_type'));
  assignDefined(file, 'size', size);
  assignDefined(file, 'parentId', parentId);
  assignDefined(file, 'isStarred', isStarred);
  assignDefined(file, 'color', color);

  for (const [key, value] of Object.entries(remainingOverrides) as [keyof DriveFile, DriveFile[keyof DriveFile]][]) {
    if (value !== undefined) {
      (file as Record<keyof DriveFile, DriveFile[keyof DriveFile]>)[key] = value;
    }
  }

  return file;
}

function responseToDownloadUrl(response: unknown): DriveDownloadUrl {
  const record = isRecord(response) ? response : {};
  const downloadUrl = stringField(record, 'downloadUrl', 'download_url');
  if (!downloadUrl) {
    throw new Error('Drive App SDK download grant did not return a download URL.');
  }

  return {
    downloadUrl,
    signedSourceUrl: stringField(record, 'signedSourceUrl', 'signed_source_url'),
    expiresAtEpochMs: numberField(record, 'expiresAtEpochMs', 'expires_at_epoch_ms') || 0,
    method: stringField(record, 'method') || 'GET',
  };
}

function responseToDownloadPackage(response: unknown): DriveDownloadPackage {
  const record = isRecord(response) ? response : {};
  return {
    ...responseToDownloadUrl(response),
    id: stringField(record, 'id', 'packageId', 'package_id') || '',
    packageName: stringField(record, 'packageName', 'package_name') || 'drive_export.zip',
    fileCount: numberField(record, 'fileCount', 'file_count') || 0,
    totalBytes: numberField(record, 'totalBytes', 'total_bytes') || 0,
    archiveSizeBytes: numberField(record, 'archiveSizeBytes', 'archive_size_bytes'),
  };
}

function responseToArchiveEntry(response: unknown): DriveArchiveEntry {
  const record = isRecord(response) ? response : {};
  const path = stringField(record, 'path', 'archivePath', 'archive_path') || '';
  const entry: DriveArchiveEntry = {
    path,
    name: stringField(record, 'name', 'nodeName', 'node_name') || path.split('/').filter(Boolean).pop() || path,
    isDirectory: booleanField(record, 'isDirectory', 'is_directory', 'directory') ?? path.endsWith('/'),
    uncompressedSizeBytes: numberField(
      record,
      'uncompressedSizeBytes',
      'uncompressed_size_bytes',
      'size',
    ) ?? 0,
    compressedSizeBytes: numberField(record, 'compressedSizeBytes', 'compressed_size_bytes') ?? 0,
  };
  assignDefined(entry, 'contentType', stringField(record, 'contentType', 'content_type'));
  return entry;
}

function responseToStorageSummary(response: unknown, identity: RemoteIdentity): DriveStorageSummary {
  const record = isRecord(response) ? response : {};
  const usedBytes =
    numberField(record, 'usedBytes', 'used_bytes', 'totalBytes', 'total_bytes') ?? 0;
  const totalBytes = numberField(record, 'quotaBytes', 'quota_bytes', 'totalQuotaBytes', 'totalBytesLimit');
  const summary: DriveStorageSummary = {
    tenantId: stringField(record, 'tenantId', 'tenant_id') || identity.tenantId,
    usedBytes,
    objectCount: numberField(record, 'objectCount', 'object_count') ?? 0,
  };

  if (totalBytes !== undefined && totalBytes > 0) {
    summary.totalBytes = totalBytes;
    summary.usagePercent = Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100));
  }

  return summary;
}

function responseToSharedSpace(response: unknown, overrides: Partial<SharedSpace> = {}): SharedSpace {
  const record = isRecord(response) ? response : {};
  const id = stringField(record, 'id', 'spaceId', 'space_id') || overrides.id || makeId('shared-space');
  const space: SharedSpace = {
    id,
    name: stringField(record, 'displayName', 'display_name', 'name') || overrides.name || id,
    icon: stringField(record, 'presentationIcon', 'presentation_icon') || overrides.icon || 'Folder',
    color: stringField(record, 'presentationColor', 'presentation_color') || overrides.color || 'blue',
    isCustom: true,
  };
  assignDefined(space, 'description', overrides.description || stringField(record, 'description'));
  return space;
}

function responseToKnowledgeBaseSpace(response: unknown): KnowledgeBaseSpace {
  const record = isRecord(response) ? response : {};
  const id = requiredStringField(record, 'knowledge base space id', 'id', 'spaceId', 'space_id');
  const space: KnowledgeBaseSpace = {
    id,
    name: stringField(record, 'displayName', 'display_name', 'name') || 'Knowledge Base',
    icon: stringField(record, 'presentationIcon', 'presentation_icon') || 'Book',
    color: stringField(record, 'presentationColor', 'presentation_color') || 'blue',
  };
  assignDefined(space, 'description', stringField(record, 'description'));
  return space;
}

function isTeamSpace(response: unknown): boolean {
  const record = isRecord(response) ? response : {};
  return stringField(record, 'spaceType', 'space_type') === 'team';
}

function isPersonalSpace(response: unknown): boolean {
  const record = isRecord(response) ? response : {};
  return stringField(record, 'spaceType', 'space_type') === 'personal';
}

function isAppUploadSpace(response: unknown): boolean {
  const record = isRecord(response) ? response : {};
  return stringField(record, 'spaceType', 'space_type') === 'app_upload';
}

function isGitRepositorySpace(response: unknown): boolean {
  const record = isRecord(response) ? response : {};
  return stringField(record, 'spaceType', 'space_type') === 'git_repository';
}

function isKnowledgeBaseSpace(response: unknown): boolean {
  const record = isRecord(response) ? response : {};
  return stringField(record, 'spaceType', 'space_type') === 'knowledge_base';
}

function spaceIdFromSpace(response: unknown): string | undefined {
  const record = isRecord(response) ? response : {};
  return stringField(record, 'id', 'spaceId', 'space_id');
}

function spaceIdFromNode(response: unknown): string | undefined {
  const record = isRecord(response) ? response : {};
  const node = isRecord(record.node) ? record.node : record;
  return stringField(node, 'spaceId', 'space_id');
}

function uploadSessionFromCreateFile(response: unknown): JsonRecord {
  if (isRecord(response) && isRecord(response.uploadSession)) {
    return response.uploadSession;
  }
  if (isRecord(response) && isRecord(response.upload_session)) {
    return response.upload_session;
  }
  return {};
}

function nodeFromCreateFile(response: unknown): unknown {
  if (isRecord(response) && response.node !== undefined) {
    return response.node;
  }
  return response;
}

function createSdkBackedDriveFileService(
  appSdkClient: DriveAppSdkClient,
  getSession: () => SessionSnapshot,
  hostAdapter: HostAdapter,
  uploadFetch: typeof fetch = fetch,
  downloadFetch: typeof fetch = fetch,
): DriveFileService {
  const favoriteNodeIds = new Set<string>();
  const knownFiles = new Map<string, DriveFile>();
  const KNOWN_FILES_CACHE_LIMIT = 2_000;
  const personalSpaceIds = new Map<string, string>();
  const gitRepositorySpaceIds = new Map<string, string>();
  let sharedSpacesCache: SharedSpace[] = [];
  let knowledgeBaseSpacesCache: KnowledgeBaseSpace[] = [];

  const rememberFiles = (files: DriveFile[]): void => {
    for (const file of files) {
      knownFiles.set(file.id, file);
    }
    while (knownFiles.size > KNOWN_FILES_CACHE_LIMIT) {
      const oldestId = knownFiles.keys().next().value;
      if (oldestId === undefined) {
        break;
      }
      knownFiles.delete(oldestId);
    }
  };

  const forgetFile = (id: string): void => {
    knownFiles.delete(id);
  };

  const sdkRequest = async <T>(request: DriveAppSdkRequest): Promise<T> =>
    appSdkClient.request<T>({
      ...request,
      query: omitAuthProjectionQuery(request.query),
      body: omitAuthProjectionBody(request.body),
    });
  const requestPageItems = async (
    request: DriveAppSdkRequest,
    options: Pick<DriveFileReadOptions, 'pageToken' | 'pageSize'> = {},
  ): Promise<{ items: unknown[]; nextPageToken?: string }> => {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const response = await sdkRequest<unknown>({
      ...request,
      query: {
        ...request.query,
        pageSize,
        pageToken: options.pageToken,
      },
    });
    return {
      items: extractItems(response),
      nextPageToken: nextPageTokenFrom(response),
    };
  };

  const requestPaginatedItems = async (request: DriveAppSdkRequest): Promise<unknown[]> => {
    const items: unknown[] = [];
    const seenPageTokens = new Set<string>();
    let pageToken =
      typeof request.query?.pageToken === 'string' ? request.query.pageToken : undefined;
    if (pageToken) {
      seenPageTokens.add(pageToken);
    }

    for (;;) {
      const response = await sdkRequest<unknown>({
        ...request,
        query: {
          ...request.query,
          pageToken,
        },
      });
      items.push(...extractItems(response));

      const nextPageToken = nextPageTokenFrom(response);
      if (!nextPageToken) {
        return items;
      }
      if (seenPageTokens.has(nextPageToken)) {
        throw new Error(`Drive App SDK ${request.operationId} returned a repeated page token.`);
      }
      seenPageTokens.add(nextPageToken);
      pageToken = nextPageToken;
    }
  };

  const mapDecoratedNode = async (
    node: unknown,
    identity: RemoteIdentity,
    overrides: Partial<DriveFile> = {},
    options: DriveFileReadOptions = {},
  ): Promise<DriveFile> => {
    const file = mapNodeToDriveFile(node, identity, overrides);
    if (file.type !== 'folder') {
      return file;
    }

    try {
      const properties = await requestPaginatedItems({
        operationId: 'nodeProperties.list',
        signal: options.signal,
        pathParams: { nodeId: file.id },
        query: {
          visibility: 'private',
          pageSize: DEFAULT_PAGE_SIZE,
        },
      });
      const property = properties.find((item) => {
        const record = isRecord(item) ? item : {};
        const key = stringField(record, 'propertyKey', 'property_key');
        return key === FOLDER_COLOR_PROPERTY_KEY || key === 'folderColor';
      });
      if (isRecord(property)) {
        return {
          ...file,
          color: stringField(property, 'propertyValue', 'property_value', 'value') || file.color,
        };
      }
    } catch (err) {
      if (isAbortError(err)) {
        throw err;
      }
      return file;
    }

    return file;
  };

  const listFavoriteNodeIds = async (
    identity: RemoteIdentity,
    spaceId?: string,
    options: DriveFileReadOptions = {},
  ): Promise<Set<string>> => {
    const favoriteIds = new Set<string>();
    const items = await requestPaginatedItems({
      operationId: 'favorites.list',
      signal: options.signal,
      query: {
        spaceId,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    });
    for (const item of items) {
      const record = isRecord(item) ? item : {};
      const id = stringField(record, 'id', 'nodeId', 'node_id');
      if (id) {
        favoriteIds.add(id);
        favoriteNodeIds.add(id);
      }
    }
    return favoriteIds;
  };

  const mapNodeList = async (
    response: unknown,
    identity: RemoteIdentity,
    options: {
      starred?: boolean;
      parentId?: string | null;
      favoriteIds?: ReadonlySet<string>;
      signal?: AbortSignal;
    } = {},
  ): Promise<DriveFile[]> => {
    const files = extractItems(response).map((item) => {
      const file = mapNodeToDriveFile(item, identity, {
        isStarred: options.starred,
      });
      if (!options.favoriteIds) {
        return file;
      }

      const isStarred = options.favoriteIds.has(file.id);
      if (isStarred) {
        favoriteNodeIds.add(file.id);
      } else {
        favoriteNodeIds.delete(file.id);
      }
      return {
        ...file,
        isStarred: isStarred ? true : undefined,
      };
    });

    if (options.starred) {
      for (const file of files) {
        favoriteNodeIds.add(file.id);
      }
    }

    if (options.parentId) {
      const filteredFiles = files.filter((file) => file.parentId === options.parentId);
      rememberFiles(filteredFiles);
      return filteredFiles;
    }

    rememberFiles(files);
    return files;
  };

  const resolveTrashListQuery = async (
    parentId: string | null | undefined,
    identity: RemoteIdentity,
    options: DriveFileReadOptions = {},
  ): Promise<Record<string, string | number | boolean | undefined>> => {
    const query: Record<string, string | number | boolean | undefined> = {
      pageSize: DEFAULT_PAGE_SIZE,
    };
    if (!parentId) {
      return query;
    }

    const spaceId = await resolveNodeSpaceId(parentId, identity, options);
    return {
      ...query,
      spaceId,
      parentNodeId: parentId,
    };
  };

  const resolveNodeSpaceId = async (
    nodeId: string,
    identity: RemoteIdentity,
    options: DriveFileReadOptions = {},
  ): Promise<string> => {
    const cached = knownFiles.get(nodeId);
    if (cached?.spaceId) {
      return cached.spaceId;
    }

    const response = await sdkRequest<unknown>({
      operationId: 'nodes.get',
      signal: options?.signal,
      pathParams: { nodeId },
      query: {},
    });
    const spaceId = spaceIdFromNode(response);
    if (!spaceId) {
      throw new Error('Drive node storage space could not be resolved.');
    }
    return spaceId;
  };

  const listFolderChildren = async (
    parentId: string,
    identity: RemoteIdentity,
    options: DriveFileReadOptions & { starred?: boolean } = {},
  ): Promise<DriveFile[]> => {
    const spaceId = await resolveNodeSpaceId(parentId, identity, options);
    const items = await requestPaginatedItems({
      operationId: 'nodes.list',
      signal: options?.signal,
      pathParams: { spaceId },
      query: {
        parentNodeId: parentId,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    });
    const favoriteIds = await listFavoriteNodeIds(identity, spaceId, options);
    return mapNodeList(items, identity, {
      starred: options.starred,
      favoriteIds,
      signal: options?.signal,
    });
  };

  const listOwnedSpaces = async (
    identity: RemoteIdentity,
    options: DriveFileReadOptions = {},
  ): Promise<unknown[]> => {
    const response = await sdkRequest<unknown>({
      operationId: 'spaces.list',
      signal: options.signal,
      query: {
        ownerSubjectType: identity.subjectType,
        ownerSubjectId: identity.userId,
      },
    });
    return extractItems(response);
  };

  const ownerSpaceCacheKey = (identity: RemoteIdentity): string =>
    `${identity.tenantId}:${identity.subjectType}:${identity.userId}`;

  const findOwnedSpaceId = async (
    identity: RemoteIdentity,
    predicate: (space: unknown) => boolean,
    options: DriveFileReadOptions = {},
  ): Promise<string | undefined> =>
    (await listOwnedSpaces(identity, options))
      .filter(predicate)
      .map(spaceIdFromSpace)
      .find((spaceId): spaceId is string => Boolean(spaceId));

  const resolvePersonalSpaceId = async (
    identity: RemoteIdentity,
    options: DriveFileReadOptions = {},
  ): Promise<string> => {
    const cacheKey = ownerSpaceCacheKey(identity);
    const cachedSpaceId = personalSpaceIds.get(cacheKey);
    if (cachedSpaceId) {
      return cachedSpaceId;
    }

    const existingPersonalSpaceId = await findOwnedSpaceId(identity, isPersonalSpace, options);
    if (existingPersonalSpaceId) {
      personalSpaceIds.set(cacheKey, existingPersonalSpaceId);
      return existingPersonalSpaceId;
    }

    let response: unknown;
    try {
      response = await sdkRequest<unknown>({
        operationId: 'spaces.create',
        signal: options.signal,
        body: {
          id: makeId('space'),
          ownerSubjectType: identity.subjectType,
          ownerSubjectId: identity.userId,
          displayName: PERSONAL_SPACE_DISPLAY_NAME,
          spaceType: 'personal',
        },
      });
    } catch (error) {
      if (isConflictError(error)) {
        const resolvedSpaceId = await findOwnedSpaceId(identity, isPersonalSpace, options);
        if (resolvedSpaceId) {
          personalSpaceIds.set(cacheKey, resolvedSpaceId);
          return resolvedSpaceId;
        }
      }
      throw error;
    }
    const createdSpaceId = spaceIdFromSpace(response);
    if (!createdSpaceId) {
      throw new Error('Drive personal space provisioning did not return a space id.');
    }
    personalSpaceIds.set(cacheKey, createdSpaceId);
    return createdSpaceId;
  };

  const resolveGitRepositorySpaceId = async (
    identity: RemoteIdentity,
    options: DriveFileReadOptions = {},
  ): Promise<string> => {
    const cacheKey = ownerSpaceCacheKey(identity);
    const cachedSpaceId = gitRepositorySpaceIds.get(cacheKey);
    if (cachedSpaceId) {
      return cachedSpaceId;
    }

    const existingGitRepositorySpaceId = await findOwnedSpaceId(
      identity,
      isGitRepositorySpace,
      options,
    );
    if (existingGitRepositorySpaceId) {
      gitRepositorySpaceIds.set(cacheKey, existingGitRepositorySpaceId);
      return existingGitRepositorySpaceId;
    }

    let response: unknown;
    try {
      response = await sdkRequest<unknown>({
        operationId: 'spaces.create',
        signal: options.signal,
        body: {
          id: makeId('space'),
          ownerSubjectType: identity.subjectType,
          ownerSubjectId: identity.userId,
          displayName: GIT_REPOSITORY_SPACE_DISPLAY_NAME,
          spaceType: 'git_repository',
        },
      });
    } catch (error) {
      if (isConflictError(error)) {
        const resolvedSpaceId = await findOwnedSpaceId(identity, isGitRepositorySpace, options);
        if (resolvedSpaceId) {
          gitRepositorySpaceIds.set(cacheKey, resolvedSpaceId);
          return resolvedSpaceId;
        }
      }
      throw error;
    }
    const createdSpaceId = spaceIdFromSpace(response);
    if (!createdSpaceId) {
      throw new Error('Drive git repository space provisioning did not return a space id.');
    }
    gitRepositorySpaceIds.set(cacheKey, createdSpaceId);
    return createdSpaceId;
  };

  const resolveSectionSpaceIds = async (
    section: string,
    identity: RemoteIdentity,
    options: DriveFileReadOptions = {},
  ): Promise<string[]> => {
    if (section === PERSONAL_SECTION_ID) {
      return [await resolvePersonalSpaceId(identity, options)];
    }

    if (section === APP_SECTION_ID) {
      return [await resolveGitRepositorySpaceId(identity, options)];
    }

    return [normalizeSpaceId(section)];
  };

  const resolvePrimarySpaceId = async (
    section: string,
    identity: RemoteIdentity,
    options: DriveFileReadOptions = {},
  ): Promise<string> => {
    const spaceIds = await resolveSectionSpaceIds(section, identity, options);
    const primarySpaceId = spaceIds[0];
    if (primarySpaceId) {
      return primarySpaceId;
    }

    return normalizeSpaceId(section);
  };

  const listLocalComputerFiles = async (
    searchQuery: string | undefined,
    parentId: string | null | undefined,
    identity: RemoteIdentity,
    options: DriveFileReadOptions = {},
  ): Promise<DriveFile[]> => {
    if (!hostAdapter.isNativeHost) {
      throw new Error('The computers view is only available in the desktop app.');
    }

    const parentPath = parentId ? decodeLocalFilesystemId(parentId) : null;
    if (parentId && !parentPath) {
      throw new Error('Invalid local folder reference.');
    }

    const entries = await hostAdapter.listLocalFilesystem(parentPath);
    const files = entries.map((entry) =>
      mapLocalFilesystemEntryToDriveFile(entry, identity.userId, parentId ?? undefined),
    );

    if (searchQuery?.trim()) {
      const term = searchQuery.trim().toLowerCase();
      return files.filter((file) => file.name.toLowerCase().includes(term));
    }

    rememberFiles(files);
    return files;
  };

  const listFilesFromSpaces = async (
    spaceIds: string[],
    identity: RemoteIdentity,
    parentId?: string | null,
    options: DriveFileReadOptions = {},
  ): Promise<DriveFile[]> => {
    const files = await Promise.all(
      spaceIds.map(async (spaceId) => {
        const items = await requestPaginatedItems({
          operationId: 'nodes.list',
          signal: options.signal,
          pathParams: { spaceId },
          query: {
            parentNodeId: parentId || undefined,
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        const favoriteIds = await listFavoriteNodeIds(identity, spaceId, options);
        return mapNodeList(items, identity, { favoriteIds, signal: options.signal });
      }),
    );

    return files.flat();
  };

  const discardIncompleteUploadNode = async (
    nodeId: string | undefined,
    identity: RemoteIdentity,
    options: DriveUploadFileOptions = {},
  ): Promise<void> => {
    if (!nodeId) {
      return;
    }

    try {
      await sdkRequest<unknown>({
        operationId: 'nodes.delete',
        signal: options.signal,
        pathParams: { nodeId },
        query: {
        },
      });
      forgetFile(nodeId);
    } catch (cleanupError) {
      if (isAbortError(cleanupError)) {
        throw cleanupError;
      }
    }
  };

  const uploadTextThroughUploader = async (
    blob: File,
    node: DriveFile,
    identity: RemoteIdentity,
    contentType: string,
    options: DriveFileWriteOptions = {},
  ): Promise<void> => {
    const spaceId = node.spaceId || spaceIdFromNode(await sdkRequest<unknown>({
      operationId: 'nodes.get',
      signal: options.signal,
      pathParams: { nodeId: node.id },
      query: {
      },
    }));
    if (!spaceId) {
      throw new Error('Drive node storage space is required to save content.');
    }

    await appSdkClient.uploader.replaceNodeContent({
      file: blob,
      spaceId,
      nodeId: node.id,
      appResourceType: 'desktop-file-editor',
      appResourceId: node.id,
      scene: 'drive_pc_text_save',
      source: 'pc_text_editor',
      uploadProfileCode: 'text',
      fileFingerprint: driveUploaderFingerprint(node.name, contentType, blob.size),
      originalFileName: node.name,
      contentType,
      requestedPartTtlSeconds: DEFAULT_DOWNLOAD_TTL_SECONDS,
      uploadFetch,
      signal: options.signal,
    });

    const existing = knownFiles.get(node.id);
    if (existing) {
      knownFiles.set(node.id, {
        ...existing,
        mimeType: contentType,
        size: blob.size,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const uploadFileThroughSession = async (
    file: DriveUploaderBlobLike,
    section: string,
    parentId?: string | null,
    options?: DriveUploadFileOptions,
  ): Promise<DriveFile> => {
    assertCanUploadFileToSection(section);
    const identity = resolveIdentity(getSession);
    const originalFileName = file.name?.trim() || 'upload.bin';
    const contentType = file.type || getMimeTypeFromName(originalFileName);
    const spaceId = await resolvePrimarySpaceId(section, identity, options);
    let preparedNodeId: string | undefined;
    const checksumSha256Hex = options?.checksumSha256Hex
      ?? (isNativeLocalUploadFile(file)
        ? await hostAdapter.checksumLocalUploadFile(file.path)
        : undefined);

    try {
      const uploadResult = await appSdkClient.uploader.upload({
        file,
        taskId: options?.taskId,
        appResourceType: 'desktop-file-browser',
        appResourceId: section,
        scene: 'drive_pc_file_upload',
        source: isNativeLocalUploadFile(file) ? 'pc_native_file' : 'pc_local_file',
        fileFingerprint: driveUploaderFingerprint(originalFileName, contentType, file.size),
        originalFileName,
        contentType,
        checksumSha256Hex,
        spaceId,
        parentNodeId: parentId || undefined,
        requestedPartTtlSeconds: DEFAULT_DOWNLOAD_TTL_SECONDS,
        uploadFetch,
        signal: options?.signal,
        onProgress: options?.onProgress
          ? (progress) => {
              if (progress.nodeId) {
                preparedNodeId = progress.nodeId;
              }
              options.onProgress?.(
                Number(progress.uploadedBytes) || 0,
                Number(progress.totalBytes) || file.size,
              );
            }
          : (progress) => {
              if (progress.nodeId) {
                preparedNodeId = progress.nodeId;
              }
            },
      });

      const uploadItem = uploadResult.uploadItem;
      const uploadedFile = mapNodeToDriveFile(
        {
          id: uploadItem.nodeId,
          spaceId: uploadItem.spaceId,
          parentNodeId: parentId || undefined,
          nodeType: 'file',
          nodeName: uploadItem.originalFileName,
          contentType: uploadItem.contentType,
          contentLength: Number(uploadItem.contentLength) || file.size,
          lifecycleStatus: 'active',
        },
        identity,
        {
          id: uploadItem.nodeId,
          name: uploadItem.originalFileName,
          spaceId: uploadItem.spaceId,
          parentId: parentId || undefined,
          mimeType: uploadItem.contentType,
          size: Number(uploadItem.contentLength) || file.size,
        },
      );
      const normalizedFile: DriveFile = {
        ...uploadedFile,
        type: 'file',
        mimeType: contentType,
        size: file.size,
      };
      rememberFiles([normalizedFile]);
      return normalizedFile;
    } catch (error) {
      // Keep prepared upload nodes for resumable retries unless the caller explicitly aborted.
      if (isAbortError(error)) {
        await discardIncompleteUploadNode(preparedNodeId, identity, options);
      }
      throw error;
    }
  };

  const service: DriveFileService = {
    async getAllWorkspaceFiles(options) {
      await service.listFiles('my-storage', undefined, undefined, options);
      return Array.from(knownFiles.values());
    },
    async getFolderPath(folderId, options) {
      const localPath = decodeLocalFilesystemId(folderId);
      if (localPath) {
        const identity = resolveIdentity(getSession);
        const files = buildLocalFilesystemFolderPath(localPath, identity.userId);
        rememberFiles(files);
        return files;
      }

      const identity = resolveIdentity(getSession);
      const response = await sdkRequest<unknown>({
        operationId: 'nodes.path.get',
        signal: options?.signal,
        pathParams: { nodeId: folderId },
        query: {
        },
      });
      const files = extractItems(response).map((item) => mapNodeToDriveFile(item, identity));
      rememberFiles(files);
      return files;
    },
    async listFiles(section, searchQuery, parentId, options) {
      const identity = resolveIdentity(getSession);

      if (searchQuery) {
        if (section === 'computers') {
          return listLocalComputerFiles(searchQuery, parentId, identity, options);
        }

        let spaceId: string | undefined;
        if (section === APP_SECTION_ID) {
          const spaceIds = await resolveSectionSpaceIds(section, identity, options);
          spaceId = spaceIds[0];
        } else if (!VIEW_SECTIONS.has(section)) {
          spaceId = await resolvePrimarySpaceId(section, identity, options);
        }

        const items = await requestPaginatedItems({
          operationId: 'search.query',
          signal: options?.signal,
          query: {
            q: searchQuery,
            ...(spaceId ? { spaceId } : {}),
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        const favoriteIds = spaceId
          ? await listFavoriteNodeIds(identity, spaceId, options)
          : await listFavoriteNodeIds(identity, undefined, options);
        return mapNodeList(items, identity, { parentId, favoriteIds, signal: options?.signal });
      }

      if (section === 'recent') {
        if (parentId) {
          return listFolderChildren(parentId, identity, options);
        }
        const items = await requestPaginatedItems({
          operationId: 'recent.list',
          signal: options?.signal,
          query: {
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        const favoriteIds = await listFavoriteNodeIds(identity, undefined, options);
        return mapNodeList(items, identity, { favoriteIds, signal: options?.signal });
      }
      if (section === 'starred') {
        if (parentId) {
          return listFolderChildren(parentId, identity, { ...options, starred: true });
        }
        const items = await requestPaginatedItems({
          operationId: 'favorites.list',
          signal: options?.signal,
          query: {
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        return mapNodeList(items, identity, { starred: true, signal: options?.signal });
      }
      if (section === 'shared') {
        if (parentId) {
          return listFolderChildren(parentId, identity, options);
        }
        const items = await requestPaginatedItems({
          operationId: 'sharedWithMe.list',
          signal: options?.signal,
          query: {
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        const favoriteIds = await listFavoriteNodeIds(identity, undefined, options);
        return mapNodeList(items, identity, { favoriteIds, signal: options?.signal });
      }
      if (section === 'computers') {
        return listLocalComputerFiles(searchQuery, parentId, identity, options);
      }
      if (section === APP_SECTION_ID) {
        const spaceIds = await resolveSectionSpaceIds(section, identity, options);
        return listFilesFromSpaces(spaceIds, identity, parentId, options);
      }
      if (section === 'trash') {
        const items = await requestPaginatedItems({
          operationId: 'trash.list',
          signal: options?.signal,
          query: await resolveTrashListQuery(parentId, identity, options),
        });
        return mapNodeList(items, identity, { signal: options?.signal });
      }

      const spaceId = await resolvePrimarySpaceId(section, identity, options);
      const items = await requestPaginatedItems({
        operationId: 'nodes.list',
        signal: options?.signal,
        pathParams: { spaceId },
        query: {
          parentNodeId: parentId || undefined,
          pageSize: DEFAULT_PAGE_SIZE,
        },
      });
      const favoriteIds = await listFavoriteNodeIds(identity, spaceId, options);
      return mapNodeList(items, identity, { favoriteIds, signal: options?.signal });
    },
    async listFilesPage(section, searchQuery, parentId, options) {
      const identity = resolveIdentity(getSession);
      const pageOptions = {
        pageToken: options?.pageToken,
        pageSize: options?.pageSize ?? DEFAULT_PAGE_SIZE,
      };

      if (searchQuery) {
        if (section === 'computers') {
          const files = await listLocalComputerFiles(searchQuery, parentId, identity, options);
          return { files };
        }

        let spaceId: string | undefined;
        if (section === APP_SECTION_ID) {
          const spaceIds = await resolveSectionSpaceIds(section, identity, options);
          spaceId = spaceIds[0];
        } else if (!VIEW_SECTIONS.has(section)) {
          spaceId = await resolvePrimarySpaceId(section, identity, options);
        }

        const { items, nextPageToken } = await requestPageItems({
          operationId: 'search.query',
          signal: options?.signal,
          query: {
            q: searchQuery,
            ...(spaceId ? { spaceId } : {}),
          },
        }, pageOptions);
        const favoriteIds = spaceId
          ? await listFavoriteNodeIds(identity, spaceId, options)
          : await listFavoriteNodeIds(identity, undefined, options);
        const files = await mapNodeList(items, identity, { parentId, favoriteIds, signal: options?.signal });
        return { files, nextPageToken };
      }

      if (section === 'recent' && parentId) {
        const spaceId = await resolveNodeSpaceId(parentId, identity, options);
        const { items, nextPageToken } = await requestPageItems({
          operationId: 'nodes.list',
          signal: options?.signal,
          pathParams: { spaceId },
          query: { parentNodeId: parentId },
        }, pageOptions);
        const favoriteIds = await listFavoriteNodeIds(identity, spaceId, options);
        const files = await mapNodeList(items, identity, { favoriteIds, signal: options?.signal });
        return { files, nextPageToken };
      }
      if (section === 'starred' && parentId) {
        const spaceId = await resolveNodeSpaceId(parentId, identity, options);
        const { items, nextPageToken } = await requestPageItems({
          operationId: 'nodes.list',
          signal: options?.signal,
          pathParams: { spaceId },
          query: { parentNodeId: parentId },
        }, pageOptions);
        const favoriteIds = await listFavoriteNodeIds(identity, spaceId, options);
        const files = await mapNodeList(items, identity, { starred: true, favoriteIds, signal: options?.signal });
        return { files, nextPageToken };
      }
      if (section === 'shared' && parentId) {
        const spaceId = await resolveNodeSpaceId(parentId, identity, options);
        const { items, nextPageToken } = await requestPageItems({
          operationId: 'nodes.list',
          signal: options?.signal,
          pathParams: { spaceId },
          query: { parentNodeId: parentId },
        }, pageOptions);
        const favoriteIds = await listFavoriteNodeIds(identity, spaceId, options);
        const files = await mapNodeList(items, identity, { favoriteIds, signal: options?.signal });
        return { files, nextPageToken };
      }
      if (section === 'computers' || section === APP_SECTION_ID) {
        const files = await service.listFiles(section, searchQuery, parentId, options);
        return { files };
      }

      let request: DriveAppSdkRequest;
      let mapOptions: Parameters<typeof mapNodeList>[2] = { signal: options?.signal };
      let favoriteSpaceId: string | undefined;

      if (section === 'recent') {
        request = { operationId: 'recent.list', signal: options?.signal, query: {} };
        favoriteSpaceId = undefined;
      } else if (section === 'starred') {
        request = { operationId: 'favorites.list', signal: options?.signal, query: {} };
        mapOptions = { ...mapOptions, starred: true };
      } else if (section === 'shared') {
        request = { operationId: 'sharedWithMe.list', signal: options?.signal, query: {} };
        favoriteSpaceId = undefined;
      } else if (section === 'trash') {
        request = {
          operationId: 'trash.list',
          signal: options?.signal,
          query: await resolveTrashListQuery(parentId, identity, options),
        };
      } else {
        const spaceId = await resolvePrimarySpaceId(section, identity, options);
        favoriteSpaceId = spaceId;
        request = {
          operationId: 'nodes.list',
          signal: options?.signal,
          pathParams: { spaceId },
          query: { parentNodeId: parentId || undefined },
        };
      }

      const { items, nextPageToken } = await requestPageItems(request, pageOptions);
      if (favoriteSpaceId !== undefined || section === 'recent' || section === 'shared') {
        const favoriteIds = await listFavoriteNodeIds(
          identity,
          favoriteSpaceId,
          options,
        );
        mapOptions = { ...mapOptions, favoriteIds };
      }
      const files = await mapNodeList(items, identity, mapOptions);
      return { files, nextPageToken };
    },
    async getFolderDetails(folderId, options) {
      const identity = resolveIdentity(getSession);
      const response = await sdkRequest<unknown>({
        operationId: 'nodes.get',
        signal: options?.signal,
        pathParams: { nodeId: folderId },
        query: {
        },
      });
      const file = await mapDecoratedNode(response, identity, {}, options);
      rememberFiles([file]);
      return file;
    },
    async setFolderColor(folderId, color, options) {
      const identity = resolveIdentity(getSession);
      if (color) {
        await sdkRequest<unknown>({
          operationId: 'nodeProperties.set',
          signal: options?.signal,
          pathParams: {
            nodeId: folderId,
            propertyKey: FOLDER_COLOR_PROPERTY_KEY,
          },
          body: {
            value: color,
            visibility: 'private',
          },
        });
        return;
      }

      await sdkRequest<unknown>({
        operationId: 'nodeProperties.delete',
        signal: options?.signal,
        pathParams: {
          nodeId: folderId,
          propertyKey: FOLDER_COLOR_PROPERTY_KEY,
        },
        query: {
          visibility: 'private',
        },
      });
    },
    async createFolder(name, section, parentId, options) {
      assertCanCreateFolderInSection(section);
      const identity = resolveIdentity(getSession);
      const spaceId = await resolvePrimarySpaceId(section, identity, options);
      const response = await sdkRequest<unknown>({
        operationId: 'nodes.folders.create',
        signal: options?.signal,
        body: {
          spaceId,
          parentNodeId: parentId || undefined,
          nodeName: name,
        },
      });
      const folder = await mapDecoratedNode(response, identity, {}, options);
      rememberFiles([folder]);
      return folder;
    },
    async renameFile(id, newName, options) {
      const identity = resolveIdentity(getSession);
      await sdkRequest<unknown>({
        operationId: 'nodes.update',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
          nodeName: newName,
        },
      });
      const existing = knownFiles.get(id);
      if (existing) {
        knownFiles.set(id, {
          ...existing,
          name: newName,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    async moveFile(id, targetParentNodeId, options) {
      const identity = resolveIdentity(getSession);
      const response = await sdkRequest<unknown>({
        operationId: 'nodes.move',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
          targetParentNodeId: targetParentNodeId || undefined,
        },
      });
      const moved = await mapDecoratedNode(response, identity, {}, options);
      rememberFiles([moved]);
      return moved;
    },
    async copyFile(id, options = {}) {
      const identity = resolveIdentity(getSession);
      const response = await sdkRequest<unknown>({
        operationId: 'nodes.copy',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
          id: options.id || makeId('node'),
          targetSpaceId: options.targetSpaceId,
          targetParentNodeId: options.targetParentNodeId || undefined,
          nodeName: options.nodeName,
        },
      });
      const copied = await mapDecoratedNode(response, identity, {}, options);
      rememberFiles([copied]);
      return copied;
    },
    async deleteFile(id, options) {
      const identity = resolveIdentity(getSession);
      await sdkRequest<unknown>({
        operationId: 'trash.move',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
        },
      });
      favoriteNodeIds.delete(id);
      forgetFile(id);
    },
    async permanentlyDeleteFile(id, options) {
      const identity = resolveIdentity(getSession);
      await sdkRequest<unknown>({
        operationId: 'nodes.delete',
        signal: options?.signal,
        pathParams: { nodeId: id },
        query: {
        },
      });
      favoriteNodeIds.delete(id);
      forgetFile(id);
    },
    async restoreFile(id, options) {
      const identity = resolveIdentity(getSession);
      await sdkRequest<unknown>({
        operationId: 'trash.restore',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
        },
      });
      forgetFile(id);
    },
    async emptyTrash(options) {
      const identity = resolveIdentity(getSession);
      const body: JsonRecord = {
      };
      assignDefined(body, 'spaceId', options?.spaceId);
      const response = await sdkRequest<unknown>({
        operationId: 'trash.empty',
        signal: options?.signal,
        body,
      });
      return requiredNumberField(
        isRecord(response) ? response : {},
        'trash empty deletedCount',
        'deletedCount',
        'deleted_count',
      );
    },
    async listShareLinks(nodeId, options) {
      const response = await sdkRequest<unknown>({
        operationId: 'shareLinks.list',
        signal: options?.signal,
        pathParams: { nodeId },
        query: {},
      });
      return extractItems(response).map((item) => mapShareLink(item));
    },
    async createShareLink(nodeId, options = {}) {
      const token = makeShareToken();
      const body: JsonRecord = {
        id: makeId('share-link'),
        token,
        role: options.role || 'reader',
      };
      assignDefined(body, 'expiresAtEpochMs', options.expiresAtEpochMs);
      assignDefined(body, 'downloadLimit', options.downloadLimit);
      const response = await sdkRequest<unknown>({
        operationId: 'shareLinks.create',
        signal: options?.signal,
        pathParams: { nodeId },
        body,
      });
      return {
        ...mapShareLink(response),
        token,
      };
    },
    async revokeShareLink(shareLinkId, options) {
      const response = await sdkRequest<unknown>({
        operationId: 'shareLinks.revoke',
        signal: options?.signal,
        pathParams: { shareLinkId },
        query: {},
      });
      return booleanField(isRecord(response) ? response : {}, 'revoked') ?? false;
    },
    async toggleStar(id, options) {
      const identity = resolveIdentity(getSession);
      if (favoriteNodeIds.has(id)) {
        const response = await sdkRequest<unknown>({
          operationId: 'favorites.delete',
          signal: options?.signal,
          pathParams: { nodeId: id },
          query: {
          },
        });
        const favorited = booleanField(isRecord(response) ? response : {}, 'favorited') ?? false;
        favoriteNodeIds.delete(id);
        const existing = knownFiles.get(id);
        if (existing) {
          knownFiles.set(id, { ...existing, isStarred: false });
        }
        return favorited;
      }

      const response = await sdkRequest<unknown>({
        operationId: 'favorites.set',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
        },
      });
      const favorited = booleanField(isRecord(response) ? response : {}, 'favorited') ?? true;
      if (favorited) {
        favoriteNodeIds.add(id);
      }
      const existing = knownFiles.get(id);
      if (existing) {
        knownFiles.set(id, { ...existing, isStarred: favorited });
      }
      return favorited;
    },
    async uploadFile(file, section, parentId, options) {
      return uploadFileThroughSession(file, section, parentId, options);
    },
    async createDownloadUrl(file, options) {
      const identity = resolveIdentity(getSession);
      const requestedTtlSeconds = options?.requestedTtlSeconds ?? DEFAULT_DOWNLOAD_TTL_SECONDS;
      const response = await sdkRequest<unknown>({
        operationId: 'nodes.downloadUrls.create',
        signal: options?.signal,
        pathParams: { nodeId: file.id },
        query: {
          requestedTtlSeconds,
        },
      });
      return responseToDownloadUrl(response);
    },
    async readFileText(file, options) {
      const grant = await service.createDownloadUrl(file, options);
      if (!grant.downloadUrl) {
        throw new Error('Drive preview download grant did not return a download URL.');
      }

      const response = await downloadFetch(grant.signedSourceUrl || grant.downloadUrl, {
        method: grant.method || 'GET',
        signal: options?.signal,
      });
      if (!response.ok) {
        throw new Error(`Drive preview content fetch failed with HTTP ${response.status}`);
      }

      return {
        content: await response.text(),
        contentType: response.headers.get('Content-Type') || file.mimeType,
        downloadUrl: grant.downloadUrl,
        signedSourceUrl: grant.signedSourceUrl,
        expiresAtEpochMs: grant.expiresAtEpochMs,
      };
    },
    async saveFileText(
      file,
      content,
      contentType = file.mimeType || getMimeTypeFromName(file.name),
      options,
    ) {
      const identity = resolveIdentity(getSession);
      const replacement = new File([content], file.name, { type: contentType });
      await uploadTextThroughUploader(replacement, file, identity, contentType, options);
    },
    async listArchiveEntries(file, options) {
      const identity = resolveIdentity(getSession);
      const response = await sdkRequest<unknown>({
        operationId: 'archiveEntries.list',
        signal: options?.signal,
        pathParams: { nodeId: file.id },
        query: {
        },
      });
      return extractItems(response).map(responseToArchiveEntry);
    },
    async extractArchiveEntries(file, entryPaths, options) {
      const identity = resolveIdentity(getSession);
      const response = await sdkRequest<unknown>({
        operationId: 'archiveEntries.extract',
        signal: options?.signal,
        pathParams: { nodeId: file.id },
        body: {
          entryPaths: entryPaths?.length ? entryPaths : undefined,
        },
      });
      const files = extractItems(response).map((item) => mapNodeToDriveFile(item, identity));
      rememberFiles(files);
      return files;
    },
    async signPdfFile(file, options) {
      const identity = resolveIdentity(getSession);
      await sdkRequest<unknown>({
        operationId: 'nodeProperties.set',
        signal: options?.signal,
        pathParams: {
          nodeId: file.id,
          propertyKey: PDF_SIGNATURE_PROPERTY_KEY,
        },
        body: {
          value: JSON.stringify({
            signatureType: 'metadata_acknowledgement',
            signedBy: identity.userId,
            signedByDisplayName: identity.ownerLabel,
            signedAt: new Date().toISOString(),
            fileName: file.name,
          }),
          visibility: 'private',
        },
      });
    },
    async createDownloadPackage(files, packageName, options) {
      const identity = resolveIdentity(getSession);
      const requestedTtlSeconds = options?.requestedTtlSeconds ?? DEFAULT_DOWNLOAD_TTL_SECONDS;
      const response = await sdkRequest<unknown>({
        operationId: 'downloadPackages.create',
        signal: options?.signal,
        body: {
          nodeIds: files.map((file) => file.id),
          packageName,
          requestedTtlSeconds,
        },
      });
      return responseToDownloadPackage(response);
    },
    async getStorageSummary(options) {
      const identity = resolveIdentity(getSession);
      const response = await sdkRequest<unknown>({
        operationId: 'quotas.summary',
        signal: options?.signal,
        query: {
        },
      });
      return responseToStorageSummary(response, identity);
    },
    async listSharedSpaces(options) {
      const identity = resolveIdentity(getSession);
      const response = await sdkRequest<unknown>({
        operationId: 'spaces.list',
        signal: options?.signal,
        query: {
        },
      });
      sharedSpacesCache = extractItems(response)
        .filter(isTeamSpace)
        .map((item) => responseToSharedSpace(item));
      return sharedSpacesCache;
    },
    getSharedSpaces: () => sharedSpacesCache,
    async listKnowledgeBaseSpaces(options) {
      const identity = resolveIdentity(getSession);
      const response = await sdkRequest<unknown>({
        operationId: 'spaces.list',
        signal: options?.signal,
        query: {
        },
      });
      knowledgeBaseSpacesCache = extractItems(response)
        .filter(isKnowledgeBaseSpace)
        .map((item) => responseToKnowledgeBaseSpace(item));
      return knowledgeBaseSpacesCache;
    },
    getKnowledgeBaseSpaces: () => knowledgeBaseSpacesCache,
    async createSharedSpace(name, icon, color, description, options) {
      const identity = resolveIdentity(getSession);
      const spaceId = makeId('space');
      const response = await sdkRequest<unknown>({
        operationId: 'spaces.create',
        signal: options?.signal,
        body: {
          id: spaceId,
          ownerSubjectType: 'group',
          ownerSubjectId: spaceId,
          displayName: name,
          spaceType: 'team',
          presentationIcon: icon,
          presentationColor: color,
          description,
        },
      });
      const created = responseToSharedSpace(response, {
        name,
        icon,
        color,
        description,
      });
      sharedSpacesCache = [...sharedSpacesCache.filter((space) => space.id !== created.id), created];
      return created;
    },
    async deleteSharedSpace(id, options) {
      const identity = resolveIdentity(getSession);
      await sdkRequest<unknown>({
        operationId: 'spaces.delete',
        signal: options?.signal,
        pathParams: { spaceId: id },
        query: {
        },
      });
      sharedSpacesCache = sharedSpacesCache.filter((space) => space.id !== id);
    },
  };

  return service;
}

export function createDriveFileService({
  appSdkClient,
  getSession,
  hostAdapter = createHostAdapter(),
  uploadFetch,
  downloadFetch,
}: CreateDriveFileServiceOptions): DriveFileService {
  return createSdkBackedDriveFileService(
    appSdkClient,
    getSession,
    hostAdapter,
    uploadFetch,
    downloadFetch,
  );
}
