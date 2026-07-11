import React, { useEffect, useMemo, useState } from 'react';
import type { DriveAdminStorageSdkClient } from 'sdkwork-drive-pc-admin-core';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import { StorageProviderTable } from '../components/StorageProviderTable';
import { StorageProviderEditor } from '../components/StorageProviderEditor';
import { StorageProviderDetailDrawer } from '../components/StorageProviderDetailDrawer';
import {
  createStorageProviderAdminService,
  type StorageProviderAdminService,
} from '../services/storageProviderAdminService';
import type {
  CreateStorageProviderInput,
  StorageProviderView,
  UpdateStorageProviderInput,
} from '../types/storageProviderAdminTypes';
import { PRIMARY_BUTTON_CLASS, BADGE_BASE_CLASS, SECONDARY_BUTTON_CLASS } from '../utils/uiPrimitives';
import { useTranslation } from '../hooks/useTranslation';

interface StorageProvidersAdminPageProps {
  adminStorageSdkClient: DriveAdminStorageSdkClient;
  getSession: () => SessionSnapshot;
}

type PageNotice = { type: 'success' | 'error'; messageKey: string; params?: Record<string, string> } | undefined;

function isAbortError(value: unknown): boolean {
  if (value instanceof DOMException && value.name === 'AbortError') return true;
  return value instanceof Error && (value.name === 'AbortError' || /\babort(?:ed)?\b/i.test(value.message));
}

