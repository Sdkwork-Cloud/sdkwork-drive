import {
  canCreateDriveFolderInSection,
  canUploadDriveFileToSection,
  type DriveFile,
} from 'sdkwork-drive-pc-types';
import type { DriveAdminStorageSdkClient } from '../sdk/driveAdminStorageSdkClient';
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

export type DriveStorageProviderKind =
  | 'local_filesystem'
  | 's3_compatible'
  | 'google_cloud_storage'
  | 'aliyun_oss'
  | 'tencent_cos'
  | 'huawei_obs'
  | 'volcengine_tos'
  | `custom:${string}`;

export interface DriveStorageProvider {
  id: string;
  providerKind: string;
  name: string;
  endpointUrl: string;
  region?: string;
  bucket: string;
  pathStyle: boolean;
  credentialRef?: string;
  serverSideEncryptionMode?: string;
  defaultStorageClass?: string;
  status: string;
  version: number;
  credentialConfigured: boolean;
}

export interface CreateDriveStorageProviderRequest {
  id: string;
  providerKind: DriveStorageProviderKind;
  name: string;
  endpointUrl: string;
  region?: string;
  bucket: string;
  pathStyle?: boolean;
  credentialRef?: string;
  serverSideEncryptionMode?: string;
  defaultStorageClass?: string;
  status?: string;
}

export interface UpdateDriveStorageProviderRequest {
  name?: string;
  endpointUrl?: string;
  region?: string;
  bucket?: string;
  pathStyle?: boolean;
  credentialRef?: string;
  serverSideEncryptionMode?: string;
  defaultStorageClass?: string;
  status?: string;
}

export interface DriveStorageProviderCapabilities {
  providerId: string;
  providerKind: string;
  supportsMultipartUpload: boolean;
  supportsPresignedUploadPart: boolean;
  supportsPresignedDownload: boolean;
  supportsServerSideEncryption: boolean;
  supportsStorageClass: boolean;
  supportsCredentialRotation: boolean;
  supportedServerSideEncryptionModes: string[];
  supportedStorageClasses: string[];
}

export interface DriveProviderBucket {
  providerId: string;
  bucket: string;
  exists: boolean;
}

export interface DriveProviderBucketMutation {
  providerId: string;
  bucket: string;
  changed: boolean;
}

export interface DriveProviderBucketListItem {
  bucket: string;
  configured: boolean;
  creationDateEpochMs?: number;
}

export interface DriveProviderBucketList {
  providerId: string;
  configuredBucket: string;
  items: DriveProviderBucketListItem[];
}

export interface DriveProviderObject {
  providerId: string;
  bucket: string;
  objectKey: string;
  contentLength: number;
  contentType?: string;
  etag?: string;
  versionId?: string;
  storageClass?: string;
  lastModifiedEpochMs?: number;
}

export interface DriveProviderObjectList {
  providerId: string;
  bucket: string;
  prefix?: string;
  items: DriveProviderObject[];
  nextPageToken?: string;
}

export interface ListDriveProviderObjectsRequest {
  prefix?: string;
  delimiter?: string;
  pageToken?: string;
  pageSize?: number;
}

export interface DriveProviderObjectMutation {
  providerId: string;
  bucket: string;
  objectKey: string;
  changed: boolean;
}

export interface CopyDriveProviderObjectRequest {
  sourceObjectKey: string;
  destinationObjectKey: string;
  destinationBucket?: string;
  metadataDirective?: 'COPY' | 'REPLACE';
}

export interface DriveStorageProviderBinding {
  id: string;
  tenantId: string;
  spaceId?: string;
  providerId: string;
  bindingScope: string;
  purpose: string;
  lifecycleStatus: string;
  version: number;
  storageProvider: DriveStorageProvider;
}

export interface DriveStorageProviderBindingScope {
  spaceId?: string;
}

export interface ListDriveStorageProviderBindingsRequest {
  spaceId?: string;
  providerId?: string;
  lifecycleStatus?: string;
}

export interface SetDriveStorageProviderBindingRequest {
  providerId: string;
  spaceId?: string;
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
}

