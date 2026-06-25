import React, { useEffect, useMemo, useState } from 'react';
import type { DriveBackendSdkClient } from 'sdkwork-drive-pc-admin-core';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import { formatDriveBytes } from 'sdkwork-drive-pc-commons';
import { createDriveOperationsAdminService } from '../services/driveOperationsAdminService';
import type { QuotaSummaryView } from '../types/driveOperationsAdminTypes';
import {
  CARD_BODY_CLASS,
  CARD_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
} from '../utils/uiPrimitives';
import { useTranslation } from '../hooks/useTranslation';

interface QuotaAdminPageProps {
  backendSdkClient: DriveBackendSdkClient;
  getSession: () => SessionSnapshot;
}

function isAbortError(value: unknown): boolean {
  if (value instanceof DOMException && value.name === 'AbortError') return true;
  return value instanceof Error && (value.name === 'AbortError' || /\babort(?:ed)?\b/i.test(value.message));
}

function usagePercent(used: number, cap?: number | null): number | undefined {
  if (cap === undefined || cap === null || cap <= 0) return undefined;
  return Math.min(100, Math.round((used / cap) * 100));
}

export function QuotaAdminPage({ backendSdkClient, getSession }: QuotaAdminPageProps) {
  const { t } = useTranslation();
  const service = useMemo(
    () => createDriveOperationsAdminService({ backendSdkClient, getSession }),
    [backendSdkClient, getSession],
  );
  const [summary, setSummary] = useState<QuotaSummaryView | undefined>();
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [quotaInput, setQuotaInput] = useState('');

  const load = (signal?: AbortSignal) => {
    setLoading(true);
    setError(undefined);
    service.getQuotaSummary(signal)
      .then((result) => {
        setSummary(result);
        if (result.quotaBytes) {
          setQuotaInput(String(result.quotaBytes));
        }
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
  }, [service]);

  const savePolicy = async () => {
    const quotaBytes = Number.parseInt(quotaInput, 10);
    if (!Number.isFinite(quotaBytes) || quotaBytes <= 0) {
      setError(t('invalidQuotaBytes'));
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      const updated = await service.updateQuotaPolicy({ quotaBytes });
      setSummary(updated);
    } catch (err) {
      if (!isAbortError(err)) setError(t('noticeOperationFailed'));
    } finally {
      setPending(false);
    }
  };

  const clearPolicy = async () => {
    setPending(true);
    setError(undefined);
    try {
      const updated = await service.updateQuotaPolicy({ clearTenantPolicy: true });
      setSummary(updated);
      setQuotaInput('');
    } catch (err) {
      if (!isAbortError(err)) setError(t('noticeOperationFailed'));
    } finally {
      setPending(false);
    }
  };

  const percent = summary ? usagePercent(summary.totalBytes, summary.quotaBytes) : undefined;

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#111]">
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-[#161616]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('quotaPageTitle')}</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('quotaPageDescription')}</p>
          </div>
          <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={loading} onClick={() => load()}>
            {t('refresh')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="py-10 text-center text-sm text-neutral-500">{t('loading')}</div>
        ) : summary ? (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className={CARD_CLASS}><div className={`${CARD_BODY_CLASS} space-y-1`}>
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t('tenantIdLabel')}</div>
                <div className="font-mono text-sm">{summary.tenantId}</div>
              </div></div>
              <div className={CARD_CLASS}><div className={`${CARD_BODY_CLASS} space-y-1`}>
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t('totalBytesLabel')}</div>
                <div className="text-2xl font-semibold">{formatDriveBytes(summary.totalBytes)}</div>
              </div></div>
              <div className={CARD_CLASS}><div className={`${CARD_BODY_CLASS} space-y-1`}>
                <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">{t('quotaCapLabel')}</div>
                <div className="text-2xl font-semibold">{summary.quotaBytes ? formatDriveBytes(summary.quotaBytes) : t('quotaUnlimited')}</div>
              </div></div>
            </div>
            {percent !== undefined ? (
              <div className={CARD_CLASS}><div className={CARD_BODY_CLASS}>
                <div className="mb-2 flex justify-between text-xs text-neutral-500">
                  <span>{t('usageLabel')}</span>
                  <span>{percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
                </div>
              </div></div>
            ) : null}
            <div className={CARD_CLASS}><div className={`${CARD_BODY_CLASS} space-y-3`}>
              <div className="text-sm font-medium">{t('quotaPolicyTitle')}</div>
              <div className="flex flex-wrap items-center gap-3">
                <input className={INPUT_CLASS} value={quotaInput} onChange={(e) => setQuotaInput(e.target.value)} placeholder={t('quotaBytesPlaceholder')} />
                <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={pending} onClick={() => void savePolicy()}>{t('saveQuotaPolicy')}</button>
                <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={pending} onClick={() => void clearPolicy()}>{t('clearQuotaPolicy')}</button>
              </div>
              <p className="text-xs text-neutral-500">{t('quotaPolicyHint')}</p>
            </div></div>
          </>
        ) : (
          <div className="py-10 text-center text-sm text-neutral-500">{t('quotaEmpty')}</div>
        )}
      </div>
    </div>
  );
}
