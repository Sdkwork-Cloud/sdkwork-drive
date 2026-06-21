import React, { useEffect, useMemo, useState } from 'react';
import { FolderInput, X } from 'lucide-react';
import { useTranslation } from 'sdkwork-drive-pc-commons';
import type { DriveFileService } from 'sdkwork-drive-pc-core';
import type { DriveFile } from 'sdkwork-drive-pc-types';

export type MoveCopyMode = 'move' | 'copy';

interface MoveCopyModalProps {
  isOpen: boolean;
  mode: MoveCopyMode;
  files: DriveFile[];
  activeSection: string;
  fileService: DriveFileService;
  onClose: () => void;
  onCompleted: () => void;
  onToast: (message: string, type?: 'success' | 'err' | 'info') => void;
}

export function MoveCopyModal({
  isOpen,
  mode,
  files,
  activeSection,
  fileService,
  onClose,
  onCompleted,
  onToast,
}: MoveCopyModalProps) {
  const { t } = useTranslation();
  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [targetParentId, setTargetParentId] = useState<string>('');

  const selectedIds = useMemo(() => new Set(files.map((file) => file.id)), [files]);

  useEffect(() => {
    if (!isOpen) {
      setTargetParentId('');
      return;
    }

    let cancelled = false;
    setLoading(true);
    fileService
      .getAllWorkspaceFiles()
      .then((workspaceFiles) => {
        if (cancelled) {
          return;
        }
        const folderCandidates = workspaceFiles.filter(
          (entry) => entry.type === 'folder' && !selectedIds.has(entry.id),
        );
        setFolders(folderCandidates);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onToast(
            error instanceof Error ? error.message : t('fileBrowser.moveCopyLoadFailed'),
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
  }, [activeSection, fileService, isOpen, onToast, selectedIds, t]);

  if (!isOpen || files.length === 0) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const parentId = targetParentId.trim() || null;

    try {
      if (mode === 'move') {
        await Promise.all(
          files.map((file) => fileService.moveFile(file.id, parentId)),
        );
        onToast(t('fileBrowser.moveCompleted', { count: files.length }), 'success');
      } else {
        await Promise.all(
          files.map((file) =>
            fileService.copyFile(file.id, {
              targetParentNodeId: parentId,
            }),
          ),
        );
        onToast(t('fileBrowser.copyCompleted', { count: files.length }), 'success');
      }
      onCompleted();
      onClose();
    } catch (error: unknown) {
      onToast(
        error instanceof Error ? error.message : t('fileBrowser.moveCopyFailed'),
        'err',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === 'move' ? t('fileBrowser.moveTitle') : t('fileBrowser.copyTitle');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[420px] rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-[#1a1a1a] animate-in zoom-in-95 duration-200">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderInput size={18} className="text-blue-500" />
            <h3 className="text-md font-bold text-gray-900 dark:text-white">{title}</h3>
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
          {t('fileBrowser.moveCopyDesc', { count: files.length })}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-500">
              {t('fileBrowser.moveCopyTarget')}
            </label>
            <select
              value={targetParentId}
              onChange={(event) => setTargetParentId(event.target.value)}
              disabled={loading || submitting}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-100"
            >
              <option value="">{t('fileBrowser.moveCopyRoot')}</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cursor-pointer rounded-lg bg-gray-50 py-3 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:bg-[#252525] dark:text-gray-300 dark:hover:bg-[#303030]"
            >
              {t('fileBrowser.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || submitting}
              className="flex-1 cursor-pointer rounded-lg bg-blue-600 py-3 text-xs font-bold text-white transition-colors hover:bg-blue-700/90 disabled:opacity-60"
            >
              {submitting ? t('fileBrowser.moveCopySubmitting') : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
