import React from 'react';
import type {
  StorageProviderBucketView,
  StorageProviderCapabilitiesView,
  StorageProviderView,
} from '../types/storageProviderAdminTypes';

interface StorageProviderDiagnosticsPanelProps {
  provider?: StorageProviderView;
  capabilities?: StorageProviderCapabilitiesView;
  bucket?: StorageProviderBucketView;
  onLoadCapabilities: (providerId: string) => void;
  onHeadBucket: (providerId: string) => void;
  pending?: boolean;
}

export function StorageProviderDiagnosticsPanel({
  provider,
  capabilities,
  bucket,
  onLoadCapabilities,
  onHeadBucket,
  pending,
}: StorageProviderDiagnosticsPanelProps) {
  return (
    <section className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#171717]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Diagnostics</h2>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Inspect provider capabilities and configured bucket reachability.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" disabled={!provider || pending} onClick={() => provider && onLoadCapabilities(provider.id)} className="border border-neutral-300 px-3 py-2 text-xs font-semibold dark:border-neutral-700">
            Capabilities
          </button>
          <button type="button" disabled={!provider || pending} onClick={() => provider && onHeadBucket(provider.id)} className="border border-neutral-300 px-3 py-2 text-xs font-semibold dark:border-neutral-700">
            Head bucket
          </button>
        </div>
      </div>
      {!provider ? (
        <p className="mt-4 text-xs text-neutral-500">Select a provider to run diagnostics.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <Diagnostic label="Selected provider" value={provider.id} />
          <Diagnostic label="Bucket exists" value={bucket ? String(bucket.exists) : '--'} />
          <Diagnostic label="Multipart upload" value={capabilities ? String(capabilities.supportsMultipartUpload) : '--'} />
          <Diagnostic label="Presigned download" value={capabilities ? String(capabilities.supportsPresignedDownload) : '--'} />
          <Diagnostic label="Credential rotation" value={capabilities ? String(capabilities.supportsCredentialRotation) : '--'} />
          <Diagnostic label="Storage classes" value={capabilities?.supportedStorageClasses.join(', ') || '--'} />
        </div>
      )}
    </section>
  );
}

function Diagnostic({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-100 p-3 dark:border-neutral-800">
      <span className="block text-neutral-500">{label}</span>
      <span className="mt-1 block font-mono text-neutral-900 dark:text-neutral-100">{value}</span>
    </div>
  );
}
