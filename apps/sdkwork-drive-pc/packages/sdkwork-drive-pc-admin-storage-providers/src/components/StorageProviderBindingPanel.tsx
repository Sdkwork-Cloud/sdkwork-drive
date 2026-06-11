import React, { useState } from 'react';
import type { StorageProviderBindingView, StorageProviderView } from '../types/storageProviderAdminTypes';

const inputClassName = 'h-9 border border-neutral-300 bg-white px-2 text-sm text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-[#111] dark:text-neutral-100';

interface StorageProviderBindingPanelProps {
  providers: StorageProviderView[];
  binding?: StorageProviderBindingView;
  onSetDefaultBinding: (providerId: string, spaceId?: string) => void;
  onDeleteDefaultBinding: (spaceId?: string) => void;
  pending?: boolean;
}

export function StorageProviderBindingPanel({
  providers,
  binding,
  onSetDefaultBinding,
  onDeleteDefaultBinding,
  pending,
}: StorageProviderBindingPanelProps) {
  const [providerId, setProviderId] = useState('');
  const [spaceId, setSpaceId] = useState('');

  return (
    <section className="border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#171717]">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Default binding</h2>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        Bind a tenant or space to the provider used for new Drive storage objects.
      </p>
      <div className="mt-3 text-xs text-neutral-600 dark:text-neutral-300">
        Current: {binding?.providerId ? `${binding.providerId}${binding.spaceId ? ` for ${binding.spaceId}` : ' for tenant default'}` : 'not configured'}
      </div>
      <div className="mt-4 grid grid-cols-[1fr_1fr_auto_auto] gap-2">
        <select value={providerId} onChange={(event) => setProviderId(event.target.value)} className={inputClassName}>
          <option value="">Choose provider</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>{provider.displayName || provider.id}</option>
          ))}
        </select>
        <input value={spaceId} onChange={(event) => setSpaceId(event.target.value)} className={inputClassName} placeholder="Optional space id" />
        <button type="button" disabled={pending || !providerId} onClick={() => onSetDefaultBinding(providerId, spaceId || undefined)} className="bg-neutral-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900">
          Set
        </button>
        <button type="button" disabled={pending} onClick={() => onDeleteDefaultBinding(spaceId || undefined)} className="border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-200">
          Clear
        </button>
      </div>
    </section>
  );
}
