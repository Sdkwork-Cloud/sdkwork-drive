import React, { useEffect, useMemo, useState } from 'react';
import type { DriveBackendSdkClient } from 'sdkwork-drive-pc-admin-core';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import { createDriveOperationsAdminService } from '../services/driveOperationsAdminService';
import type { DriveSpaceAdminView } from '../types/driveOperationsAdminTypes';
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

interface SpacesAdminPageProps {
  backendSdkClient: DriveBackendSdkClient;
  getSession: () => SessionSnapshot;
}

function isAbortError(value: unknown): boolean {
  if (value instanceof DOMException && value.name === 'AbortError') return true;
  return value instanceof Error && (value.name === 'AbortError' || /\babort(?:ed)?\b/i.test(value.message));
}

export function SpacesAdminPage({ backendSdkClient, getSession }: SpacesAdminPageProps) {
  const { t } = useTranslation();
  const service = useMemo(
    () => createDriveOperationsAdminService({ backendSdkClient, getSession }),
    [backendSdkClient, getSession],
  );
  const [spaces, setSpaces] = useState<DriveSpaceAdminView[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [ownerSubjectType, setOwnerSubjectType] = useState('');
  const [ownerSubjectId, setOwnerSubjectId] = useState('');

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    setError(undefined);
    service.listSpaces({
      ownerSubjectType: ownerSubjectType.trim() || undefined,
      ownerSubjectId: ownerSubjectId.trim() || undefined,
      pageSize,
      pageToken: page > 1 ? String((page - 1) * pageSize) : undefined,
      signal,
    })
      .then((result) => {
        setSpaces(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!isAbortError(err)) setError(t('noticeLoadFailed'));
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
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#111]">
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-[#161616]">
        <h1 className="text-lg font-semibold">{t('spacesPageTitle')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('spacesPageDescription')}</p>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className={`${CARD_CLASS} ${CARD_BODY_CLASS} flex flex-wrap items-end gap-3`}>
          <label className="flex min-w-[160px] flex-col gap-1 text-xs text-neutral-500">
            {t('filterOwnerType')}
            <input className={INPUT_CLASS} value={ownerSubjectType} onChange={(e) => setOwnerSubjectType(e.target.value)} />
          </label>
          <label className="flex min-w-[160px] flex-col gap-1 text-xs text-neutral-500">
            {t('filterOwnerId')}
            <input className={INPUT_CLASS} value={ownerSubjectId} onChange={(e) => setOwnerSubjectId(e.target.value)} />
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
        <div className={CARD_CLASS}>
          <div className={CARD_HEADER_CLASS}>{t('spacesListTitle')}</div>
          <div className="overflow-x-auto">
            <table className={TABLE_CLASS}>
              <thead className={TABLE_HEAD_CLASS}>
                <tr>
                  <th>{t('colSpaceName')}</th>
                  <th>{t('colSpaceType')}</th>
                  <th>{t('colOwner')}</th>
                  <th>{t('colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className={TABLE_ROW_CLASS}>
                    <td colSpan={4} className="px-4 py-6 text-sm text-neutral-500">{t('loading')}</td>
                  </tr>
                ) : spaces.length === 0 ? (
                  <tr className={TABLE_ROW_CLASS}>
                    <td colSpan={4} className="px-4 py-6 text-sm text-neutral-500">{t('spacesEmpty')}</td>
                  </tr>
                ) : (
                  spaces.map((space) => (
                    <tr key={space.id} className={TABLE_ROW_CLASS}>
                      <td>{space.displayName}</td>
                      <td>{space.spaceType}</td>
                      <td>{space.ownerSubjectType}:{space.ownerSubjectId}</td>
                      <td>{space.lifecycleStatus}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className={`${CARD_BODY_CLASS} flex items-center justify-between gap-3 border-t border-neutral-200 dark:border-neutral-800`}>
            <span className="text-sm text-neutral-500">{t('pageOf', { page, totalPages })}</span>
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
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                {t('nextPage')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
