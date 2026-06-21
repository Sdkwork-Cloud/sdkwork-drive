import React, { useEffect, useState } from 'react';
import { Copy, Link2, Trash2, X } from 'lucide-react';
import { useTranslation } from 'sdkwork-drive-pc-commons';
import type {
  DriveFileService,
  DriveShareLink,
  DriveShareLinkRole,
  DriveShareLinkWithToken,
} from 'sdkwork-drive-pc-core';
import type { DriveFile } from 'sdkwork-drive-pc-types';

interface ShareLinkModalProps {
  isOpen: boolean;
  file: DriveFile | null;
  fileService: DriveFileService;
  onClose: () => void;
  onToast: (message: string, type?: 'success' | 'err' | 'info') => void;
}

export function ShareLinkModal({
  isOpen,
  file,
  fileService,
  onClose,
  onToast,
}: ShareLinkModalProps) {
  const { t } = useTranslation();
  const [links, setLinks] = useState<DriveShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<DriveShareLinkRole>('reader');
  const [latestToken, setLatestToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !file) {
      setLinks([]);
      setLatestToken(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fileService
      .listShareLinks(file.id)
      .then((items) => {
        if (!cancelled) {
          setLinks(items);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onToast(
            error instanceof Error ? error.message : t('fileBrowser.shareLinkLoadFailed'),
            'err',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file, fileService, isOpen, onToast, t]);

  if (!isOpen || !file) {
    return null;
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created: DriveShareLinkWithToken = await fileService.createShareLink(file.id, {
        role,
      });
      setLinks((previous) => [created, ...previous]);
      setLatestToken(created.token);
      onToast(t('fileBrowser.shareLinkCreated'), 'success');
    } catch (error: unknown) {
      onToast(
        error instanceof Error ? error.message : t('fileBrowser.shareLinkCreateFailed'),
        'err',
      );
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (shareLinkId: string) => {
    try {
      const revoked = await fileService.revokeShareLink(shareLinkId);
      if (revoked) {
        setLinks((previous) => previous.filter((link) => link.id !== shareLinkId));
        onToast(t('fileBrowser.shareLinkRevoked'), 'info');
      }
    } catch (error: unknown) {
      onToast(
        error instanceof Error ? error.message : t('fileBrowser.shareLinkRevokeFailed'),
        'err',
      );
    }
  };

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      onToast(t('fileBrowser.shareLinkCopied'), 'success');
    } catch {
      onToast(t('fileBrowser.shareLinkCopyFailed'), 'err');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-[#1a1a1a] animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={18} className="text-blue-500" />
            <h3 className="text-md font-bold text-gray-900 dark:text-white">
              {t('fileBrowser.shareLinkTitle')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
          {t('fileBrowser.shareLinkDesc', { name: file.name })}
        </p>

        <div className="mb-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
              {t('fileBrowser.shareLinkRole')}
            </label>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as DriveShareLinkRole)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-100"
            >
              <option value="reader">{t('fileBrowser.shareLinkRoleReader')}</option>
              <option value="commenter">{t('fileBrowser.shareLinkRoleCommenter')}</option>
              <option value="writer">{t('fileBrowser.shareLinkRoleWriter')}</option>
            </select>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {creating ? t('fileBrowser.shareLinkCreating') : t('fileBrowser.shareLinkCreate')}
          </button>
        </div>

        {latestToken ? (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              {t('fileBrowser.shareLinkNewToken')}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate text-xs text-blue-900 dark:text-blue-100">
                {latestToken}
              </code>
              <button
                type="button"
                onClick={() => copyToken(latestToken)}
                className="rounded-md p-1.5 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
                title={t('fileBrowser.shareLinkCopy')}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        ) : null}

        <div className="max-h-56 space-y-2 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400">{t('fileBrowser.fetchingObjects')}</p>
          ) : links.length === 0 ? (
            <p className="text-sm text-gray-400">{t('fileBrowser.shareLinkEmpty')}</p>
          ) : (
            links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-neutral-800"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                    {link.role}
                  </div>
                  <div className="text-xs text-gray-400">
                    {t('fileBrowser.shareLinkDownloads', { count: link.downloadCount })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(link.id)}
                  className="rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  title={t('fileBrowser.shareLinkRevoke')}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
