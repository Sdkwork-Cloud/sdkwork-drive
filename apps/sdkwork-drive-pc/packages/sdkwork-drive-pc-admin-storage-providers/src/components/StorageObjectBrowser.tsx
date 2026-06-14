import React, { useCallback, useState } from 'react';
import type { DriveAdminStorageSdkClient } from 'sdkwork-drive-pc-core';
import type { StorageProviderView } from '../types/storageProviderAdminTypes';

interface ObjectInfo {
  key: string;
  sizeBytes: number;
  contentType?: string;
  etag?: string;
  lastModified?: string;
  isFolder: boolean;
}

interface StorageObjectBrowserProps {
  provider: StorageProviderView;
  adminStorageSdkClient: DriveAdminStorageSdkClient;
}

export function StorageObjectBrowser({ provider, adminStorageSdkClient }: StorageObjectBrowserProps) {
  const [objects, setObjects] = useState<ObjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const loadObjects = useCallback(async (prefix: string, token?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminStorageSdkClient.request<{
        items: Array<{
          key: string;
          sizeBytes: number;
          contentType?: string;
          etag?: string;
          lastModifiedEpochMs?: number;
        }>;
        prefixes: string[];
        nextPageToken?: string;
      }>({
        operationId: 'storageProviders.objects.list',
        pathParams: { providerId: provider.id },
        query: {
          prefix: prefix || undefined,
          delimiter: '/',
          pageSize: 100,
          pageToken: token || undefined,
        },
      });

      const folders: ObjectInfo[] = (result.prefixes || []).map((p) => ({
        key: p,
        sizeBytes: 0,
        isFolder: true,
      }));

      const files: ObjectInfo[] = result.items.map((item) => ({
        key: item.key,
        sizeBytes: item.sizeBytes,
        contentType: item.contentType,
        etag: item.etag,
        lastModified: item.lastModifiedEpochMs ? new Date(item.lastModifiedEpochMs).toLocaleString() : undefined,
        isFolder: false,
      }));

      if (token) {
        setObjects((prev) => [...prev, ...folders, ...files]);
      } else {
        setObjects([...folders, ...files]);
      }

      setPageToken(result.nextPageToken || null);
      setHasMore(!!result.nextPageToken);
      setCurrentPrefix(prefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load objects');
    } finally {
      setLoading(false);
    }
  }, [provider.id, adminStorageSdkClient]);

  const navigateToFolder = (prefix: string) => {
    loadObjects(prefix);
  };

  const navigateUp = () => {
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    const parentPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
    loadObjects(parentPrefix);
  };

  const deleteObject = useCallback(async (key: string) => {
    if (!confirm(`Delete "${key}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await adminStorageSdkClient.request<{ providerId: string; objectKey: string; deleted: boolean }>({
        operationId: 'storageProviders.objects.delete',
        pathParams: { providerId: provider.id, objectKey: encodeURIComponent(key) },
      });
      await loadObjects(currentPrefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete object');
    } finally {
      setLoading(false);
    }
  }, [provider.id, currentPrefix, adminStorageSdkClient, loadObjects]);

  return (
    <div className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#171717]">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Object Browser
      </h3>

      {/* Navigation */}
      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => loadObjects('')}
          disabled={loading}
          className="px-2 py-1 text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200"
        >
          Root
        </button>
        {currentPrefix && (
          <button
            onClick={navigateUp}
            disabled={loading}
            className="px-2 py-1 text-xs border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200"
          >
            ↑ Up
          </button>
        )}
        <span className="text-xs text-neutral-500 font-mono">
          /{currentPrefix}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Object list */}
      <div className="border border-neutral-200 dark:border-neutral-700 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="grid grid-cols-[1fr_100px_150px_80px] gap-2 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 text-xs font-semibold text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
          <span>Name</span>
          <span className="text-right">Size</span>
          <span className="text-right">Modified</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Empty state */}
        {objects.length === 0 && !loading && (
          <div className="px-3 py-8 text-center text-xs text-neutral-400">
            {currentPrefix ? 'Empty folder' : 'No objects. Click "Root" to load.'}
          </div>
        )}

        {/* Objects */}
        {objects.map((obj) => (
          <div
            key={obj.key}
            className="grid grid-cols-[1fr_100px_150px_80px] gap-2 px-3 py-2 text-xs border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
          >
            <span className="truncate">
              {obj.isFolder ? (
                <button
                  onClick={() => navigateToFolder(obj.key)}
                  className="text-blue-600 hover:underline dark:text-blue-400 font-medium"
                >
                  📁 {obj.key.split('/').filter(Boolean).pop()}/
                </button>
              ) : (
                <span className="text-neutral-900 dark:text-neutral-100">
                  📄 {obj.key.split('/').pop()}
                </span>
              )}
            </span>
            <span className="text-right text-neutral-500">
              {obj.isFolder ? '-' : formatSize(obj.sizeBytes)}
            </span>
            <span className="text-right text-neutral-400">
              {obj.lastModified || '-'}
            </span>
            <span className="text-right">
              {!obj.isFolder && (
                <button
                  onClick={() => deleteObject(obj.key)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete
                </button>
              )}
            </span>
          </div>
        ))}

        {/* Load more */}
        {hasMore && (
          <div className="px-3 py-2 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => loadObjects(currentPrefix, pageToken || undefined)}
              disabled={loading}
              className="text-xs text-blue-600 hover:underline dark:text-blue-400 disabled:opacity-50"
            >
              Load more...
            </button>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="mt-2 text-xs text-neutral-500">Loading...</div>
      )}
    </div>
  );
}
