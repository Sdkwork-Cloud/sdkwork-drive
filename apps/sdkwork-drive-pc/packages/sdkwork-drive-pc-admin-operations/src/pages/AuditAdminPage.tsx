import React, { useEffect, useMemo, useState } from 'react';
import type { DriveBackendSdkClient } from 'sdkwork-drive-pc-admin-core';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import { createDriveOperationsAdminService } from '../services/driveOperationsAdminService';
import type { AuditEventView } from '../types/driveOperationsAdminTypes';
import {
  CARD_BODY_CLASS,
  CARD_CLASS,
  CARD_HEADER_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  TABLE_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
} from '../utils/uiPrimitives';
import { useTranslation } from '../hooks/useTranslation';

interface AuditAdminPageProps {
  backendSdkClient: DriveBackendSdkClient;
  getSession: () => SessionSnapshot;
}

function isAbortError(value: unknown): boolean {
  if (value instanceof DOMException && value.name === 'AbortError') return true;
  return value instanceof Error && (value.name === 'AbortError' || /\babort(?:ed)?\b/i.test(value.message));
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function AuditAdminPage({ backendSdkClient, getSession }: AuditAdminPageProps) {
  const { t } = useTranslation();
  const service = useMemo(
    () => createDriveOperationsAdminService({ backendSdkClient, getSession }),
    [backendSdkClient, getSession],
  );
  const [items, setItems] = useState<AuditEventView[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [actionFilter, setActionFilter] = useState('');
  const [resourceTypeFilter, setResourceTypeFilter] = useState('');
  const [resourceIdFilter, setResourceIdFilter] = useState('');

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    setError(undefined);
    service.listAuditEvents({
      action: actionFilter.trim() || undefined,
      resourceType: resourceTypeFilter.trim() || undefined,
      resourceId: resourceIdFilter.trim() || undefined,
      page,
      pageSize,
      signal,
    })
      .then((result) => {
        setItems(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setError(t('noticeLoadFailed'));
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [service, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#111]">
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-[#161616]">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('auditPageTitle')}</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('auditPageDescription')}</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className={`${CARD_CLASS} mb-4`}>
          <div className={CARD_HEADER_CLASS}>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t('filtersTitle')}</span>
          </div>
          <div className={`${CARD_BODY_CLASS} flex flex-wrap items-end gap-3`}>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-neutral-500">
              {t('filterAction')}
              <input
                className={INPUT_CLASS}
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                placeholder={t('filterActionPlaceholder')}
              />
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-neutral-500">
              {t('filterResourceType')}
              <input
                className={INPUT_CLASS}
                value={resourceTypeFilter}
                onChange={(event) => setResourceTypeFilter(event.target.value)}
                placeholder={t('filterResourceTypePlaceholder')}
              />
            </label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-xs text-neutral-500">
              {t('filterResourceId')}
              <input
                className={INPUT_CLASS}
                value={resourceIdFilter}
                onChange={(event) => setResourceIdFilter(event.target.value)}
                placeholder={t('filterResourceIdPlaceholder')}
              />
            </label>
            <button
              type="button"
              className={PRIMARY_BUTTON_CLASS}
              onClick={() => {
                setPage(1);
                load();
              }}
            >
              {t('applyFilters')}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className={CARD_CLASS}>
          <div className={`${CARD_HEADER_CLASS} flex items-center justify-between`}>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
              {t('auditEventsTitle')}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('countOf', { filtered: items.length, total })}
            </span>
          </div>
          <div className={`${CARD_BODY_CLASS} overflow-x-auto`}>
            {loading ? (
              <div className="py-10 text-center text-sm text-neutral-500">{t('loading')}</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-500">{t('auditEmpty')}</div>
            ) : (
              <table className={TABLE_CLASS}>
                <thead>
                  <tr className={TABLE_HEAD_CLASS}>
                    <th className="px-3 py-2">{t('colTime')}</th>
                    <th className="px-3 py-2">{t('colAction')}</th>
                    <th className="px-3 py-2">{t('colResourceType')}</th>
                    <th className="px-3 py-2">{t('colResourceId')}</th>
                    <th className="px-3 py-2">{t('colOperator')}</th>
                    <th className="px-3 py-2">{t('colTrace')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className={TABLE_ROW_CLASS}>
                      <td className="px-3 py-2 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                        {formatTimestamp(item.createdAt)}
                      </td>
                      <td className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100">{item.action}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{item.resourceType}</td>
                      <td className="px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-300">{item.resourceId}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{item.operatorId}</td>
                      <td className="px-3 py-2 font-mono text-xs text-neutral-500">{item.traceId || item.requestId || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t('previousPage')}
            </button>
            <span className="text-xs text-neutral-500">
              {t('pageOf', { page, totalPages })}
            </span>
            <button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              disabled={page >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              {t('nextPage')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
