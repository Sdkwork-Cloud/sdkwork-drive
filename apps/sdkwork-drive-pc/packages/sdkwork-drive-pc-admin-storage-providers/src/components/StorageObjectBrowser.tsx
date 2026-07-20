import React, { useCallback, useState } from 'react';
import type { StorageProviderAdminService } from '../services/storageProviderAdminService';
import type { StorageProviderObjectView, StorageProviderView } from '../types/storageProviderAdminTypes';
import { formatDriveBytes } from 'sdkwork-drive-pc-commons';
import { formatMutationError } from '../utils/mutationError';
import { useTranslation } from '../hooks/useTranslation';
import { ConfirmDialog } from './ConfirmDialog';

interface StorageObjectBrowserProps {
  provider: StorageProviderView;
  service: StorageProviderAdminService;
}

export function StorageObjectBrowser({ provider, service }: StorageObjectBrowserProps) {
  const { t } = useTranslation();
  const [objects, setObjects] = useState<StorageProviderObjectView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const formatSize = formatDriveBytes;

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
      setError(formatMutationError(err, t('errorLoadObjects')));
    } finally {
      setLoading(false);
    }
  }, [provider.id, service, t]);

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
    setDeleteTarget(null);
    setLoading(true);
    setError(null);
    try {
      await service.deleteObject(provider.id, key);
      await loadObjects(currentPrefix);
    } catch (err) {
      setError(formatMutationError(err, t('errorDeleteObject')));
    } finally {
      setLoading(false);
    }
  }, [provider.id, currentPrefix, service, loadObjects, t]);

  return (
    <>
    <div className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#171717]">
      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={() => loadObjects('')} disabled={loading} className="rounded border px-2 py-1 text-xs">
          {t('root')}
        </button>
        {currentPrefix && (
          <button type="button" onClick={navigateUp} disabled={loading} className="rounded border px-2 py-1 text-xs">
            {t('up')}
          </button>
        )}
        <span className="font-mono text-xs text-neutral-500">/{currentPrefix}</span>
      </div>

      {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/20 dark:text-red-300">{error}</div>}

      {objects.length === 0 && !loading ? (
        <div className="py-8 text-center text-xs text-neutral-400">{t('empty')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="py-2 pr-4">{t('nameHeader')}</th>
                <th className="py-2 pr-4">{t('sizeHeader')}</th>
                <th className="py-2 pr-4">{t('modifiedHeader')}</th>
                <th className="py-2">{t('actHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {objects.map((obj) => (
                <tr key={obj.key} className="border-b border-neutral-100 dark:border-neutral-800">
                  <td className="py-2 pr-4 font-mono">
                    {obj.isFolder ? (
                      <button type="button" onClick={() => navigateToFolder(obj.key)} className="text-blue-600 hover:underline">
                        {obj.key.split('/').filter(Boolean).pop()}/
                      </button>
                    ) : (
                      obj.key.split('/').pop()
                    )}
                  </td>
                  <td className="py-2 pr-4">{obj.isFolder ? '-' : formatSize(obj.sizeBytes)}</td>
                  <td className="py-2 pr-4 text-neutral-400">{obj.lastModified ?? '-'}</td>
                  <td className="py-2">
                    {!obj.isFolder && (
                      <button type="button" onClick={() => setDeleteTarget(obj.key)} disabled={loading} className="text-red-600 hover:underline">
                        {t('del')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <button type="button" onClick={() => loadObjects(currentPrefix, pageToken ?? undefined)} disabled={loading} className="mt-3 text-xs text-blue-600 hover:underline">
          {t('loadMore')}
        </button>
      )}
    </div>
    <ConfirmDialog
      busy={loading}
      confirmLabel={t('del')}
      message={t('deleteObjectConfirm', { key: deleteTarget ?? '' })}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={() => { if (deleteTarget) void deleteObject(deleteTarget); }}
      open={deleteTarget !== null}
      title={t('del')}
      variant="danger"
    />
    </>
  );
}
