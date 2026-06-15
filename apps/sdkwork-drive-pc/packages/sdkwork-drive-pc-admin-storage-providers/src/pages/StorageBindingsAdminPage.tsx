import React, { useEffect, useMemo, useState } from 'react';
import type { DriveAdminStorageSdkClient, SessionSnapshot } from 'sdkwork-drive-pc-core';
import {
  createStorageProviderAdminService,
  type StorageProviderAdminService,
} from '../services/storageProviderAdminService';
import type { StorageProviderBindingView, StorageProviderView } from '../types/storageProviderAdminTypes';
import { SPACE_TYPES, getSpaceTypeMeta } from '../utils/spaceTypeConfig';
import { getProviderKindMeta } from '../utils/providerKindConfig';
import { PRIMARY_BUTTON_CLASS, SELECT_CLASS, CARD_CLASS, BADGE_BASE_CLASS } from '../utils/uiPrimitives';
import { useTranslation } from '../hooks/useTranslation';

interface StorageBindingsAdminPageProps {
  adminStorageSdkClient: DriveAdminStorageSdkClient;
  getSession: () => SessionSnapshot;
}

interface SpaceTypeBinding {
  spaceType: string;
  providerId: string;
  bucket: string;
  bindingId?: string;
  configured: boolean;
}

