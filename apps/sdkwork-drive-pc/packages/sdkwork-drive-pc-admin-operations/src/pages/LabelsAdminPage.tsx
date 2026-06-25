import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DriveBackendSdkClient } from 'sdkwork-drive-pc-admin-core';
import type { SessionSnapshot } from 'sdkwork-drive-pc-core';
import { createDriveOperationsAdminService } from '../services/driveOperationsAdminService';
import type { LabelView } from '../types/driveOperationsAdminTypes';
import {
  CARD_BODY_CLASS,
  CARD_CLASS,
  CARD_HEADER_CLASS,
  DANGER_BUTTON_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  TABLE_CLASS,
  TABLE_HEAD_CLASS,
  TABLE_ROW_CLASS,
} from '../utils/uiPrimitives';
import { useTranslation } from '../hooks/useTranslation';

interface LabelsAdminPageProps {
  backendSdkClient: DriveBackendSdkClient;
  getSession: () => SessionSnapshot;
}

function isAbortError(value: unknown): boolean {
  if (value instanceof DOMException && value.name === 'AbortError') return true;
  return value instanceof Error && (value.name === 'AbortError' || /\babort(?:ed)?\b/i.test(value.message));
}

export function LabelsAdminPage({ backendSdkClient, getSession }: LabelsAdminPageProps) {
  const { t } = useTranslation();
  const service = useMemo(
    () => createDriveOperationsAdminService({ backendSdkClient, getSession }),
    [backendSdkClient, getSession],
  );
  const [labels, setLabels] = useState<LabelView[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [id, setId] = useState('');
  const [labelKey, setLabelKey] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const loadPage = useCallback(async ({
    append = false,
    pageToken,
    signal,
  }: {
    append?: boolean;
    pageToken?: string;
    signal?: AbortSignal;
  } = {}) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(undefined);
    try {
      const result = await service.listLabels({
        lifecycleStatus: 'active',
        pageSize: 50,
        pageToken,
        signal,
      });
      setLabels((current) => (append ? [...current, ...result.items] : result.items));
      setNextPageToken(result.nextPageToken ?? null);
    } catch (err) {
      if (!isAbortError(err)) setError(t('noticeLoadFailed'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [service, t]);

  useEffect(() => {
    const controller = new AbortController();
    void loadPage({ signal: controller.signal });
    return () => controller.abort();
  }, [loadPage]);

  const createLabel = async () => {
    setPending(true);
    setError(undefined);
    try {
      await service.createLabel({
        id: id.trim(),
        labelKey: labelKey.trim(),
        displayName: displayName.trim(),
      });
      setId('');
      setLabelKey('');
      setDisplayName('');
      await loadPage();
    } catch (err) {
      if (!isAbortError(err)) setError(t('noticeOperationFailed'));
    } finally {
      setPending(false);
    }
  };

  const beginEdit = (label: LabelView) => {
    setEditingLabelId(label.id);
    setEditDisplayName(label.displayName);
    setEditColor(label.color ?? '');
    setEditDescription(label.description ?? '');
  };

  const cancelEdit = () => {
    setEditingLabelId(null);
    setEditDisplayName('');
    setEditColor('');
    setEditDescription('');
  };

  const saveEdit = async () => {
    if (!editingLabelId) return;
    setPending(true);
    setError(undefined);
    try {
      await service.updateLabel(editingLabelId, {
        displayName: editDisplayName.trim() || undefined,
        color: editColor.trim() || undefined,
        description: editDescription.trim() || undefined,
      });
      cancelEdit();
      await loadPage();
    } catch (err) {
      if (!isAbortError(err)) setError(t('noticeOperationFailed'));
    } finally {
      setPending(false);
    }
  };

  const deleteLabel = async (labelId: string) => {
    setPending(true);
    setError(undefined);
    try {
      await service.deleteLabel(labelId);
      if (editingLabelId === labelId) {
        cancelEdit();
      }
      await loadPage();
    } catch (err) {
      if (!isAbortError(err)) setError(t('noticeOperationFailed'));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#fafafa] dark:bg-[#111]">
      <div className="border-b border-neutral-200 bg-white px-6 py-4 dark:border-neutral-800 dark:bg-[#161616]">
        <h1 className="text-lg font-semibold">{t('labelsPageTitle')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('labelsPageDescription')}</p>
      </div>
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
        <div className={CARD_CLASS}>
          <div className={CARD_HEADER_CLASS}>{t('createLabelTitle')}</div>
          <div className={`${CARD_BODY_CLASS} grid gap-3 md:grid-cols-4`}>
            <input className={INPUT_CLASS} value={id} onChange={(e) => setId(e.target.value)} placeholder={t('labelIdPlaceholder')} />
            <input className={INPUT_CLASS} value={labelKey} onChange={(e) => setLabelKey(e.target.value)} placeholder={t('labelKeyPlaceholder')} />
            <input className={INPUT_CLASS} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t('labelNamePlaceholder')} />
            <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={pending || !id.trim() || !labelKey.trim() || !displayName.trim()} onClick={() => void createLabel()}>
              {t('createLabelAction')}
            </button>
          </div>
        </div>
        <div className={CARD_CLASS}>
          <div className={CARD_HEADER_CLASS}>{t('labelsListTitle')}</div>
          <div className={`${CARD_BODY_CLASS} overflow-x-auto`}>
            {loading ? <div className="py-8 text-center text-sm text-neutral-500">{t('loading')}</div> : labels.length === 0 ? (
              <div className="py-8 text-center text-sm text-neutral-500">{t('labelsEmpty')}</div>
            ) : (
              <table className={TABLE_CLASS}>
                <thead><tr className={TABLE_HEAD_CLASS}>
                  <th className="px-3 py-2">{t('colLabelKey')}</th>
                  <th className="px-3 py-2">{t('colDisplayName')}</th>
                  <th className="px-3 py-2">{t('colColor')}</th>
                  <th className="px-3 py-2">{t('colDescription')}</th>
                  <th className="px-3 py-2">{t('colActions')}</th>
                </tr></thead>
                <tbody>
                  {labels.map((label) => (
                    <tr key={label.id} className={TABLE_ROW_CLASS}>
                      <td className="px-3 py-2 font-mono text-xs">{label.labelKey}</td>
                      <td className="px-3 py-2">
                        {editingLabelId === label.id ? (
                          <input className={INPUT_CLASS} value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} />
                        ) : label.displayName}
                      </td>
                      <td className="px-3 py-2">
                        {editingLabelId === label.id ? (
                          <input className={INPUT_CLASS} value={editColor} onChange={(e) => setEditColor(e.target.value)} placeholder={t('labelColorPlaceholder')} />
                        ) : (label.color || '--')}
                      </td>
                      <td className="px-3 py-2">
                        {editingLabelId === label.id ? (
                          <input className={INPUT_CLASS} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder={t('labelDescriptionPlaceholder')} />
                        ) : (label.description || '--')}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {editingLabelId === label.id ? (
                            <>
                              <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={pending || !editDisplayName.trim()} onClick={() => void saveEdit()}>
                                {t('saveLabelAction')}
                              </button>
                              <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={pending} onClick={cancelEdit}>
                                {t('cancelLabelAction')}
                              </button>
                            </>
                          ) : (
                            <button type="button" className={SECONDARY_BUTTON_CLASS} disabled={pending} onClick={() => beginEdit(label)}>
                              {t('editLabelAction')}
                            </button>
                          )}
                          <button type="button" className={DANGER_BUTTON_CLASS} disabled={pending} onClick={() => void deleteLabel(label.id)}>
                            {t('deleteLabelAction')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {nextPageToken ? (
            <div className="border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
              <button
                type="button"
                className={SECONDARY_BUTTON_CLASS}
                disabled={loadingMore || pending}
                onClick={() => void loadPage({ append: true, pageToken: nextPageToken })}
              >
                {loadingMore ? t('loading') : t('loadMoreLabels')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
