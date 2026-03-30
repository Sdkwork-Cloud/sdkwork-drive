import type { SdkworkAppClient } from '@sdkwork/app-sdk';

const SUCCESS_CODE = '2000';
const DEFAULT_UPLOAD_PATH = 'uploads';
const DEFAULT_UPLOAD_TYPE = 'OTHER';
const DEFAULT_UPLOAD_PROVIDER = 'AWS';
const DEFAULT_CONTENT_TYPE = 'application/octet-stream';
const VALID_UPLOAD_TYPES = new Set(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER']);
const VALID_UPLOAD_PROVIDERS = new Set(['VOLCENGINE', 'QCLOUD', 'ALIYUN', 'AWS', 'OTHER']);

type ApiEnvelope<T> = {
  code?: string | number;
  msg?: string;
  data?: T;
};

type PresignedData = {
  url?: string;
  previewUrl?: string;
  objectKey?: string;
  headers?: Record<string, string>;
};

type HttpClientLike = {
  post?: (path: string, body?: unknown) => Promise<unknown>;
};

type UploadApiLike = {
  getPresignedUrl?: (body: unknown) => Promise<unknown>;
  registerPresigned?: (body: unknown) => Promise<unknown>;
  registerPresignedUpload?: (body: unknown) => Promise<unknown>;
};

export interface UploadViaPresignedUrlInput {
  file: Blob | Uint8Array | ArrayBuffer | ArrayBufferView;
  fileName: string;
  contentType?: string;
  folderId?: string | number;
  path?: string;
  type?: string;
  provider?: string;
  bucket?: string;
}

export interface UploadViaPresignedUrlResult {
  presignedResult: ApiEnvelope<PresignedData>;
  registerResult: ApiEnvelope<unknown>;
  objectKey: string;
  uploadUrl: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object');
};

const isApiEnvelope = <T>(value: unknown): value is ApiEnvelope<T> => {
  return isRecord(value) && ('code' in value || 'msg' in value || 'data' in value);
};

const normalizeApiEnvelope = <T>(value: unknown): ApiEnvelope<T> => {
  if (isApiEnvelope<T>(value)) {
    return value;
  }
  return {
    code: SUCCESS_CODE,
    msg: 'OK',
    data: value as T
  };
};

const assertEnvelopeSuccess = (value: ApiEnvelope<unknown>, fallbackMessage: string): void => {
  const code = String(value.code ?? '').trim();
  if (code && code !== SUCCESS_CODE) {
    throw new Error(String(value.msg || fallbackMessage));
  }
};

const normalizeUploadType = (value?: string): string => {
  const normalized = String(value || DEFAULT_UPLOAD_TYPE).trim().toUpperCase();
  return VALID_UPLOAD_TYPES.has(normalized) ? normalized : DEFAULT_UPLOAD_TYPE;
};

const normalizeUploadProvider = (value?: string): string => {
  const normalized = String(value || DEFAULT_UPLOAD_PROVIDER).trim().toUpperCase();
  return VALID_UPLOAD_PROVIDERS.has(normalized) ? normalized : DEFAULT_UPLOAD_PROVIDER;
};

const normalizeUploadPath = (value?: string): string => {
  const normalized = String(value || DEFAULT_UPLOAD_PATH).trim().replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  const trimmed = normalized.replace(/^\/+|\/+$/g, '');
  return trimmed || DEFAULT_UPLOAD_PATH;
};

const sanitizeFileName = (value: string): string => {
  const normalized = String(value || '').trim().replace(/[\\/:*?"<>|]+/g, '-');
  return normalized || `upload-${Date.now()}.bin`;
};

const buildObjectKey = (fileName: string, uploadPath: string): string => {
  const safeName = sanitizeFileName(fileName);
  const random = Math.random().toString(36).slice(2, 10);
  return `${uploadPath}/${Date.now()}-${random}-${safeName}`;
};

const toBlob = (
  input: Blob | Uint8Array | ArrayBuffer | ArrayBufferView,
  contentType?: string
): { blob: Blob; size: number } => {
  if (input instanceof Blob) {
    return { blob: input, size: input.size };
  }
  if (input instanceof ArrayBuffer) {
    const blob = new Blob([input], { type: contentType || DEFAULT_CONTENT_TYPE });
    return { blob, size: input.byteLength };
  }
  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView;
    const bytes = new Uint8Array(view.byteLength);
    bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    const blob = new Blob([bytes], { type: contentType || DEFAULT_CONTENT_TYPE });
    return { blob, size: bytes.byteLength };
  }
  const typed = input as Uint8Array;
  const bytes = new Uint8Array(typed.byteLength);
  bytes.set(typed);
  const blob = new Blob([bytes], { type: contentType || DEFAULT_CONTENT_TYPE });
  return { blob, size: bytes.byteLength };
};

const normalizeFolderId = (value?: string | number): string | number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  if (!normalized || normalized === '0') {
    return undefined;
  }
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  return normalized;
};

export async function uploadViaPresignedUrl(
  client: SdkworkAppClient,
  input: UploadViaPresignedUrlInput
): Promise<UploadViaPresignedUrlResult> {
  const uploadApi = client.upload as unknown as UploadApiLike;
  if (!uploadApi || typeof uploadApi.getPresignedUrl !== 'function') {
    throw new Error('SDK upload API is unavailable: getPresignedUrl is required.');
  }

  const normalizedPath = normalizeUploadPath(input.path);
  const normalizedType = normalizeUploadType(input.type);
  const normalizedProvider = normalizeUploadProvider(input.provider);
  const normalizedName = sanitizeFileName(input.fileName);
  const normalizedFolderId = normalizeFolderId(input.folderId);
  const objectKey = buildObjectKey(normalizedName, normalizedPath);
  const explicitContentType = String(input.contentType || '').trim();
  const inferredBlobType = input.file instanceof Blob ? String(input.file.type || '').trim() : '';
  const contentType = explicitContentType || inferredBlobType || DEFAULT_CONTENT_TYPE;
  const { blob, size } = toBlob(input.file, contentType);

  const presignedRaw = await uploadApi.getPresignedUrl({
    objectKey,
    bucket: input.bucket,
    method: 'PUT'
  });
  const presignedResult = normalizeApiEnvelope<PresignedData>(presignedRaw);
  assertEnvelopeSuccess(presignedResult, 'Failed to get presigned upload URL.');

  const presignedData = presignedResult.data || {};
  const uploadUrl = String(presignedData.url || '').trim();
  if (!uploadUrl) {
    throw new Error('Presigned upload URL is empty.');
  }
  const finalObjectKey = String(presignedData.objectKey || objectKey).trim() || objectKey;
  const uploadHeaders = {
    ...(presignedData.headers || {}),
    ...(explicitContentType ? { 'Content-Type': explicitContentType } : {}),
  };

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: Object.keys(uploadHeaders).length > 0 ? uploadHeaders : undefined,
    body: blob
  });
  if (!uploadResponse.ok) {
    throw new Error(`Presigned upload failed: HTTP ${uploadResponse.status}.`);
  }

  const registerPayload: Record<string, unknown> = {
    objectKey: finalObjectKey,
    fileName: normalizedName,
    size,
    contentType,
    type: normalizedType,
    path: normalizedPath,
    provider: normalizedProvider
  };
  if (normalizedFolderId !== undefined) {
    registerPayload.folderId = normalizedFolderId;
  }
  if (String(input.bucket || '').trim()) {
    registerPayload.bucket = String(input.bucket).trim();
  }

  let registerRaw: unknown;
  if (typeof uploadApi.registerPresigned === 'function') {
    registerRaw = await uploadApi.registerPresigned(registerPayload);
  } else if (typeof uploadApi.registerPresignedUpload === 'function') {
    registerRaw = await uploadApi.registerPresignedUpload(registerPayload);
  } else {
    const http = (client as { http?: HttpClientLike }).http;
    if (!http || typeof http.post !== 'function') {
      throw new Error('SDK HTTP client is unavailable: cannot register presigned upload.');
    }
    registerRaw = await http.post('/app/v3/api/upload/register', registerPayload);
  }

  const registerResult = normalizeApiEnvelope(registerRaw);
  assertEnvelopeSuccess(registerResult, 'Failed to register uploaded file metadata.');

  return {
    presignedResult,
    registerResult,
    objectKey: finalObjectKey,
    uploadUrl
  };
}
