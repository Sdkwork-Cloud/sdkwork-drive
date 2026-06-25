import React, { useEffect, useMemo, useState } from 'react';
import type { DriveBackendSdkClient } from 'sdkwork-drive-pc-admin-core';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import { formatDriveBytes } from 'sdkwork-drive-pc-commons';
import { createDriveOperationsAdminService } from '../services/driveOperationsAdminService';
import type { DownloadPackageView } from '../types/driveOperationsAdminTypes';
import {
  CARD_BODY_CLASS,
  CARD_CLASS,
  CARD_HEADER_CLASS,
  SELECT_CLASS,
  TABLE_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
} from '../utils/uiPrimitives';
import { useTranslation } from '../hooks/useTranslation';

interface DownloadPackagesAdminPageProps {
  backendSdkClient: DriveBackendSdkClient;
  getSession: () => SessionSnapshot;
}

function isAbortError(value: unknown): boolean {
  if (value instanceof DOMException && value.name === 'AbortError') return true;
  return value instanceof Error && (value.name === 'AbortError' || /\babort(?:ed)?\b/i.test(value.message));
}

export function DownloadPackagesAdminPage({ backendSdkClient, getSession }: DownloadPackagesAdminPageProps) {
  const { t } = useTranslation();
  const service = useMemo(
    () => createDriveOperationsAdminService({ backendSdkClient, getSession }),
    [backendSdkClient, getSession],
  );
  const [items, setItems] = useState<DownloadPackageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [stateFilter, setStateFilter] = useState<DownloadPackageView['state'] | ''>('');

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    setError(undefined);
    service.listDownloadPackages({
      state: stateFilter || undefined,
      page: 1,
      pageSize: 50,
      signal,
    })
      .then((result) => setItems(result.items))
      .catch((err) => {
        if (!isAbortError(err)) setError(t('noticeLoadFailed'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [service, stateFilter]);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#111]">
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-[#161616]">
        <h1 className="text-lg font-semibold">{t('downloadPackagesPageTitle')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('downloadPackagesPageDescription')}</p>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className={CARD_CLASS}>
          <div className={`${CARD_HEADER_CLASS} flex items-center justify-between gap-3`}>
            <span>{t('downloadPackagesListTitle')}</span>
            <select className={SELECT_CLASS} value={stateFilter} onChange={(e) => setStateFilter(e.target.value as DownloadPackageView['state'] | '')}>
              <option value="">{t('allStates')}</option>
              <option value="creating">creating</option>
              <option value="ready">ready</option>
              <option value="failed">failed</option>
              <option value="expired">expired</option>
            </select>
          </div>
          <div className={`${CARD_BODY_CLASS} overflow-x-auto`}>
            {loading ? <div className="py-8 text-center text-sm text-neutral-500">{t('loading')}</div> : items.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-500">{t('downloadPackagesEmpty')}</div>
            ) : (
              <table className={TABLE_CLASS}>
                <thead><tr className={TABLE_HEAD_CLASS}>
                  <th className="px-3 py-2">{t('colPackageName')}</th>
                  <th className="px-3 py-2">{t('colStatus')}</th>
                  <th className="px-3 py-2">{t('colFiles')}</th>
                  <th className="px-3 py-2">{t('colSize')}</th>
                </tr></thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className={TABLE_ROW_CLASS}>
                      <td className="px-3 py-2">{item.packageName}</td>
                      <td className="px-3 py-2">{item.state}</td>
                      <td className="px-3 py-2">{item.fileCount}</td>
                      <td className="px-3 py-2">{formatDriveBytes(item.totalBytes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
