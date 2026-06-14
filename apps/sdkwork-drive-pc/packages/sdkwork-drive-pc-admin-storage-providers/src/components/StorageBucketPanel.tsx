import React, { useCallback, useState } from 'react';
import type { DriveAdminStorageSdkClient } from 'sdkwork-drive-pc-core';
import type { StorageProviderView } from '../types/storageProviderAdminTypes';

interface BucketInfo {
  name: string;
  exists: boolean;
  configured: boolean;
  creationDate?: string;
}

interface StorageBucketPanelProps {
  provider: StorageProviderView;
  adminStorageSdkClient: DriveAdminStorageSdkClient;
}

export function StorageBucketPanel({ provider, adminStorageSdkClient }: StorageBucketPanelProps) {
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bucketExists, setBucketExists] = useState<boolean | null>(null);

  const loadBuckets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminStorageSdkClient.request<{ providerId: string; configuredBucket: string; items: Array<{ name: string; configured: boolean; creationDateEpochMs?: number }> }>({
        operationId: 'storageProviders.buckets.list',
        pathParams: { providerId: provider.id },
      });
      setBuckets(result.items.map((item) => ({
        name: item.name,
        exists: true,
        configured: item.configured,
        creationDate: item.creationDateEpochMs ? new Date(item.creationDateEpochMs).toLocaleDateString() : undefined,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load buckets');
    } finally {
      setLoading(false);
    }
  }, [provider.id, adminStorageSdkClient]);

  const checkBucket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminStorageSdkClient.request<{ providerId: string; bucket: string; exists: boolean }>({
        operationId: 'storageProviders.bucket.head',
        pathParams: { providerId: provider.id },
      });
      setBucketExists(result.exists);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check bucket');
    } finally {
      setLoading(false);
    }
  }, [provider.id, adminStorageSdkClient]);

  const createBucket = useCallback(async () => {
    if (!confirm(`Create bucket "${provider.bucket}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await adminStorageSdkClient.request<{ providerId: string; bucket: string; changed: boolean }>({
        operationId: 'storageProviders.bucket.create',
        pathParams: { providerId: provider.id },
      });
      setBucketExists(true);
      await loadBuckets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bucket');
    } finally {
      setLoading(false);
    }
  }, [provider.id, provider.bucket, adminStorageSdkClient, loadBuckets]);

  const deleteBucket = useCallback(async () => {
    if (!confirm(`Delete bucket "${provider.bucket}"? This will fail if the bucket is not empty.`)) return;
    setLoading(true);
    setError(null);
    try {
      await adminStorageSdkClient.request<{ providerId: string; bucket: string; changed: boolean }>({
        operationId: 'storageProviders.bucket.delete',
        pathParams: { providerId: provider.id },
      });
      setBucketExists(false);
      setBuckets([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bucket');
    } finally {
      setLoading(false);
    }
  }, [provider.id, provider.bucket, adminStorageSdkClient]);

  return (
    <div className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#171717]">
      <h3 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        Bucket Management
      </h3>

      {/* Current bucket info */}
      <div className="mb-3 rounded bg-neutral-50 p-3 dark:bg-neutral-900">
        <div className="text-xs text-neutral-500">Configured bucket</div>
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{provider.bucket}</div>
        {bucketExists !== null && (
          <div className={`mt-1 text-xs ${bucketExists ? 'text-green-600' : 'text-red-600'}`}>
            {bucketExists ? '✓ Exists' : '✗ Does not exist'}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          onClick={checkBucket}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Check exists
        </button>
        <button
          onClick={createBucket}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
        >
          Create bucket
        </button>
        <button
          onClick={deleteBucket}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
        >
          Delete bucket
        </button>
        <button
          onClick={loadBuckets}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium border border-neutral-300 text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          List all buckets
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded bg-red-50 p-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Bucket list */}
      {buckets.length > 0 && (
        <div className="border-t border-neutral-200 pt-3 dark:border-neutral-700">
          <div className="text-xs font-semibold text-neutral-500 mb-2">Available Buckets</div>
          <div className="max-h-48 overflow-y-auto">
            {buckets.map((bucket) => (
              <div
                key={bucket.name}
                className={`flex items-center justify-between py-1.5 px-2 text-xs ${
                  bucket.configured
                    ? 'bg-blue-50 dark:bg-blue-900/20 font-medium'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                }`}
              >
                <span className="text-neutral-900 dark:text-neutral-100">
                  {bucket.name}
                  {bucket.configured && <span className="ml-2 text-blue-600 dark:text-blue-400">(configured)</span>}
                </span>
                {bucket.creationDate && (
                  <span className="text-neutral-400">{bucket.creationDate}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="mt-2 text-xs text-neutral-500">Loading...</div>
      )}
    </div>
  );
}