export function StorageProvidersAdminPage({
  adminStorageSdkClient,
  getSession,
}: StorageProvidersAdminPageProps) {
  const { t } = useTranslation();
  const service = useMemo<StorageProviderAdminService>(
    () => createStorageProviderAdminService({ adminStorageSdkClient, getSession }),
    [adminStorageSdkClient, getSession],
  );
  const [providers, setProviders] = useState<StorageProviderView[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [pageCursors, setPageCursors] = useState<Record<number, string | undefined>>({ 1: undefined });
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<PageNotice>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<StorageProviderView | undefined>();
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailProvider, setDetailProvider] = useState<StorageProviderView | undefined>();
  const currentPageToken = pageCursors[page];

  const refreshProviders = async (signal?: AbortSignal) => {
    const result = await service.listProvidersPage({
      signal,
      pageSize,
      pageToken: currentPageToken,
    });
    setProviders(result.items);
    setNextPageToken(result.nextPageToken);
    setHasMore(Boolean(result.nextPageToken));
    setPageCursors((current) => {
      const next = { ...current };
      Object.keys(next)
        .map(Number)
        .filter((cursorPage) => cursorPage > page + 1)
        .forEach((cursorPage) => {
          delete next[cursorPage];
        });
      if (result.nextPageToken) {
        next[page + 1] = result.nextPageToken;
      } else {
        delete next[page + 1];
      }
      return next;
    });
    return result.items;
  };

  const reload = (signal?: AbortSignal) => {
    setLoading(true);
    refreshProviders(signal)
      .catch((err) => {
        if (!isAbortError(err)) setNotice({ type: 'error', messageKey: 'noticeLoadFailed' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const c = new AbortController();
    reload(c.signal);
    return () => c.abort();
  }, [currentPageToken, service, page, pageSize]);

  const syncProviderViews = (items: StorageProviderView[], saved?: StorageProviderView) => {
    setProviders(items);
    if (!saved) return;
    if (editingProvider?.id === saved.id) {
      setEditingProvider(saved);
    }
    if (detailProvider?.id === saved.id) {
      setDetailProvider(saved);
    }
  };

  const runTableMutation = (op: () => Promise<unknown>, noticeKey: string) => {
    setPending(true);
    setNotice(undefined);
    op()
      .then(async () => {
        const items = await refreshProviders();
        setProviders(items);
        setNotice({ type: 'success', messageKey: noticeKey });
      })
      .catch((err) => {
        if (!isAbortError(err)) setNotice({ type: 'error', messageKey: 'noticeOperationFailed' });
      })
      .finally(() => setPending(false));
  };

  const createProvider = async (input: CreateStorageProviderInput) => {
    const created = await service.createProvider(input);
    const items = await refreshProviders();
    syncProviderViews(items, created);
    return created;
  };

  const updateProvider = async (id: string, input: UpdateStorageProviderInput) => {
    const updated = await service.updateProvider(id, input);
    const items = await refreshProviders();
    syncProviderViews(items, updated);
    return updated;
  };

  const rotateCredential = async (id: string, ref: string) => {
    const updated = await service.rotateCredential(id, ref);
    const items = await refreshProviders();
    syncProviderViews(items, updated);
    return updated;
  };

  const deleteProvider = (id: string) => runTableMutation(() => service.deleteProvider(id), 'noticeDeleted');
  const activateProvider = (id: string) => runTableMutation(() => service.activateProvider(id), 'noticeEnabled');
  const deactivateProvider = (id: string) => runTableMutation(() => service.deactivateProvider(id), 'noticeDisabled');
  const testProvider = (id: string) => runTableMutation(() => service.testProvider(id), 'noticeTested');
  const testProviders = async (providerIds: string[]) => {
    setPending(true);
    setNotice(undefined);
    let passed = 0;
    try {
      for (const id of providerIds) {
        try {
          const ok = await service.testProvider(id);
          if (ok) passed += 1;
        } catch {
          // continue batch
        }
      }
      const items = await refreshProviders();
      setProviders(items);
      setNotice({
        type: 'success',
        messageKey: 'testAllSummary',
        params: { total: String(providerIds.length), passed: String(passed) },
      });
      return { passed, total: providerIds.length };
    } catch (err) {
      if (!isAbortError(err)) setNotice({ type: 'error', messageKey: 'noticeOperationFailed' });
      return { passed, total: providerIds.length };
    } finally {
      setPending(false);
    }
  };
  const setDefaultBinding = (id: string, spaceId?: string) =>
    runTableMutation(() => service.setDefaultBinding({ providerId: id, spaceId }), 'noticeBindingUpdated');
  const deleteDefaultBinding = (spaceId?: string) =>
    runTableMutation(() => service.deleteDefaultBinding(spaceId), 'noticeBindingCleared');

  const issueCount = providers.filter(
    (p) => p.status === 'active' && (!p.credentialConfigured || p.healthStatus === 'unreachable' || p.healthStatus === 'degraded'),
  ).length;

  return (
    <main className="flex h-full flex-1 flex-col overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-semibold">{t('pageTitle')}</h1>
              {!loading && (
                <span className={`${BADGE_BASE_CLASS} bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300`}>
                  {t('headerProviderCount', { count: providers.length })}
                </span>
              )}
              {issueCount > 0 && (
                <span className={`${BADGE_BASE_CLASS} bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200`}>
                  {t('issuesSummary', { count: issueCount })}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('pageDescription')}</p>
          </div>
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            onClick={() => {
              setEditingProvider(undefined);
              setEditorOpen(true);
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {t('newProvider')}
          </button>
        </div>

        {notice && !editorOpen && (
          <div className={`mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200'
          }`}>
            {notice.type === 'success' ? (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            ) : (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
            <span className="flex-1">{t(notice.messageKey, notice.params)}</span>
            <button type="button" className="text-current opacity-50 hover:opacity-100" onClick={() => setNotice(undefined)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-3 text-sm text-neutral-500">
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
              {t('loading')}
            </div>
          </div>
        ) : (
          <>
            <StorageProviderTable
              providers={providers}
              actionPending={pending}
              onNewProvider={() => { setEditingProvider(undefined); setEditorOpen(true); }}
              onEditProvider={(p) => { setEditingProvider(p); setEditorOpen(true); }}
              onViewDetail={(p) => { setDetailProvider(p); setDetailDrawerOpen(true); }}
              onActivateProvider={activateProvider}
              onDeactivateProvider={deactivateProvider}
              onTestProvider={testProvider}
              onTestProviders={testProviders}
              onDeleteProvider={deleteProvider}
            />
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <span className="text-sm text-neutral-500">{t('pageLabel', { page })}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={SECONDARY_BUTTON_CLASS}
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  {t('previousPage')}
                </button>
                <button
                  type="button"
                  className={SECONDARY_BUTTON_CLASS}
                  disabled={!hasMore || !nextPageToken || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t('nextPage')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editorOpen && (
        <StorageProviderEditor
          provider={editingProvider}
          existingProviderIds={providers.map((item) => item.id)}
          onClose={() => { setEditorOpen(false); setEditingProvider(undefined); }}
          onCreateProvider={createProvider}
          onUpdateProvider={updateProvider}
          onRotateCredential={rotateCredential}
          onProviderSaved={(saved) => {
            setEditingProvider((current) => (current?.id === saved.id ? saved : current));
          }}
        />
      )}

      {detailDrawerOpen && detailProvider && (
        <StorageProviderDetailDrawer
          provider={detailProvider}
          providers={providers}
          adminStorageSdkClient={adminStorageSdkClient}
          service={service}
          pending={pending}
          onClose={() => { setDetailDrawerOpen(false); setDetailProvider(undefined); }}
          onTestProvider={testProvider}
          onActivateProvider={activateProvider}
          onDeactivateProvider={deactivateProvider}
          onSetDefaultBinding={setDefaultBinding}
          onDeleteDefaultBinding={deleteDefaultBinding}
          onRotateCredential={(id, ref) => {
            void rotateCredential(id, ref);
          }}
        />
      )}
    </main>
  );
}