export function StorageBindingsAdminPage({
  adminStorageSdkClient,
  getSession,
}: StorageBindingsAdminPageProps) {
  const { t } = useTranslation();
  const service = useMemo<StorageProviderAdminService>(
    () => createStorageProviderAdminService({ adminStorageSdkClient, getSession }),
    [adminStorageSdkClient, getSession],
  );

  const [providers, setProviders] = useState<StorageProviderView[]>([]);
  const [bindings, setBindings] = useState<StorageProviderBindingView[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [editProviderId, setEditProviderId] = useState('');
  const [editBucket, setEditBucket] = useState('');

  const activeProviders = providers.filter((p) => p.status === 'active');

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    Promise.all([
      service.listProviders({ signal }),
      service.listBindings({ signal }),
    ])
      .then(([p, b]) => { setProviders(p); setBindings(b); })
      .catch((err) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setNotice({ type: 'error', message: 'Failed to load storage bindings.' });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const c = new AbortController();
    load(c.signal);
    return () => c.abort();
  }, [service]);

  const spaceTypeBindings: SpaceTypeBinding[] = useMemo(() => {
    return SPACE_TYPES.map((st) => {
      const binding = bindings.find(
        (b) => b.bindingScope === 'space_type' && b.purpose === st.value && b.lifecycleStatus === 'active',
      );
      if (binding) {
        return {
          spaceType: st.value,
          providerId: binding.providerId,
          bucket: binding.storageProvider?.bucket ?? '',
          bindingId: binding.id,
          configured: true,
        };
      }
      return {
        spaceType: st.value,
        providerId: '',
        bucket: '',
        configured: false,
      };
    });
  }, [bindings]);

  const handleEdit = (spaceType: string) => {
    const existing = spaceTypeBindings.find((b) => b.spaceType === spaceType);
    setEditingType(spaceType);
    setEditProviderId(existing?.providerId ?? (activeProviders[0]?.id ?? ''));
    setEditBucket(existing?.bucket ?? '');
  };

  const handleSave = async () => {
    if (!editingType || !editProviderId) return;
    setPending(true);
    setNotice(null);
    try {
      const existing = spaceTypeBindings.find((b) => b.spaceType === editingType);
      if (existing?.bindingId) {
        await service.deleteDefaultBinding(existing.bindingId);
      }
      await service.setDefaultBinding({ providerId: editProviderId, spaceId: undefined });
      setNotice({ type: 'success', message: `Storage binding for "${getSpaceTypeMeta(editingType).label}" saved.` });
      setEditingType(null);
      load();
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save binding.' });
    } finally {
      setPending(false);
    }
  };

  const handleClear = async (spaceType: string) => {
    const existing = spaceTypeBindings.find((b) => b.spaceType === spaceType);
    if (!existing?.bindingId) return;
    setPending(true);
    setNotice(null);
    try {
      await service.deleteDefaultBinding(existing.bindingId);
      setNotice({ type: 'success', message: `Storage binding for "${getSpaceTypeMeta(spaceType).label}" cleared.` });
      load();
    } catch (err) {
      setNotice({ type: 'error', message: err instanceof Error ? err.message : 'Failed to clear binding.' });
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Storage bindings</h1>
            <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
              Assign storage providers to each space type. Files created in a space type use its assigned provider.
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {notice && (
          <div className={`mb-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
          }`}>
            <span className="flex-1">{notice.message}</span>
            <button type="button" className="text-current opacity-50 hover:opacity-100" onClick={() => setNotice(null)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              Loading...
            </div>
          </div>
        ) : (
          <div className={CARD_CLASS}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                <tr>
                  <th className="px-5 py-3 font-semibold">Space Type</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Storage Provider</th>
                  <th className="px-5 py-3 font-semibold">Bucket</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {spaceTypeBindings.map((binding) => {
                  const stMeta = getSpaceTypeMeta(binding.spaceType);
                  const provider = providers.find((p) => p.id === binding.providerId);
                  const providerMeta = provider ? getProviderKindMeta(provider.providerKind) : null;
                  const isEditing = editingType === binding.spaceType;

                  return (
                    <tr key={binding.spaceType} className={isEditing ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}>
                      {/* Space Type */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm ${stMeta.bgClass}`}>
                            {stMeta.icon}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{stMeta.label}</div>
                            <div className="font-mono text-[10px] text-neutral-500">{binding.spaceType}</div>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-3">
                        <span className="text-xs text-neutral-600 dark:text-neutral-400">{stMeta.description}</span>
                        {stMeta.isSystem && (
                          <span className="ml-2 inline-flex items-center rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">System</span>
                        )}
                      </td>

                      {/* Provider */}
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <select
                            value={editProviderId}
                            onChange={(e) => {
                              setEditProviderId(e.target.value);
                              const p = providers.find((pr) => pr.id === e.target.value);
                              if (p) setEditBucket(p.bucket);
                            }}
                            className="h-8 w-full max-w-[220px] rounded-md border border-neutral-300 px-2 text-xs dark:border-neutral-600 dark:bg-neutral-800"
                          >
                            {activeProviders.map((p) => (
                              <option key={p.id} value={p.id}>{p.displayName}</option>
                            ))}
                          </select>
                        ) : binding.configured && provider && providerMeta ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${providerMeta.bgClass} ${providerMeta.textClass}`}>
                              {providerMeta.icon}
                            </span>
                            <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{provider.displayName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400">Not assigned</span>
                        )}
                      </td>

                      {/* Bucket */}
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <input
                            value={editBucket}
                            onChange={(e) => setEditBucket(e.target.value)}
                            className="h-8 w-full max-w-[180px] rounded-md border border-neutral-300 px-2 font-mono text-xs dark:border-neutral-600 dark:bg-neutral-800"
                            placeholder="Bucket name"
                          />
                        ) : binding.configured ? (
                          <span className="font-mono text-xs text-neutral-700 dark:text-neutral-300">{binding.bucket || provider?.bucket || '--'}</span>
                        ) : (
                          <span className="text-xs text-neutral-400">--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3">
                        {binding.configured ? (
                          <span className={`${BADGE_BASE_CLASS} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Bound
                          </span>
                        ) : (
                          <span className={`${BADGE_BASE_CLASS} bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400`}>
                            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                            Unbound
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="rounded-md px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                              onClick={() => setEditingType(null)}
                              disabled={pending}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                              onClick={handleSave}
                              disabled={pending || !editProviderId}
                            >
                              {pending ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              className="rounded-md px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                              onClick={() => handleEdit(binding.spaceType)}
                            >
                              {binding.configured ? 'Change' : 'Assign'}
                            </button>
                            {binding.configured && (
                              <button
                                type="button"
                                className="rounded-md px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                onClick={() => handleClear(binding.spaceType)}
                                disabled={pending}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
