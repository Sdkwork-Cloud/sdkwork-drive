import React, { useEffect, useMemo, useState } from 'react';
import type { DriveBackendSdkClient } from 'sdkwork-drive-pc-admin-core';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import { createDriveOperationsAdminService } from '../services/driveOperationsAdminService';
import type { MaintenanceJobType, MaintenanceJobView } from '../types/driveOperationsAdminTypes';
import {
  BADGE_BASE_CLASS,
  CARD_BODY_CLASS,
  CARD_CLASS,
  CARD_HEADER_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  SELECT_CLASS,
  TABLE_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
} from '../utils/uiPrimitives';
import { useTranslation } from '../hooks/useTranslation';

interface MaintenanceAdminPageProps {
  backendSdkClient: DriveBackendSdkClient;
  getSession: () => SessionSnapshot;
}

const SWEEP_JOB_TYPES: MaintenanceJobType[] = [
  'object_sweep',
  'upload_session_sweep',
  'expired_upload_content_sweep',
  'abandoned_upload_task_sweep',
];

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

export function MaintenanceAdminPage({ backendSdkClient, getSession }: MaintenanceAdminPageProps) {
  const { t } = useTranslation();
  const service = useMemo(
    () => createDriveOperationsAdminService({ backendSdkClient, getSession }),
    [backendSdkClient, getSession],
  );
  const [jobs, setJobs] = useState<MaintenanceJobView[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | undefined>();
  const [jobTypeFilter, setJobTypeFilter] = useState<MaintenanceJobType | ''>('');

  const loadJobs = (signal?: AbortSignal) => {
    setLoading(true);
    service.listMaintenanceJobs({
      jobType: jobTypeFilter || undefined,
      page,
      pageSize,
      signal,
    })
      .then((result) => {
        setJobs(result.items);
        setTotal(result.total);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setNotice({ type: 'error', message: t('noticeLoadFailed') });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    loadJobs(controller.signal);
    return () => controller.abort();
  }, [service, page, pageSize, jobTypeFilter]);

  const runSweep = async (jobType: MaintenanceJobType) => {
    setPending(true);
    setNotice(undefined);
    try {
      const result = await service.startMaintenanceSweep({ jobType, dryRun });
      setNotice({
        type: 'success',
        message: t('sweepSuccess', {
          scanned: result.scannedCount,
          affected: result.affectedCount,
          mode: dryRun ? t('dryRunLabel') : t('liveRunLabel'),
        }),
      });
      loadJobs();
    } catch (err) {
      if (!isAbortError(err)) {
        setNotice({ type: 'error', message: t('noticeOperationFailed') });
      }
    } finally {
      setPending(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#111]">
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-[#161616]">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">{t('maintenancePageTitle')}</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t('maintenancePageDescription')}</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {notice ? (
          <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
          }`}>
            {notice.message}
          </div>
        ) : null}

        <div className={`${CARD_CLASS} mb-4`}>
          <div className={CARD_HEADER_CLASS}>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t('runSweepTitle')}</span>
          </div>
          <div className={`${CARD_BODY_CLASS} space-y-4`}>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(event) => setDryRun(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              {t('dryRunHint')}
            </label>
            <div className="flex flex-wrap gap-2">
              {SWEEP_JOB_TYPES.map((jobType) => (
                <button
                  key={jobType}
                  type="button"
                  className={PRIMARY_BUTTON_CLASS}
                  disabled={pending}
                  onClick={() => void runSweep(jobType)}
                >
                  {t(`jobType.${jobType}`)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <div className={`${CARD_HEADER_CLASS} flex flex-wrap items-center justify-between gap-3`}>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t('jobHistoryTitle')}</span>
            <select
              className={SELECT_CLASS}
              value={jobTypeFilter}
              onChange={(event) => {
                setJobTypeFilter(event.target.value as MaintenanceJobType | '');
                setPage(1);
              }}
            >
              <option value="">{t('allJobTypes')}</option>
              {SWEEP_JOB_TYPES.map((jobType) => (
                <option key={jobType} value={jobType}>{t(`jobType.${jobType}`)}</option>
              ))}
            </select>
          </div>
          <div className={`${CARD_BODY_CLASS} overflow-x-auto`}>
            {loading ? (
              <div className="py-10 text-center text-sm text-neutral-500">{t('loading')}</div>
            ) : jobs.length === 0 ? (
              <div className="py-10 text-center text-sm text-neutral-500">{t('jobsEmpty')}</div>
            ) : (
              <table className={TABLE_CLASS}>
                <thead>
                  <tr className={TABLE_HEAD_CLASS}>
                    <th className="px-3 py-2">{t('colStarted')}</th>
                    <th className="px-3 py-2">{t('colJobType')}</th>
                    <th className="px-3 py-2">{t('colStatus')}</th>
                    <th className="px-3 py-2">{t('colScanned')}</th>
                    <th className="px-3 py-2">{t('colAffected')}</th>
                    <th className="px-3 py-2">{t('colOperator')}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className={TABLE_ROW_CLASS}>
                      <td className="px-3 py-2 whitespace-nowrap text-neutral-600 dark:text-neutral-300">
                        {formatTimestamp(job.startedAt)}
                      </td>
                      <td className="px-3 py-2 text-neutral-900 dark:text-neutral-100">{t(`jobType.${job.jobType}`)}</td>
                      <td className="px-3 py-2">
                        <span className={`${BADGE_BASE_CLASS} ${
                          job.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                        }`}>
                          {t(`status.${job.status}`)}
                          {job.dryRun ? ` · ${t('dryRunLabel')}` : ''}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{job.scannedCount}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{job.affectedCount}</td>
                      <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">{job.operatorId}</td>
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
            <span className="text-xs text-neutral-500">{t('pageOf', { page, totalPages })}</span>
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
