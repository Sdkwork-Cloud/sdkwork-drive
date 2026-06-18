import React, { useCallback, useState } from 'react';
import type { StorageProviderAdminService } from '../services/storageProviderAdminService';
import type { StorageProviderView } from '../types/storageProviderAdminTypes';

interface BucketInfo {
  name: string;
  exists: boolean;
  configured: boolean;
  creationDate?: string;
}

interface StorageBucketPanelProps {
  provider: StorageProviderView;
  service: StorageProviderAdminService;
}

export function StorageBucketPanel({ provider, service }: StorageBucketPanelProps) {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bucketExists, setBucketExists] = useState<boolean | null>(null);

  const loadBuckets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await service.listBuckets(provider.id);
      setBuckets(items.map((item) => ({
        name: item.name,
        exists: true,
        configured: item.configured,
        creationDate: item.creationDate,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buckets');
    } finally {
      setLoading(false);
    }
  }, [provider.id, service]);

  const checkBucket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await service.headBucket(provider.id);
      setBucketExists(result.exists);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check bucket');
    } finally {
      setLoading(false);
    }
  }, [provider.id, service]);

  const createBucket = useCallback(async () => {
    if (!confirm(`Create bucket "${provider.bucket}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await service.createBucket(provider.id);
      setBucketExists(true);
      await loadBuckets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bucket');
    } finally {
      setLoading(false);
    }
  }, [provider.id, provider.bucket, service, loadBuckets]);

  const deleteBucket = useCallback(async () => {
    if (!confirm(`Delete bucket "${provider.bucket}"? This will fail if the bucket is not empty.`)) return;
    setLoading(true);
    setError(null);
    try {
      await service.deleteBucket(provider.id);
      setBucketExists(false);
      setBuckets([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bucket');
    } finally {
      setLoading(false);
    }
  }, [provider.id, provider.bucket, service]);

  return (
    <div className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#171717]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bucket Management</h3>
        <button type="button" onClick={loadBuckets} disabled={loading} className="text-xs text-blue-600 hover:underline">
          Refresh
        </button>
      </div>

      {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="mb-3 rounded-md bg-neutral-50 p-3 dark:bg-neutral-800">
        <div className="text-xs text-neutral-500">Configured bucket</div>
        <div className="font-mono text-sm">{provider.bucket}</div>
        {bucketExists !== null && (
          <div className={`mt-1 text-xs ${bucketExists ? 'text-emerald-600' : 'text-red-600'}`}>
            {bucketExists ? 'Bucket exists' : 'Bucket does not exist'}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={checkBucket} disabled={loading} className="rounded border px-3 py-1.5 text-xs">
          Check Exists
        </button>
        <button type="button" onClick={createBucket} disabled={loading} className="rounded bg-emerald-600 px-3 py-1.5 text-xs text-white">
          Create Bucket
        </button>
        <button type="button" onClick={deleteBucket} disabled={loading} className="rounded bg-red-600 px-3 py-1.5 text-xs text-white">
          Delete Bucket
        </button>
      </div>

      {buckets.length > 0 && (
        <div className="mt-4 rounded border dark:border-neutral-700">
          {buckets.map((bucket) => (
            <div key={bucket.name} className="flex items-center justify-between border-b px-3 py-2 text-xs dark:border-neutral-800">
              <span>{bucket.name}</span>
              {bucket.creationDate && <span className="text-neutral-400">{bucket.creationDate}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
