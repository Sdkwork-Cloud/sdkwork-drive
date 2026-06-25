export type StorageProviderKind =
  | 'local_filesystem'
  | 's3_compatible'
  | 'google_cloud_storage'
  | 'aliyun_oss'
  | 'tencent_cos'
  | 'huawei_obs'
  | 'volcengine_tos'
  | 'custom'
  | `custom:${string}`;

export type StorageProviderHealthStatus = 'unknown' | 'healthy' | 'degraded' | 'unreachable';

export interface StorageProviderView {
  id: string;
  providerKind: string;
  displayName: string;
  endpointUrl: string;
  region?: string;
  bucket: string;
  pathStyle: boolean;
  credentialRef?: string;
  credentialConfigured: boolean;
  serverSideEncryptionMode?: string;
  defaultStorageClass?: string;
  status: string;
  version: number;
  strictTls: boolean;
  healthStatus?: StorageProviderHealthStatus;
  lastHealthCheckAt?: number;
  objectCount?: number;
  totalSizeBytes?: number;
}

export interface StorageProviderCapabilitiesView {
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

export interface StorageProviderBindingView {
  id: string;
  tenantId: string;
  spaceId?: string;
  providerId: string;
  bindingScope: string;
  purpose: string;
  lifecycleStatus: string;
  version: number;
  storageRootPrefix?: string;
  storageProvider?: StorageProviderView;
}

export interface StorageProviderBucketView {
  providerId: string;
  bucket: string;
  exists: boolean;
}

export interface CreateStorageProviderInput {
  id: string;
  providerKind: StorageProviderKind;
  name: string;
  endpointUrl: string;
  region?: string;
  bucket: string;
  pathStyle?: boolean;
  credentialRef?: string;
  serverSideEncryptionMode?: string;
  defaultStorageClass?: string;
  status?: string;
  strictTls?: boolean;
}

export interface UpdateStorageProviderInput {
  name?: string;
  endpointUrl?: string;
  region?: string;
  bucket?: string;
  pathStyle?: boolean;
  credentialRef?: string;
  serverSideEncryptionMode?: string;
  defaultStorageClass?: string;
  status?: string;
  strictTls?: boolean;
}

export interface ListStorageProvidersInput {
  status?: string;
  signal?: AbortSignal;
}

export interface SetDefaultStorageProviderBindingInput {
  providerId: string;
  spaceId?: string;
  spaceType?: string;
  storageRootPrefix?: string;
  signal?: AbortSignal;
}

export interface StorageProviderBucketListItemView {
  name: string;
  configured: boolean;
  creationDate?: string;
}

export interface StorageProviderObjectView {
  key: string;
  sizeBytes: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
  isFolder: boolean;
}

export interface ListStorageProviderObjectsInput {
  prefix?: string;
  pageToken?: string;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface ListStorageProviderObjectsResult {
  items: StorageProviderObjectView[];
  nextPageToken?: string;
  hasMore: boolean;
}

export interface StorageProviderMutationOptions {
  signal?: AbortSignal;
}