export interface DriveFileWriteOptions {
  signal?: AbortSignal;
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
  getFolderDetails(folderId: string, options?: DriveFileReadOptions): Promise<DriveFile | undefined>;
  setFolderColor(folderId: string, color?: string, options?: DriveFileWriteOptions): Promise<void>;
  createFolder(
    name: string,
    section: string,
    parentId?: string | null,
    options?: DriveFileWriteOptions,
  ): Promise<DriveFile>;
  renameFile(id: string, newName: string, options?: DriveFileWriteOptions): Promise<void>;
  deleteFile(id: string, options?: DriveFileWriteOptions): Promise<void>;
  permanentlyDeleteFile(id: string, options?: DriveFileWriteOptions): Promise<void>;
  restoreFile(id: string, options?: DriveFileWriteOptions): Promise<void>;
  toggleStar(id: string, options?: DriveFileWriteOptions): Promise<boolean>;
  uploadFile(
    file: File,
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
  listStorageProviders(status?: string, options?: DriveFileReadOptions): Promise<DriveStorageProvider[]>;
  getStorageProvider(providerId: string, options?: DriveFileReadOptions): Promise<DriveStorageProvider>;
  createStorageProvider(
    request: CreateDriveStorageProviderRequest,
    options?: DriveFileWriteOptions,
  ): Promise<DriveStorageProvider>;
  updateStorageProvider(
    providerId: string,
    request: UpdateDriveStorageProviderRequest,
    options?: DriveFileWriteOptions,
  ): Promise<DriveStorageProvider>;
  deleteStorageProvider(providerId: string, options?: DriveFileWriteOptions): Promise<boolean>;
  testStorageProvider(providerId: string, options?: DriveFileWriteOptions): Promise<boolean>;
  getStorageProviderCapabilities(
    providerId: string,
    options?: DriveFileReadOptions,
  ): Promise<DriveStorageProviderCapabilities>;
  activateStorageProvider(providerId: string, options?: DriveFileWriteOptions): Promise<DriveStorageProvider>;
  deactivateStorageProvider(providerId: string, options?: DriveFileWriteOptions): Promise<DriveStorageProvider>;
  rotateStorageProviderCredential(
    providerId: string,
    credentialRef: string,
    options?: DriveFileWriteOptions,
  ): Promise<DriveStorageProvider>;
  headStorageProviderBucket(providerId: string, options?: DriveFileReadOptions): Promise<DriveProviderBucket>;
  createStorageProviderBucket(
    providerId: string,
    options?: DriveFileWriteOptions,
  ): Promise<DriveProviderBucketMutation>;
  deleteStorageProviderBucket(
    providerId: string,
    options?: DriveFileWriteOptions,
  ): Promise<DriveProviderBucketMutation>;
  listStorageProviderBuckets(
    providerId: string,
    options?: DriveFileReadOptions,
  ): Promise<DriveProviderBucketList>;
  listStorageProviderObjects(
    providerId: string,
    request?: ListDriveProviderObjectsRequest,
    options?: DriveFileReadOptions,
  ): Promise<DriveProviderObjectList>;
  headStorageProviderObject(
    providerId: string,
    objectKey: string,
    options?: DriveFileReadOptions,
  ): Promise<DriveProviderObject>;
  deleteStorageProviderObject(
    providerId: string,
    objectKey: string,
    options?: DriveFileWriteOptions,
  ): Promise<DriveProviderObjectMutation>;
  copyStorageProviderObject(
    providerId: string,
    request: CopyDriveProviderObjectRequest,
    options?: DriveFileWriteOptions,
  ): Promise<DriveProviderObjectMutation>;
  getDefaultStorageProviderBinding(
    scope?: DriveStorageProviderBindingScope,
    options?: DriveFileReadOptions,
  ): Promise<DriveStorageProviderBinding>;
  setDefaultStorageProviderBinding(
    request: SetDriveStorageProviderBindingRequest,
    options?: DriveFileWriteOptions,
  ): Promise<DriveStorageProviderBinding>;
  listStorageProviderBindings(
    request?: ListDriveStorageProviderBindingsRequest,
    options?: DriveFileReadOptions,
  ): Promise<DriveStorageProviderBinding[]>;
  deleteDefaultStorageProviderBinding(
    scope?: DriveStorageProviderBindingScope,
    options?: DriveFileWriteOptions,
  ): Promise<boolean>;
  listSharedSpaces(options?: DriveFileReadOptions): Promise<SharedSpace[]>;
  getSharedSpaces(): SharedSpace[];
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
  adminStorageSdkClient: DriveAdminStorageSdkClient;
  getSession: () => SessionSnapshot;
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
const KNOWLEDGE_BASE_SECTION_KEYWORDS: Record<string, string[]> = {
  'kb-engineering': ['engineering'],
  'kb-product': ['product'],
  'kb-design': ['design'],
};
const VIEW_SECTIONS = new Set([
  'recent',
  'starred',
  'shared',
  'trash',
  APP_SECTION_ID,
  'computers',
  ...Object.keys(KNOWLEDGE_BASE_SECTION_KEYWORDS),
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

function isKnowledgeBaseSection(section: string): boolean {
  return Object.prototype.hasOwnProperty.call(KNOWLEDGE_BASE_SECTION_KEYWORDS, section);
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

function responseToStorageProvider(response: unknown): DriveStorageProvider {
  const record = isRecord(response) ? response : {};
  const provider: DriveStorageProvider = {
    id: requiredStringField(record, 'storage provider id', 'id', 'providerId', 'provider_id'),
    providerKind: requiredStringField(record, 'storage provider kind', 'providerKind', 'provider_kind'),
    name: requiredStringField(record, 'storage provider name', 'name'),
    endpointUrl: requiredStringField(record, 'storage provider endpointUrl', 'endpointUrl', 'endpoint_url'),
    bucket: requiredStringField(record, 'storage provider bucket', 'bucket'),
    pathStyle: requiredBooleanField(record, 'storage provider pathStyle', 'pathStyle', 'path_style'),
    status: requiredStringField(record, 'storage provider status', 'status'),
    version: requiredNumberField(record, 'storage provider version', 'version'),
    credentialConfigured: requiredBooleanField(
      record,
      'storage provider credentialConfigured',
      'credentialConfigured',
      'credential_configured',
    ),
  };
  assignDefined(provider, 'region', stringField(record, 'region'));
  assignDefined(provider, 'credentialRef', stringField(record, 'credentialRef', 'credential_ref'));
  assignDefined(
    provider,
    'serverSideEncryptionMode',
    stringField(record, 'serverSideEncryptionMode', 'server_side_encryption_mode'),
  );
  assignDefined(
    provider,
    'defaultStorageClass',
    stringField(record, 'defaultStorageClass', 'default_storage_class'),
  );
  return provider;
}

function responseToStorageProviderCapabilities(response: unknown): DriveStorageProviderCapabilities {
  const record = isRecord(response) ? response : {};
  return {
    providerId: requiredStringField(record, 'storage provider capabilities providerId', 'providerId', 'provider_id'),
    providerKind: requiredStringField(record, 'storage provider capabilities providerKind', 'providerKind', 'provider_kind'),
    supportsMultipartUpload: requiredBooleanField(
      record,
      'storage provider capabilities supportsMultipartUpload',
      'supportsMultipartUpload',
      'supports_multipart_upload',
    ),
    supportsPresignedUploadPart: requiredBooleanField(
      record,
      'storage provider capabilities supportsPresignedUploadPart',
      'supportsPresignedUploadPart',
      'supports_presigned_upload_part',
    ),
    supportsPresignedDownload: requiredBooleanField(
      record,
      'storage provider capabilities supportsPresignedDownload',
      'supportsPresignedDownload',
      'supports_presigned_download',
    ),
    supportsServerSideEncryption: requiredBooleanField(
      record,
      'storage provider capabilities supportsServerSideEncryption',
      'supportsServerSideEncryption',
      'supports_server_side_encryption',
    ),
    supportsStorageClass: requiredBooleanField(
      record,
      'storage provider capabilities supportsStorageClass',
      'supportsStorageClass',
      'supports_storage_class',
    ),
    supportsCredentialRotation: requiredBooleanField(
      record,
      'storage provider capabilities supportsCredentialRotation',
      'supportsCredentialRotation',
      'supports_credential_rotation',
    ),
    supportedServerSideEncryptionModes: stringArrayField(
      record,
      'supportedServerSideEncryptionModes',
      'supported_server_side_encryption_modes',
    ),
    supportedStorageClasses: stringArrayField(record, 'supportedStorageClasses', 'supported_storage_classes'),
  };
}

function responseToProviderBucket(response: unknown): DriveProviderBucket {
  const record = isRecord(response) ? response : {};
  return {
    providerId: requiredStringField(record, 'provider bucket providerId', 'providerId', 'provider_id'),
    bucket: requiredStringField(record, 'provider bucket bucket', 'bucket'),
    exists: requiredBooleanField(record, 'provider bucket exists', 'exists'),
  };
}

function responseToProviderBucketMutation(response: unknown): DriveProviderBucketMutation {
  const record = isRecord(response) ? response : {};
  return {
    providerId: requiredStringField(record, 'provider bucket mutation providerId', 'providerId', 'provider_id'),
    bucket: requiredStringField(record, 'provider bucket mutation bucket', 'bucket'),
    changed: requiredBooleanField(record, 'provider bucket mutation changed', 'changed'),
  };
}

function responseToProviderBucketListItem(response: unknown): DriveProviderBucketListItem {
  const record = isRecord(response) ? response : {};
  const item: DriveProviderBucketListItem = {
    bucket: requiredStringField(record, 'provider bucket list item bucket', 'bucket'),
    configured: requiredBooleanField(
      record,
      'provider bucket list item configured',
      'configured',
    ),
  };
  assignDefined(
    item,
    'creationDateEpochMs',
    numberField(record, 'creationDateEpochMs', 'creation_date_epoch_ms'),
  );
  return item;
}

function responseToProviderBucketList(response: unknown): DriveProviderBucketList {
  const record = isRecord(response) ? response : {};
  return {
    providerId: requiredStringField(record, 'provider bucket list providerId', 'providerId', 'provider_id'),
    configuredBucket: requiredStringField(
      record,
      'provider bucket list configuredBucket',
      'configuredBucket',
      'configured_bucket',
    ),
    items: extractItems(record).map(responseToProviderBucketListItem),
  };
}

function responseToProviderObject(response: unknown): DriveProviderObject {
  const record = isRecord(response) ? response : {};
  const object: DriveProviderObject = {
    providerId: requiredStringField(record, 'provider object providerId', 'providerId', 'provider_id'),
    bucket: requiredStringField(record, 'provider object bucket', 'bucket'),
    objectKey: requiredStringField(record, 'provider object objectKey', 'objectKey', 'object_key'),
    contentLength: requiredNumberField(record, 'provider object contentLength', 'contentLength', 'content_length'),
  };
  assignDefined(object, 'contentType', stringField(record, 'contentType', 'content_type'));
  assignDefined(object, 'etag', stringField(record, 'etag'));
  assignDefined(object, 'versionId', stringField(record, 'versionId', 'version_id'));
  assignDefined(object, 'storageClass', stringField(record, 'storageClass', 'storage_class'));
  assignDefined(
    object,
    'lastModifiedEpochMs',
    numberField(record, 'lastModifiedEpochMs', 'last_modified_epoch_ms'),
  );
  return object;
}

function responseToProviderObjectList(response: unknown): DriveProviderObjectList {
  const record = isRecord(response) ? response : {};
  const list: DriveProviderObjectList = {
    providerId: requiredStringField(record, 'provider object list providerId', 'providerId', 'provider_id'),
    bucket: requiredStringField(record, 'provider object list bucket', 'bucket'),
    items: extractItems(record).map(responseToProviderObject),
  };
  assignDefined(list, 'prefix', stringField(record, 'prefix'));
  assignDefined(list, 'nextPageToken', stringField(record, 'nextPageToken', 'next_page_token'));
  return list;
}

function responseToProviderObjectMutation(response: unknown): DriveProviderObjectMutation {
  const record = isRecord(response) ? response : {};
  return {
    providerId: requiredStringField(record, 'provider object mutation providerId', 'providerId', 'provider_id'),
    bucket: requiredStringField(record, 'provider object mutation bucket', 'bucket'),
    objectKey: requiredStringField(record, 'provider object mutation objectKey', 'objectKey', 'object_key'),
    changed: requiredBooleanField(record, 'provider object mutation changed', 'changed'),
  };
}

function responseToStorageProviderBinding(response: unknown): DriveStorageProviderBinding {
  const record = isRecord(response) ? response : {};
  const binding: DriveStorageProviderBinding = {
    id: requiredStringField(record, 'storage provider binding id', 'id'),
    tenantId: requiredStringField(record, 'storage provider binding tenantId', 'tenantId', 'tenant_id'),
    providerId: requiredStringField(record, 'storage provider binding providerId', 'providerId', 'provider_id'),
    bindingScope: requiredStringField(
      record,
      'storage provider binding bindingScope',
      'bindingScope',
      'binding_scope',
    ),
    purpose: requiredStringField(record, 'storage provider binding purpose', 'purpose'),
    lifecycleStatus: requiredStringField(
      record,
      'storage provider binding lifecycleStatus',
      'lifecycleStatus',
      'lifecycle_status',
    ),
    version: requiredNumberField(record, 'storage provider binding version', 'version'),
    storageProvider: responseToStorageProvider(record.storageProvider ?? record.storage_provider),
  };
  assignDefined(binding, 'spaceId', stringField(record, 'spaceId', 'space_id'));
  return binding;
}

function responseToStorageProviderBindingList(response: unknown): DriveStorageProviderBinding[] {
  return extractItems(response).map(responseToStorageProviderBinding);
}

function responseToSharedSpace(response: unknown, overrides: Partial<SharedSpace> = {}): SharedSpace {
  const record = isRecord(response) ? response : {};
  const id = stringField(record, 'id', 'spaceId', 'space_id') || overrides.id || makeId('shared-space');
  const space: SharedSpace = {
    id,
    name: stringField(record, 'displayName', 'display_name', 'name') || overrides.name || id,
    icon: overrides.icon || 'Folder',
    color: overrides.color || 'blue',
    isCustom: true,
  };
  assignDefined(space, 'description', overrides.description || stringField(record, 'description'));
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

function matchesKnowledgeBaseSection(response: unknown, section: string): boolean {
  if (!isKnowledgeBaseSpace(response)) {
    return false;
  }

  const keywords = KNOWLEDGE_BASE_SECTION_KEYWORDS[section] ?? [];
  if (keywords.length === 0) {
    return true;
  }

  const record = isRecord(response) ? response : {};
  const searchableName = [
    stringField(record, 'id', 'spaceId', 'space_id'),
    stringField(record, 'displayName', 'display_name', 'name'),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return keywords.some((keyword) => searchableName.includes(keyword));
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
  adminStorageSdkClient: DriveAdminStorageSdkClient,
  getSession: () => SessionSnapshot,
  uploadFetch: typeof fetch = fetch,
  downloadFetch: typeof fetch = fetch,
): DriveFileService {
  const favoriteNodeIds = new Set<string>();
  const knownFiles = new Map<string, DriveFile>();
  const personalSpaceIds = new Map<string, string>();
  const gitRepositorySpaceIds = new Map<string, string>();
  let sharedSpacesCache: SharedSpace[] = [];

  const rememberFiles = (files: DriveFile[]): void => {
    for (const file of files) {
      knownFiles.set(file.id, file);
    }
  };

  const forgetFile = (id: string): void => {
    knownFiles.delete(id);
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
      const response = await appSdkClient.request<unknown>({
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
          tenantId: identity.tenantId,
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
        tenantId: identity.tenantId,
        subjectType: identity.subjectType,
        subjectId: identity.userId,
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
    const files = await Promise.all(
      extractItems(response).map(async (item) => {
        const file = await mapDecoratedNode(item, identity, {
          isStarred: options.starred,
        }, {
          signal: options.signal,
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
      }),
    );

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

  const listOwnedSpaces = async (
    identity: RemoteIdentity,
    options: DriveFileReadOptions = {},
  ): Promise<unknown[]> => {
    const response = await appSdkClient.request<unknown>({
      operationId: 'spaces.list',
      signal: options.signal,
      query: {
        tenantId: identity.tenantId,
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
      response = await appSdkClient.request<unknown>({
        operationId: 'spaces.create',
        signal: options.signal,
        body: {
          id: makeId('space'),
          tenantId: identity.tenantId,
          ownerSubjectType: identity.subjectType,
          ownerSubjectId: identity.userId,
          displayName: PERSONAL_SPACE_DISPLAY_NAME,
          spaceType: 'personal',
          operatorId: identity.actorId,
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
      response = await appSdkClient.request<unknown>({
        operationId: 'spaces.create',
        signal: options.signal,
        body: {
          id: makeId('space'),
          tenantId: identity.tenantId,
          ownerSubjectType: identity.subjectType,
          ownerSubjectId: identity.userId,
          displayName: GIT_REPOSITORY_SPACE_DISPLAY_NAME,
          spaceType: 'git_repository',
          operatorId: identity.actorId,
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

    if (section === 'computers') {
      return (await listOwnedSpaces(identity, options))
        .filter(isAppUploadSpace)
        .map(spaceIdFromSpace)
        .filter((spaceId): spaceId is string => Boolean(spaceId));
    }

    if (isKnowledgeBaseSection(section)) {
      return (await listOwnedSpaces(identity, options))
        .filter((space) => matchesKnowledgeBaseSection(space, section))
        .map(spaceIdFromSpace)
        .filter((spaceId): spaceId is string => Boolean(spaceId));
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

    if (section === 'computers') {
      throw new Error('No Drive app upload space is configured for the computers view.');
    }
    if (isKnowledgeBaseSection(section)) {
      throw new Error(`No Drive knowledge base space is configured for ${section}.`);
    }

    return normalizeSpaceId(section);
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
            tenantId: identity.tenantId,
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

  const uploadTextThroughUploader = async (
    blob: File,
    node: DriveFile,
    identity: RemoteIdentity,
    contentType: string,
    options: DriveFileWriteOptions = {},
  ): Promise<void> => {
    const spaceId = node.spaceId || spaceIdFromNode(await appSdkClient.request<unknown>({
      operationId: 'nodes.get',
      signal: options.signal,
      pathParams: { nodeId: node.id },
      query: {
        tenantId: identity.tenantId,
      },
    }));
    if (!spaceId) {
      throw new Error('Drive node storage space is required to save content.');
    }

    await appSdkClient.uploader.replaceNodeContent({
      file: blob,
      tenantId: identity.tenantId,
      userId: identity.userId,
      spaceId,
      nodeId: node.id,
      appId: 'drive-pc',
      appResourceType: 'desktop-file-editor',
      appResourceId: node.id,
      scene: 'drive_pc_text_save',
      source: 'pc_text_editor',
      uploadProfileCode: 'text',
      fileFingerprint: driveUploaderFingerprint(node.name, contentType, blob.size),
      originalFileName: node.name,
      contentType,
      operatorId: identity.actorId,
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
    file: File,
    section: string,
    parentId?: string | null,
    options?: DriveUploadFileOptions,
  ): Promise<DriveFile> => {
    assertCanUploadFileToSection(section);
    const identity = resolveIdentity(getSession);
    const contentType = file.type || getMimeTypeFromName(file.name);
    const spaceId = await resolvePrimarySpaceId(section, identity, options);
    const uploadResult = await appSdkClient.uploader.upload({
      file,
      tenantId: identity.tenantId,
      userId: identity.userId,
      appId: 'drive-pc',
      appResourceType: 'desktop-file-browser',
      appResourceId: section,
      scene: 'drive_pc_file_upload',
      source: 'pc_local_file',
      fileFingerprint: driveUploaderFingerprint(file.name, contentType, file.size),
      originalFileName: file.name,
      contentType,
      spaceId,
      parentNodeId: parentId || undefined,
      operatorId: identity.actorId,
      requestedPartTtlSeconds: DEFAULT_DOWNLOAD_TTL_SECONDS,
      uploadFetch,
      signal: options?.signal,
    });

    const uploadItem = uploadResult.uploadItem;
    const uploadedFile = mapNodeToDriveFile(
      {
        id: uploadItem.nodeId,
        tenantId: uploadItem.tenantId,
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
  };

  const service: DriveFileService = {
    async getAllWorkspaceFiles(options) {
      await service.listFiles('my-storage', undefined, undefined, options);
      return Array.from(knownFiles.values());
    },
    async getFolderPath(folderId, options) {
      const identity = resolveIdentity(getSession);
      const response = await appSdkClient.request<unknown>({
        operationId: 'nodes.path.get',
        signal: options?.signal,
        pathParams: { nodeId: folderId },
        query: {
          tenantId: identity.tenantId,
        },
      });
      const files = extractItems(response).map((item) => mapNodeToDriveFile(item, identity));
      rememberFiles(files);
      return files;
    },
    async listFiles(section, searchQuery, parentId, options) {
      const identity = resolveIdentity(getSession);

      if (searchQuery && VIEW_SECTIONS.has(section)) {
        const files = await service.listFiles(section, undefined, parentId, options);
        const term = searchQuery.trim().toLowerCase();
        return files.filter((file) => file.name.toLowerCase().includes(term));
      }

      if (searchQuery) {
        const spaceId = await resolvePrimarySpaceId(section, identity, options);
        const items = await requestPaginatedItems({
          operationId: 'search.query',
          signal: options?.signal,
          query: {
            tenantId: identity.tenantId,
            q: searchQuery,
            spaceId,
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        const favoriteIds = await listFavoriteNodeIds(identity, spaceId, options);
        return mapNodeList(items, identity, { parentId, favoriteIds, signal: options?.signal });
      }

      if (section === 'recent') {
        const items = await requestPaginatedItems({
          operationId: 'recent.list',
          signal: options?.signal,
          query: {
            tenantId: identity.tenantId,
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        const favoriteIds = await listFavoriteNodeIds(identity, undefined, options);
        return mapNodeList(items, identity, { favoriteIds, signal: options?.signal });
      }
      if (section === 'starred') {
        const items = await requestPaginatedItems({
          operationId: 'favorites.list',
          signal: options?.signal,
          query: {
            tenantId: identity.tenantId,
            subjectType: identity.subjectType,
            subjectId: identity.userId,
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        return mapNodeList(items, identity, { starred: true, signal: options?.signal });
      }
      if (section === 'shared') {
        const items = await requestPaginatedItems({
          operationId: 'sharedWithMe.list',
          signal: options?.signal,
          query: {
            tenantId: identity.tenantId,
            subjectType: identity.subjectType,
            subjectId: identity.userId,
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        const favoriteIds = await listFavoriteNodeIds(identity, undefined, options);
        return mapNodeList(items, identity, { favoriteIds, signal: options?.signal });
      }
      if (section === 'computers') {
        const spaceIds = await resolveSectionSpaceIds(section, identity, options);
        return listFilesFromSpaces(spaceIds, identity, parentId, options);
      }
      if (section === APP_SECTION_ID) {
        const spaceIds = await resolveSectionSpaceIds(section, identity, options);
        return listFilesFromSpaces(spaceIds, identity, parentId, options);
      }
      if (isKnowledgeBaseSection(section)) {
        const spaceIds = await resolveSectionSpaceIds(section, identity, options);
        return listFilesFromSpaces(spaceIds, identity, parentId, options);
      }
      if (section === 'trash') {
        const items = await requestPaginatedItems({
          operationId: 'trash.list',
          signal: options?.signal,
          query: {
            tenantId: identity.tenantId,
            pageSize: DEFAULT_PAGE_SIZE,
          },
        });
        return mapNodeList(items, identity, { signal: options?.signal });
      }

      const spaceId = await resolvePrimarySpaceId(section, identity, options);
      const items = await requestPaginatedItems({
        operationId: 'nodes.list',
        signal: options?.signal,
        pathParams: { spaceId },
        query: {
          tenantId: identity.tenantId,
          parentNodeId: parentId || undefined,
          pageSize: DEFAULT_PAGE_SIZE,
        },
      });
      const favoriteIds = await listFavoriteNodeIds(identity, spaceId, options);
      return mapNodeList(items, identity, { favoriteIds, signal: options?.signal });
    },
    async getFolderDetails(folderId, options) {
      const identity = resolveIdentity(getSession);
      const response = await appSdkClient.request<unknown>({
        operationId: 'nodes.get',
        signal: options?.signal,
        pathParams: { nodeId: folderId },
        query: {
        tenantId: identity.tenantId,
        },
      });
      const file = await mapDecoratedNode(response, identity, {}, options);
      rememberFiles([file]);
      return file;
    },
    async setFolderColor(folderId, color, options) {
      const identity = resolveIdentity(getSession);
      if (color) {
        await appSdkClient.request<unknown>({
          operationId: 'nodeProperties.set',
          signal: options?.signal,
          pathParams: {
            nodeId: folderId,
            propertyKey: FOLDER_COLOR_PROPERTY_KEY,
          },
          body: {
            tenantId: identity.tenantId,
            value: color,
            visibility: 'private',
            operatorId: identity.actorId,
          },
        });
        return;
      }

      await appSdkClient.request<unknown>({
        operationId: 'nodeProperties.delete',
        signal: options?.signal,
        pathParams: {
          nodeId: folderId,
          propertyKey: FOLDER_COLOR_PROPERTY_KEY,
        },
        query: {
          tenantId: identity.tenantId,
          visibility: 'private',
          operatorId: identity.actorId,
        },
      });
    },
    async createFolder(name, section, parentId, options) {
      assertCanCreateFolderInSection(section);
      const identity = resolveIdentity(getSession);
      const spaceId = await resolvePrimarySpaceId(section, identity, options);
      const response = await appSdkClient.request<unknown>({
        operationId: 'nodes.folders.create',
        signal: options?.signal,
        body: {
          id: makeId('folder'),
          tenantId: identity.tenantId,
          spaceId,
          parentNodeId: parentId || undefined,
          nodeName: name,
          operatorId: identity.actorId,
        },
      });
      const folder = await mapDecoratedNode(response, identity, {}, options);
      rememberFiles([folder]);
      return folder;
    },
    async renameFile(id, newName, options) {
      const identity = resolveIdentity(getSession);
      await appSdkClient.request<unknown>({
        operationId: 'nodes.update',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
          tenantId: identity.tenantId,
          nodeName: newName,
          operatorId: identity.actorId,
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
    async deleteFile(id, options) {
      const identity = resolveIdentity(getSession);
      await appSdkClient.request<unknown>({
        operationId: 'trash.move',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
          tenantId: identity.tenantId,
          operatorId: identity.actorId,
        },
      });
      favoriteNodeIds.delete(id);
      forgetFile(id);
    },
    async permanentlyDeleteFile(id, options) {
      const identity = resolveIdentity(getSession);
      await appSdkClient.request<unknown>({
        operationId: 'nodes.delete',
        signal: options?.signal,
        pathParams: { nodeId: id },
        query: {
          tenantId: identity.tenantId,
          operatorId: identity.actorId,
        },
      });
      favoriteNodeIds.delete(id);
      forgetFile(id);
    },
    async restoreFile(id, options) {
      const identity = resolveIdentity(getSession);
      await appSdkClient.request<unknown>({
        operationId: 'trash.restore',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
          tenantId: identity.tenantId,
          operatorId: identity.actorId,
        },
      });
      forgetFile(id);
    },
    async toggleStar(id, options) {
      const identity = resolveIdentity(getSession);
      if (favoriteNodeIds.has(id)) {
        const response = await appSdkClient.request<unknown>({
          operationId: 'favorites.delete',
          signal: options?.signal,
          pathParams: { nodeId: id },
          query: {
            tenantId: identity.tenantId,
            subjectType: identity.subjectType,
            subjectId: identity.userId,
            operatorId: identity.actorId,
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

      const response = await appSdkClient.request<unknown>({
        operationId: 'favorites.set',
        signal: options?.signal,
        pathParams: { nodeId: id },
        body: {
          tenantId: identity.tenantId,
          subjectType: identity.subjectType,
          subjectId: identity.userId,
          operatorId: identity.actorId,
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
      const response = await appSdkClient.request<unknown>({
        operationId: 'nodes.downloadUrls.create',
        signal: options?.signal,
        pathParams: { nodeId: file.id },
        query: {
          tenantId: identity.tenantId,
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

      const response = await downloadFetch(grant.downloadUrl, {
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
      const response = await appSdkClient.request<unknown>({
        operationId: 'archiveEntries.list',
        signal: options?.signal,
        pathParams: { nodeId: file.id },
        query: {
          tenantId: identity.tenantId,
        },
      });
      return extractItems(response).map(responseToArchiveEntry);
    },
    async extractArchiveEntries(file, entryPaths, options) {
      const identity = resolveIdentity(getSession);
      const response = await appSdkClient.request<unknown>({
        operationId: 'archiveEntries.extract',
        signal: options?.signal,
        pathParams: { nodeId: file.id },
        body: {
          tenantId: identity.tenantId,
          entryPaths: entryPaths?.length ? entryPaths : undefined,
          operatorId: identity.actorId,
        },
      });
      const files = extractItems(response).map((item) => mapNodeToDriveFile(item, identity));
      rememberFiles(files);
      return files;
    },
    async signPdfFile(file, options) {
      const identity = resolveIdentity(getSession);
      await appSdkClient.request<unknown>({
        operationId: 'nodeProperties.set',
        signal: options?.signal,
        pathParams: {
          nodeId: file.id,
          propertyKey: PDF_SIGNATURE_PROPERTY_KEY,
        },
        body: {
          tenantId: identity.tenantId,
          value: JSON.stringify({
            signatureType: 'metadata_acknowledgement',
            signedBy: identity.userId,
            signedByDisplayName: identity.ownerLabel,
            signedAt: new Date().toISOString(),
            fileName: file.name,
          }),
          visibility: 'private',
          operatorId: identity.actorId,
        },
      });
    },
    async createDownloadPackage(files, packageName, options) {
      const identity = resolveIdentity(getSession);
      const requestedTtlSeconds = options?.requestedTtlSeconds ?? DEFAULT_DOWNLOAD_TTL_SECONDS;
      const response = await appSdkClient.request<unknown>({
        operationId: 'downloadPackages.create',
        signal: options?.signal,
        body: {
          tenantId: identity.tenantId,
          nodeIds: files.map((file) => file.id),
          packageName,
          requestedTtlSeconds,
          operatorId: identity.actorId,
        },
      });
      return responseToDownloadPackage(response);
    },
    async getStorageSummary(options) {
      const identity = resolveIdentity(getSession);
      const response = await appSdkClient.request<unknown>({
        operationId: 'quotas.summary',
        signal: options?.signal,
        query: {
          tenantId: identity.tenantId,
        },
      });
      return responseToStorageSummary(response, identity);
    },
    async listStorageProviders(status, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.list',
        signal: options?.signal,
        query: {
          status,
        },
      });
      return extractItems(response).map(responseToStorageProvider);
    },
    async getStorageProvider(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.get',
        signal: options?.signal,
        pathParams: { providerId },
      });
      return responseToStorageProvider(response);
    },
    async createStorageProvider(request, options) {
      const identity = resolveIdentity(getSession);
      const body: JsonRecord = {
        id: request.id,
        providerKind: request.providerKind,
        name: request.name,
        endpointUrl: request.endpointUrl,
        bucket: request.bucket,
        operatorId: identity.actorId,
      };
      assignDefined(body, 'region', request.region);
      assignDefined(body, 'pathStyle', request.pathStyle);
      assignDefined(body, 'credentialRef', request.credentialRef);
      assignDefined(body, 'serverSideEncryptionMode', request.serverSideEncryptionMode);
      assignDefined(body, 'defaultStorageClass', request.defaultStorageClass);
      assignDefined(body, 'status', request.status);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.create',
        signal: options?.signal,
        body,
      });
      return responseToStorageProvider(response);
    },
    async updateStorageProvider(providerId, request, options) {
      const identity = resolveIdentity(getSession);
      const body: JsonRecord = {
        operatorId: identity.actorId,
      };
      assignDefined(body, 'name', request.name);
      assignDefined(body, 'endpointUrl', request.endpointUrl);
      assignDefined(body, 'region', request.region);
      assignDefined(body, 'bucket', request.bucket);
      assignDefined(body, 'pathStyle', request.pathStyle);
      assignDefined(body, 'credentialRef', request.credentialRef);
      assignDefined(body, 'serverSideEncryptionMode', request.serverSideEncryptionMode);
      assignDefined(body, 'defaultStorageClass', request.defaultStorageClass);
      assignDefined(body, 'status', request.status);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.update',
        signal: options?.signal,
        pathParams: { providerId },
        body,
      });
      return responseToStorageProvider(response);
    },
    async deleteStorageProvider(providerId, options) {
      const identity = resolveIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.delete',
        signal: options?.signal,
        pathParams: { providerId },
        query: {
          operatorId: identity.actorId,
        },
      });
      return requiredBooleanField(isRecord(response) ? response : {}, 'storage provider deleted', 'deleted');
    },
    async testStorageProvider(providerId, options) {
      const identity = resolveIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.test',
        signal: options?.signal,
        pathParams: { providerId },
        body: {
          operatorId: identity.actorId,
        },
      });
      return requiredBooleanField(isRecord(response) ? response : {}, 'storage provider reachable', 'reachable');
    },
    async getStorageProviderCapabilities(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.capabilities.get',
        signal: options?.signal,
        pathParams: { providerId },
      });
      return responseToStorageProviderCapabilities(response);
    },
    async activateStorageProvider(providerId, options) {
      const identity = resolveIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.activate',
        signal: options?.signal,
        pathParams: { providerId },
        body: {
          operatorId: identity.actorId,
        },
      });
      return responseToStorageProvider(response);
    },
    async deactivateStorageProvider(providerId, options) {
      const identity = resolveIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.deactivate',
        signal: options?.signal,
        pathParams: { providerId },
        body: {
          operatorId: identity.actorId,
        },
      });
      return responseToStorageProvider(response);
    },
    async rotateStorageProviderCredential(providerId, credentialRef, options) {
      const identity = resolveIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.credentials.rotate',
        signal: options?.signal,
        pathParams: { providerId },
        body: {
          credentialRef,
          operatorId: identity.actorId,
        },
      });
      return responseToStorageProvider(response);
    },
    async headStorageProviderBucket(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.bucket.head',
        signal: options?.signal,
        pathParams: { providerId },
      });
      return responseToProviderBucket(response);
    },
    async createStorageProviderBucket(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.bucket.create',
        signal: options?.signal,
        pathParams: { providerId },
      });
      return responseToProviderBucketMutation(response);
    },
    async deleteStorageProviderBucket(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.bucket.delete',
        signal: options?.signal,
        pathParams: { providerId },
      });
      return responseToProviderBucketMutation(response);
    },
    async listStorageProviderBuckets(providerId, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.buckets.list',
        signal: options?.signal,
        pathParams: { providerId },
      });
      return responseToProviderBucketList(response);
    },
    async listStorageProviderObjects(providerId, request = {}, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.objects.list',
        signal: options?.signal,
        pathParams: { providerId },
        query: {
          prefix: request.prefix,
          delimiter: request.delimiter,
          pageToken: request.pageToken,
          pageSize: request.pageSize,
        },
      });
      return responseToProviderObjectList(response);
    },
    async headStorageProviderObject(providerId, objectKey, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.objects.head',
        signal: options?.signal,
        pathParams: { providerId, objectKey },
      });
      return responseToProviderObject(response);
    },
    async deleteStorageProviderObject(providerId, objectKey, options) {
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.objects.delete',
        signal: options?.signal,
        pathParams: { providerId, objectKey },
      });
      return responseToProviderObjectMutation(response);
    },
    async copyStorageProviderObject(providerId, request, options) {
      const body: JsonRecord = {
        sourceObjectKey: request.sourceObjectKey,
        destinationObjectKey: request.destinationObjectKey,
      };
      assignDefined(body, 'destinationBucket', request.destinationBucket);
      assignDefined(body, 'metadataDirective', request.metadataDirective);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviders.objects.copy',
        signal: options?.signal,
        pathParams: { providerId },
        body,
      });
      return responseToProviderObjectMutation(response);
    },
    async getDefaultStorageProviderBinding(scope = {}, options) {
      const identity = resolveIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviderBindings.default.get',
        signal: options?.signal,
        query: {
          tenantId: identity.tenantId,
          spaceId: scope.spaceId,
        },
      });
      return responseToStorageProviderBinding(response);
    },
    async setDefaultStorageProviderBinding(request, options) {
      const identity = resolveIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviderBindings.default.set',
        signal: options?.signal,
        body: {
          tenantId: identity.tenantId,
          spaceId: request.spaceId,
          providerId: request.providerId,
          operatorId: identity.actorId,
        },
      });
      return responseToStorageProviderBinding(response);
    },
    async listStorageProviderBindings(request = {}, options) {
      const identity = resolveIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviderBindings.list',
        signal: options?.signal,
        query: {
          tenantId: identity.tenantId,
          spaceId: request.spaceId,
          providerId: request.providerId,
          lifecycleStatus: request.lifecycleStatus,
        },
      });
      return responseToStorageProviderBindingList(response);
    },
    async deleteDefaultStorageProviderBinding(scope = {}, options) {
      const identity = resolveIdentity(getSession);
      const response = await adminStorageSdkClient.request<unknown>({
        operationId: 'storageProviderBindings.default.delete',
        signal: options?.signal,
        query: {
          tenantId: identity.tenantId,
          spaceId: scope.spaceId,
          operatorId: identity.actorId,
        },
      });
      return requiredBooleanField(
        isRecord(response) ? response : {},
        'default storage provider binding deleted',
        'deleted',
      );
    },
    async listSharedSpaces(options) {
      const identity = resolveIdentity(getSession);
      const response = await appSdkClient.request<unknown>({
        operationId: 'spaces.list',
        signal: options?.signal,
        query: {
          tenantId: identity.tenantId,
          ownerSubjectType: identity.subjectType,
          ownerSubjectId: identity.userId,
        },
      });
      sharedSpacesCache = extractItems(response)
        .filter(isTeamSpace)
        .map((item) => responseToSharedSpace(item));
      return sharedSpacesCache;
    },
    getSharedSpaces: () => sharedSpacesCache,
    async createSharedSpace(name, icon, color, description, options) {
      const identity = resolveIdentity(getSession);
      const response = await appSdkClient.request<unknown>({
        operationId: 'spaces.create',
        signal: options?.signal,
        body: {
          id: makeId('space'),
          tenantId: identity.tenantId,
          ownerSubjectType: identity.subjectType,
          ownerSubjectId: identity.userId,
          displayName: name,
          spaceType: 'team',
          operatorId: identity.actorId,
        },
      });
      const created = responseToSharedSpace(response, {
        name,
      });
      sharedSpacesCache = [...sharedSpacesCache.filter((space) => space.id !== created.id), created];
      return created;
    },
    async deleteSharedSpace(id, options) {
      const identity = resolveIdentity(getSession);
      await appSdkClient.request<unknown>({
        operationId: 'spaces.delete',
        signal: options?.signal,
        pathParams: { spaceId: id },
        query: {
          tenantId: identity.tenantId,
          operatorId: identity.actorId,
        },
      });
      sharedSpacesCache = sharedSpacesCache.filter((space) => space.id !== id);
    },
  };

  return service;
}

export function createDriveFileService({
  appSdkClient,
  adminStorageSdkClient,
  getSession,
  uploadFetch,
  downloadFetch,
}: CreateDriveFileServiceOptions): DriveFileService {
  return createSdkBackedDriveFileService(
    appSdkClient,
    adminStorageSdkClient,
    getSession,
    uploadFetch,
    downloadFetch,
  );
}
