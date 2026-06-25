import React, { useMemo, useState } from 'react';
import type { StorageProviderView } from '../types/storageProviderAdminTypes';
import { getAllProviderKindMeta, getProviderKindMeta, HEALTH_STATUS_CONFIG } from '../utils/providerKindConfig';
import { GHOST_BUTTON_CLASS, BADGE_BASE_CLASS, SECONDARY_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from '../utils/uiPrimitives';
import { ConfirmDialog } from './ConfirmDialog';
import { useTranslation } from '../hooks/useTranslation';

interface StorageProviderTableProps {
  providers: StorageProviderView[];
  onNewProvider: () => void;
  onEditProvider: (provider: StorageProviderView) => void;
  onViewDetail: (provider: StorageProviderView) => void;
  onActivateProvider: (providerId: string) => void;
  onDeactivateProvider: (providerId: string) => void;
  onTestProvider: (providerId: string) => void;
  onTestProviders?: (providerIds: string[]) => Promise<{ passed: number; total: number }>;
  onDeleteProvider: (providerId: string) => void;
  actionPending?: boolean;
}

const HEALTH_LABELS = { unknown: 'healthUnknown', healthy: 'healthHealthy', degraded: 'healthDegraded', unreachable: 'healthUnreachable' } as const;

type ProviderFilters = {
  search: string;
  status: 'all' | 'active' | 'inactive';
  kind: string;
  credential: 'all' | 'configured' | 'missing';
};

const INITIAL_FILTERS: ProviderFilters = {
  search: '',
  status: 'all',
  kind: 'all',
  credential: 'all',
};

export function StorageProviderTable({
  providers,
  onNewProvider,
  onEditProvider,
  onViewDetail,
  onActivateProvider,
  onDeactivateProvider,
  onTestProvider,
  onTestProviders,
  onDeleteProvider,
  actionPending,
}: StorageProviderTableProps) {
  const { t } = useTranslation();
  const [draftFilters, setDraftFilters] = useState<ProviderFilters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ProviderFilters>(INITIAL_FILTERS);
  const [deleteTarget, setDeleteTarget] = useState<StorageProviderView | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [bulkTesting, setBulkTesting] = useState(false);

  const kindOptions = useMemo(() => {
    const kinds = new Set(providers.map((p) => p.providerKind));
    return getAllProviderKindMeta().filter((meta) => kinds.has(String(meta.value)) || kinds.has(`custom:${meta.shortLabel}`));
  }, [providers]);

  const filtered = providers.filter((p) => {
    const q = appliedFilters.search.trim().toLowerCase();
    const matchSearch = !q || p.displayName.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.endpointUrl.toLowerCase().includes(q) || p.bucket.toLowerCase().includes(q);
    const matchStatus = appliedFilters.status === 'all' || p.status === appliedFilters.status;
    const matchKind = appliedFilters.kind === 'all' || p.providerKind === appliedFilters.kind || (appliedFilters.kind === 'custom' && p.providerKind.startsWith('custom:'));
    const matchCredential =
      appliedFilters.credential === 'all'
        || (appliedFilters.credential === 'configured' && p.credentialConfigured)
        || (appliedFilters.credential === 'missing' && !p.credentialConfigured);
    return matchSearch && matchStatus && matchKind && matchCredential;
  });

  const filtersDirty =
    draftFilters.search !== appliedFilters.search
    || draftFilters.status !== appliedFilters.status
    || draftFilters.kind !== appliedFilters.kind
    || draftFilters.credential !== appliedFilters.credential;

  const applyFilters = () => setAppliedFilters({ ...draftFilters });
  const resetFilters = () => {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  };

  const handleTestAll = async () => {
    const targets = filtered.filter((p) => p.status === 'active').map((p) => p.id);
    if (targets.length === 0 || !onTestProviders) return;
    setBulkTesting(true);
    try {
      await onTestProviders(targets);
    } finally {
      setBulkTesting(false);
    }
  };

  return (
    <>
      <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 max-w-md">
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('searchLabel')}</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={draftFilters.search}
                onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                placeholder={t('searchPlaceholder')}
                className="h-9 w-full rounded-md border border-neutral-300 bg-white pl-9 pr-3 text-sm outline-none placeholder:text-neutral-400 focus:border-blue-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('colKind')}</label>
            <select value={draftFilters.kind} onChange={(e) => setDraftFilters((prev) => ({ ...prev, kind: e.target.value }))} className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-200">
              <option value="all">{t('allKinds')}</option>
              {kindOptions.map((meta) => (
                <option key={String(meta.value)} value={meta.value}>{meta.shortLabel}</option>
              ))}
              {providers.some((p) => p.providerKind.startsWith('custom:')) && (
                <option value="custom">Custom</option>
              )}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('colStatus')}</label>
            <select value={draftFilters.status} onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value as ProviderFilters['status'] }))} className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-200">
              <option value="all">{t('allStatus')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('inactive')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">{t('colCredential')}</label>
            <select value={draftFilters.credential} onChange={(e) => setDraftFilters((prev) => ({ ...prev, credential: e.target.value as ProviderFilters['credential'] }))} className="h-9 rounded-md border border-neutral-300 bg-white px-2 text-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-200">
              <option value="all">{t('allCredentials')}</option>
              <option value="configured">{t('credentialConfiguredFilter')}</option>
              <option value="missing">{t('credentialMissingFilter')}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={applyFilters}>
              {t('searchAction')}
            </button>
            <button type="button" className={SECONDARY_BUTTON_CLASS} onClick={resetFilters} disabled={!filtersDirty && appliedFilters.search === '' && appliedFilters.status === 'all' && appliedFilters.kind === 'all' && appliedFilters.credential === 'all'}>
              {t('resetFilters')}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <span className="text-xs text-neutral-500">{t('countOf', { filtered: filtered.length, total: providers.length })}</span>
          {onTestProviders && (
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              disabled={actionPending || bulkTesting || filtered.filter((p) => p.status === 'active').length === 0}
              onClick={handleTestAll}
            >
              {bulkTesting ? t('testAllRunning') : t('testAllFiltered')}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              <th className="w-[14%] px-4 py-3 text-left font-semibold">{t('colProvider')}</th>
              <th className="w-[8%] px-4 py-3 text-left font-semibold">{t('colKind')}</th>
              <th className="min-w-[22rem] w-[32%] px-4 py-3 text-left font-semibold">{t('colEndpoint')}</th>
              <th className="w-[12%] px-4 py-3 text-left font-semibold">{t('colBucket')}</th>
              <th className="w-[8%] px-4 py-3 text-left font-semibold">{t('colStatus')}</th>
              <th className="w-[8%] px-4 py-3 text-left font-semibold">{t('colHealth')}</th>
              <th className="w-[10%] px-4 py-3 text-left font-semibold">{t('colCredential')}</th>
              <th className="w-[8%] px-4 py-3 text-right font-semibold">{t('colActions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-16 text-center">
                {providers.length === 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <svg className="h-7 w-7 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('emptyTitle')}</h3>
                    <p className="mt-1 max-w-sm text-xs text-neutral-500">{t('emptyDesc')}</p>
                    <button type="button" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700" onClick={onNewProvider}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      {t('newProvider')}
                    </button>
                  </div>
                ) : <span className="text-sm text-neutral-500">{t('noSearchResults')}</span>}
              </td></tr>
            ) : filtered.map((provider) => {
              const meta = getProviderKindMeta(provider.providerKind);
              const health = HEALTH_STATUS_CONFIG[provider.healthStatus ?? 'unknown'];
              const menuOpen = menuOpenId === provider.id;
              const hasIssue = provider.status === 'active' && (!provider.credentialConfigured || provider.healthStatus === 'unreachable' || provider.healthStatus === 'degraded');
              return (
                <tr key={provider.id} className={`hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${hasIssue ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                  <td className="px-4 py-3">
                    <button type="button" className="text-left" onClick={() => onViewDetail(provider)}>
                      <span className="block font-semibold text-neutral-900 hover:text-blue-600 dark:text-neutral-100 dark:hover:text-blue-400">{provider.displayName}</span>
                      <span className="block font-mono text-xs text-neutral-500">{provider.id}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${meta.bgClass} ${meta.textClass}`}><span className="font-bold">{meta.icon}</span>{meta.shortLabel}</span></td>
                  <td className="min-w-[22rem] px-4 py-3 align-top font-mono text-xs leading-relaxed text-neutral-600 break-all dark:text-neutral-300">{provider.endpointUrl || '--'}</td>
                  <td className="px-4 py-3"><span className="text-neutral-900 dark:text-neutral-100">{provider.bucket || '--'}</span>{provider.region && <span className="ml-1 text-xs text-neutral-400">{provider.region}</span>}</td>
                  <td className="px-4 py-3">{provider.status === 'active' ? <span className={`${BADGE_BASE_CLASS} bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300`}>{t('active')}</span> : <span className={`${BADGE_BASE_CLASS} bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400`}>{t('inactive')}</span>}</td>
                  <td className="px-4 py-3"><span className={`${BADGE_BASE_CLASS} ${health.bgClass} ${health.textClass}`}><span className={`h-1.5 w-1.5 rounded-full ${health.dotClass}`} />{t(HEALTH_LABELS[provider.healthStatus ?? 'unknown'])}</span></td>
                  <td className="px-4 py-3">
                    {provider.credentialConfigured ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>{t('credentialSet')}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>{t('credentialMissing')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="relative inline-flex items-center gap-1">
                      <button type="button" className={GHOST_BUTTON_CLASS} title={t('edit')} onClick={() => onEditProvider(provider)}><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button type="button" className={GHOST_BUTTON_CLASS} title={t('testConnectivity')} disabled={actionPending || bulkTesting} onClick={() => onTestProvider(provider.id)}><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></button>
                      <button type="button" className={GHOST_BUTTON_CLASS} title={t('details')} onClick={() => onViewDetail(provider)}><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                      <div className="relative">
                        <button type="button" className={GHOST_BUTTON_CLASS} title={t('more')} onClick={() => setMenuOpenId(menuOpen ? null : provider.id)}><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" /></svg></button>
                        {menuOpen && (<><div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} /><div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                          {provider.status === 'active' ? <button type="button" className="w-full px-3 py-1.5 text-left text-xs text-amber-700 hover:bg-neutral-50 dark:text-amber-400 dark:hover:bg-neutral-800" onClick={() => { onDeactivateProvider(provider.id); setMenuOpenId(null); }}>{t('disableProvider')}</button>
                            : <button type="button" className="w-full px-3 py-1.5 text-left text-xs text-emerald-700 hover:bg-neutral-50 dark:text-emerald-400 dark:hover:bg-neutral-800" onClick={() => { onActivateProvider(provider.id); setMenuOpenId(null); }}>{t('enableProvider')}</button>}
                          <button type="button" className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30" onClick={() => { setDeleteTarget(provider); setMenuOpenId(null); }}>{t('deleteProvider')}</button>
                        </div></>)}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={t('deleteConfirmTitle')}
        message={t('deleteConfirmMessage', { name: deleteTarget?.displayName ?? deleteTarget?.id ?? '' })}
        confirmLabel={t('deleteConfirmLabel')}
        variant="danger"
        onConfirm={() => { if (deleteTarget) { onDeleteProvider(deleteTarget.id); setDeleteTarget(null); } }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
