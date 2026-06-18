import React, { useCallback, useState } from 'react';
import type { StorageProviderAdminService } from '../services/storageProviderAdminService';
import type { StorageProviderObjectView, StorageProviderView } from '../types/storageProviderAdminTypes';

interface StorageObjectBrowserProps {
  provider: StorageProviderView;
  service: StorageProviderAdminService;
}

export function StorageObjectBrowser({ provider, service }: StorageObjectBrowserProps) {
  const [objects, setObjects] = useState<StorageProviderObjectView[]>([]);
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
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const loadObjects = useCallback(async (prefix: string, token?: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await service.listObjects(provider.id, {
        prefix,
        pageToken: token,
      });
      if (token) {
        setObjects((prev) => [...prev, ...result.items]);
      } else {
        setObjects(result.items);
      }
      setPageToken(result.nextPageToken || null);
      setHasMore(result.hasMore);
      setCurrentPrefix(prefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load objects');
    } finally {
      setLoading(false);
    }
  }, [provider.id, service]);

  const navigateToFolder = (prefix: string) => {
    loadObjects(prefix);
  };

  const navigateUp = () => {
    const parts = currentPrefix.split('/').filter(Boolean);
    parts.pop();
    const parentPrefix = parts.length > 0 ? `${parts.join('/')}/` : '';
    loadObjects(parentPrefix);
  };

  const deleteObject = useCallback(async (key: string) => {
    if (!confirm(`Delete "${key}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await service.deleteObject(provider.id, key);
      await loadObjects(currentPrefix);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete object');
    } finally {
      setLoading(false);
    }
  }, [provider.id, currentPrefix, service, loadObjects]);

  return (
    <div className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#171717]">
      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={() => loadObjects('')} disabled={loading} className="rounded border px-2 py-1 text-xs">
          Root
        </button>
        {currentPrefix && (
          <button type="button" onClick={navigateUp} disabled={loading} className="rounded border px-2 py-1 text-xs">
            Up
          </button>
        )}
        <span className="font-mono text-xs text-neutral-500">/{currentPrefix}</span>
      </div>

      {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="max-h-[60vh] overflow-y-auto rounded border dark:border-neutral-700">
        {objects.length === 0 && !loading && (
          <div className="px-3 py-6 text-center text-xs text-neutral-400">No objects found</div>
        )}
        {objects.map((object) => (
          <div key={object.key} className="flex items-center justify-between border-b px-3 py-2 text-xs dark:border-neutral-800">
            <span className="truncate">
              {object.isFolder ? (
                <button type="button" onClick={() => navigateToFolder(object.key)} className="text-blue-600 hover:underline">
                  {object.key.split('/').filter(Boolean).pop()}/
                </button>
              ) : (
                object.key.split('/').pop()
              )}
            </span>
            <span className="text-neutral-500">{object.isFolder ? '-' : formatSize(object.sizeBytes)}</span>
            {!object.isFolder && (
              <button type="button" onClick={() => deleteObject(object.key)} className="text-red-600 hover:text-red-800">
                Delete
              </button>
            )}
          </div>
        ))}
        {hasMore && (
          <div className="border-t px-3 py-2 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => loadObjects(currentPrefix, pageToken || undefined)}
              disabled={loading}
              className="text-xs text-blue-600 hover:underline"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
