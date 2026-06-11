import React from 'react';
import type { StorageProviderView } from '../types/storageProviderAdminTypes';

interface StorageProviderTableProps {
  providers: StorageProviderView[];
  selectedProviderId?: string;
  onSelectProvider: (provider: StorageProviderView) => void;
  onEditProvider: (provider: StorageProviderView) => void;
  onActivateProvider: (providerId: string) => void;
  onDeactivateProvider: (providerId: string) => void;
  onTestProvider: (providerId: string) => void;
  onDeleteProvider: (providerId: string) => void;
  actionPending?: boolean;
}

export function StorageProviderTable({
  providers,
  selectedProviderId,
  onSelectProvider,
  onEditProvider,
  onActivateProvider,
  onDeactivateProvider,
  onTestProvider,
  onDeleteProvider,
  actionPending,
}: StorageProviderTableProps) {
  if (providers.length === 0) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center border border-dashed border-neutral-300 bg-white text-sm text-neutral-500 dark:border-neutral-800 dark:bg-[#171717] dark:text-neutral-400">
        No storage providers configured.
      </div>
    );
  }

  return (
    <div className="overflow-auto border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#171717]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-neutral-100 text-xs uppercase text-neutral-500 dark:bg-[#202020] dark:text-neutral-400">
          <tr>
            <th className="px-4 py-3 font-semibold">Provider</th>
            <th className="px-4 py-3 font-semibold">Endpoint</th>
            <th className="px-4 py-3 font-semibold">Bucket</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Credential</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {providers.map((provider) => {
            const selected = provider.id === selectedProviderId;
            return (
              <tr
                key={provider.id}
                className={selected ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-neutral-50 dark:hover:bg-[#202020]'}
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => onSelectProvider(provider)}
                  >
                    <span className="block font-semibold text-neutral-900 dark:text-neutral-100">
                      {provider.displayName || provider.id}
                    </span>
                    <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                      {provider.providerKind} · {provider.id}
                    </span>
                  </button>
                </td>
                <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                  {provider.endpointUrl || '--'}
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                  <span className="block">{provider.bucket || '--'}</span>
                  <span className="block text-xs text-neutral-500">{provider.region || 'default region'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold ${
                    provider.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'
                  }`}>
                    {provider.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-300">
                  {provider.credentialConfigured ? 'Configured' : 'Missing'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" className="text-xs font-semibold text-blue-600" onClick={() => onEditProvider(provider)}>
                      Edit
                    </button>
                    <button type="button" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300" disabled={actionPending} onClick={() => onTestProvider(provider.id)}>
                      Test
                    </button>
                    {provider.status === 'active' ? (
                      <button type="button" className="text-xs font-semibold text-amber-700" disabled={actionPending} onClick={() => onDeactivateProvider(provider.id)}>
                        Disable
                      </button>
                    ) : (
                      <button type="button" className="text-xs font-semibold text-emerald-700" disabled={actionPending} onClick={() => onActivateProvider(provider.id)}>
                        Enable
                      </button>
                    )}
                    <button type="button" className="text-xs font-semibold text-red-600" disabled={actionPending} onClick={() => onDeleteProvider(provider.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
