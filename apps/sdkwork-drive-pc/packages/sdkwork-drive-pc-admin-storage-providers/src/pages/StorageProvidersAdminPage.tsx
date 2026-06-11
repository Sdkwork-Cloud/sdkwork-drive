import React, { useEffect, useMemo, useState } from 'react';
import type { DriveAdminStorageSdkClient, SessionSnapshot } from 'sdkwork-drive-pc-core';
import { StorageProviderBindingPanel } from '../components/StorageProviderBindingPanel';
import { StorageProviderDiagnosticsPanel } from '../components/StorageProviderDiagnosticsPanel';
import { StorageProviderEditor } from '../components/StorageProviderEditor';
import { StorageProviderTable } from '../components/StorageProviderTable';
import {
  createStorageProviderAdminService,
  type StorageProviderAdminService,
} from '../services/storageProviderAdminService';
import type {
  CreateStorageProviderInput,
  StorageProviderBindingView,
  StorageProviderBucketView,
  StorageProviderCapabilitiesView,
  StorageProviderView,
  UpdateStorageProviderInput,
} from '../types/storageProviderAdminTypes';

interface StorageProvidersAdminPageProps {
  adminStorageSdkClient: DriveAdminStorageSdkClient;
  getSession: () => SessionSnapshot;
}

type PageNotice = { type: 'success' | 'error'; message: string } | undefined;

function isAbortError(value: unknown): boolean {
  if (value instanceof DOMException && value.name === 'AbortError') {
    return true;
  }
  return value instanceof Error && (value.name === 'AbortError' || /\babort(?:ed)?\b/i.test(value.message));
}

export function StorageProvidersAdminPage({
  adminStorageSdkClient,
  getSession,
}: StorageProvidersAdminPageProps) {
  const service = useMemo<StorageProviderAdminService>(
    () => createStorageProviderAdminService({ adminStorageSdkClient, getSession }),
    [adminStorageSdkClient, getSession],
  );
  const [providers, setProviders] = useState<StorageProviderView[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>();
  const [editingProvider, setEditingProvider] = useState<StorageProviderView | undefined>();
  const [binding, setBinding] = useState<StorageProviderBindingView | undefined>();
  const [capabilities, setCapabilities] = useState<StorageProviderCapabilitiesView | undefined>();
  const [bucket, setBucket] = useState<StorageProviderBucketView | undefined>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<PageNotice>();

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);

  const reload = (signal?: AbortSignal) => {
    setLoading(true);
    setNotice(undefined);
    Promise.all([
      service.listProviders({ signal }),
      service.getDefaultBinding(undefined, { signal }).catch(() => undefined),
    ])
      .then(([nextProviders, nextBinding]) => {
        setProviders(nextProviders);
        setBinding(nextBinding);
        setSelectedProviderId((current) => current ?? nextProviders[0]?.id);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setNotice({ type: 'error', message: err?.message || 'Failed to load storage providers.' });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal);
    return () => controller.abort();
  }, [service]);

  const runMutation = (operation: () => Promise<unknown>, successMessage: string) => {
    setPending(true);
    setNotice(undefined);
    operation()
      .then(() => {
        setNotice({ type: 'success', message: successMessage });
        reload();
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setNotice({ type: 'error', message: err?.message || 'Storage provider operation failed.' });
        }
      })
      .finally(() => setPending(false));
  };

  const createProvider = (input: CreateStorageProviderInput) =>
    runMutation(() => service.createProvider(input), 'Storage provider created.');
  const updateProvider = (providerId: string, input: UpdateStorageProviderInput) =>
    runMutation(() => service.updateProvider(providerId, input), 'Storage provider updated.');
  const deleteProvider = (providerId: string) =>
    runMutation(() => service.deleteProvider(providerId), 'Storage provider deleted.');
  const activateProvider = (providerId: string) =>
    runMutation(() => service.activateProvider(providerId), 'Storage provider enabled.');
  const deactivateProvider = (providerId: string) =>
    runMutation(() => service.deactivateProvider(providerId), 'Storage provider disabled.');
  const testProvider = (providerId: string) =>
    runMutation(() => service.testProvider(providerId), 'Storage provider connectivity test completed.');
  const rotateCredential = (providerId: string, credentialRef: string) =>
    runMutation(() => service.rotateCredential(providerId, credentialRef), 'Credential reference rotated.');
  const setDefaultBinding = (providerId: string, spaceId?: string) =>
    runMutation(() => service.setDefaultBinding({ providerId, spaceId }), 'Default provider binding updated.');
  const deleteDefaultBinding = (spaceId?: string) =>
    runMutation(() => service.deleteDefaultBinding(spaceId), 'Default provider binding cleared.');

  const loadCapabilities = (providerId: string) => {
    setPending(true);
    service.getCapabilities(providerId)
      .then(setCapabilities)
      .catch((err) => setNotice({ type: 'error', message: err?.message || 'Failed to load capabilities.' }))
      .finally(() => setPending(false));
  };

  const headBucket = (providerId: string) => {
    setPending(true);
    service.headBucket(providerId)
      .then(setBucket)
      .catch((err) => setNotice({ type: 'error', message: err?.message || 'Failed to inspect bucket.' }))
      .finally(() => setPending(false));
  };

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-[#111] dark:text-neutral-100">
      <header className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-[#171717]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Storage providers</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Manage Drive object storage provider configuration for internal operations.
            </p>
          </div>
          <button
            type="button"
            className="bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => setEditingProvider(undefined)}
          >
            New provider
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {notice && (
          <div className={`mb-4 border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200'
          }`}>
            {notice.message}
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_420px] gap-5">
          <section className="min-w-0">
            {loading ? (
              <div className="flex min-h-[360px] items-center justify-center border border-neutral-200 bg-white text-sm text-neutral-500 dark:border-neutral-800 dark:bg-[#171717]">
                Loading storage providers...
              </div>
            ) : (
              <StorageProviderTable
                providers={providers}
                selectedProviderId={selectedProviderId}
                actionPending={pending}
                onSelectProvider={(provider) => setSelectedProviderId(provider.id)}
                onEditProvider={setEditingProvider}
                onActivateProvider={activateProvider}
                onDeactivateProvider={deactivateProvider}
                onTestProvider={testProvider}
                onDeleteProvider={deleteProvider}
              />
            )}
          </section>

          <aside className="flex flex-col gap-5">
            <StorageProviderEditor
              provider={editingProvider}
              pending={pending}
              onCancel={() => setEditingProvider(undefined)}
              onCreateProvider={createProvider}
              onUpdateProvider={updateProvider}
              onRotateCredential={rotateCredential}
            />
            <StorageProviderBindingPanel
              providers={providers}
              binding={binding}
              pending={pending}
              onSetDefaultBinding={setDefaultBinding}
              onDeleteDefaultBinding={deleteDefaultBinding}
            />
            <StorageProviderDiagnosticsPanel
              provider={selectedProvider}
              capabilities={capabilities}
              bucket={bucket}
              pending={pending}
              onLoadCapabilities={loadCapabilities}
              onHeadBucket={headBucket}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
