import type { DownloadGrantLike, DownloadJob } from 'sdkwork-drive-pc-types';
import {
  applyDownloadCompletionToJob,
  applyDownloadGrantToJob,
  applyDownloadProgressToJob,
  applyTransferFailure,
  resolveTransferOpenUrl,
} from 'sdkwork-drive-pc-types';

export interface ExecuteDownloadTransferOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  onProgress?: (downloadedBytes: number, totalBytes: number) => void;
}

export interface ExecuteDownloadTransferResult {
  blob: Blob;
  fileName: string;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true;
  }
  return error instanceof Error && (error.name === 'AbortError' || /\babort(?:ed)?\b/i.test(error.message));
}

export async function executeDownloadTransfer(
  job: DownloadJob,
  grant: DownloadGrantLike,
  options: ExecuteDownloadTransferOptions = {},
): Promise<ExecuteDownloadTransferResult> {
  const url = resolveTransferOpenUrl(grant);
  if (!url) {
    throw new Error('Download grant did not include a URL.');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    method: grant.method || job.downloadMethod || 'GET',
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Download failed with status ${response.status}.`);
  }

  const headerLength = Number(response.headers.get('content-length'));
  const expectedTotal =
    (Number.isFinite(headerLength) && headerLength > 0 ? headerLength : 0) ||
    grant.archiveSizeBytes ||
    grant.totalBytes ||
    job.totalSize ||
    0;

  const reader = response.body?.getReader();
  if (!reader) {
    const blob = await response.blob();
    options.onProgress?.(blob.size, blob.size || expectedTotal);
    return {
      blob,
      fileName: job.fileName,
    };
  }

  const chunks: BlobPart[] = [];
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    receivedBytes += value.byteLength;
    options.onProgress?.(receivedBytes, expectedTotal || receivedBytes);
  }

  const blob = new Blob(chunks, {
    type: response.headers.get('content-type') || job.mimeType || 'application/octet-stream',
  });
  options.onProgress?.(blob.size, blob.size || expectedTotal);
  return {
    blob,
    fileName: job.fileName,
  };
}

export function triggerBrowserDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export interface RunManagedDownloadTransferParams {
  job: DownloadJob;
  grant: DownloadGrantLike;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  onJobUpdate: (updater: (current: DownloadJob) => DownloadJob) => void;
  onOpenExternal?: (url: string) => void | Promise<void>;
  saveDownload?: (fileName: string, blob: Blob) => Promise<boolean>;
}

export async function runManagedDownloadTransfer(
  params: RunManagedDownloadTransferParams,
): Promise<void> {
  const { job, grant, signal, fetchImpl, onJobUpdate, onOpenExternal, saveDownload } = params;
  const openUrl = resolveTransferOpenUrl(grant);

  onJobUpdate(() => applyDownloadGrantToJob(job, grant));

  if (!openUrl) {
    onJobUpdate((current) =>
      applyTransferFailure(current, 'Download grant did not include a URL.'),
    );
    return;
  }

  try {
    const { blob, fileName } = await executeDownloadTransfer(applyDownloadGrantToJob(job, grant), grant, {
      signal,
      fetchImpl,
      onProgress: (downloadedBytes, totalBytes) => {
        onJobUpdate((current) => applyDownloadProgressToJob(current, downloadedBytes, totalBytes));
      },
    });
    if (saveDownload) {
      const saved = await saveDownload(fileName, blob);
      if (!saved) {
        onJobUpdate((current) => ({
          ...applyDownloadProgressToJob(current, blob.size, blob.size),
          status: 'ready',
          speed: 'Ready',
          timeRemaining: 'Save cancelled',
        }));
        return;
      }
    } else {
      triggerBrowserDownload(blob, fileName);
    }
    onJobUpdate((current) => applyDownloadCompletionToJob(current, blob.size));
  } catch (error) {
    if (isAbortError(error)) {
      return;
    }

    if (onOpenExternal) {
      try {
        onJobUpdate((current) => applyDownloadCompletionToJob(current));
        await onOpenExternal(openUrl);
        return;
      } catch {
        // Fall through to failure state when external open also fails.
      }
    }

    onJobUpdate((current) =>
      applyTransferFailure(
        current,
        error instanceof Error ? error.message : 'Download transfer failed',
      ),
    );
  }
}
