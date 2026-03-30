import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, LoaderCircle, MapPin, Share2, Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@sdkwork/drive-ui';
import type { DriveItem } from '../entities/drive.entity.ts';
import { driveBusinessService } from '../services/driveBusinessService.ts';
import { resolveDriveItemKindLabel } from '../utils/driveItemPresentation.ts';
import {
  buildPreviewFacts,
  buildPreviewHighlightFacts,
  buildPreviewStatusFlagIds,
  resolvePreviewRevealPath,
} from '../utils/viewState.ts';
import { FileIcon } from './FileIcon.tsx';

function isRenderableImage(item: DriveItem) {
  return Boolean(item.previewUrl && (item.mimeType || '').startsWith('image/'));
}

function isRenderableVideo(item: DriveItem) {
  return Boolean(item.previewUrl && (item.mimeType || '').startsWith('video/'));
}

function isRenderableAudio(item: DriveItem) {
  return Boolean(item.previewUrl && (item.mimeType || '').startsWith('audio/'));
}

function isRenderablePdf(item: DriveItem) {
  return Boolean(item.previewUrl && (item.mimeType || '').includes('pdf'));
}

export interface FilePreviewModalProps {
  item: DriveItem | null;
  onClose: () => void;
  onRevealInDrive?: (item: DriveItem) => void;
}

export function FilePreviewModal({ item, onClose, onRevealInDrive }: FilePreviewModalProps) {
  const { t } = useTranslation();
  const [textContent, setTextContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const needsTextFetch = useMemo(() => {
    if (!item || item.type !== 'file') {
      return false;
    }

    return !isRenderableImage(item) && !isRenderableVideo(item) && !isRenderableAudio(item) && !isRenderablePdf(item);
  }, [item]);

  useEffect(() => {
    let cancelled = false;

    if (!item || !needsTextFetch) {
      setTextContent('');
      setErrorMessage('');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    void (async () => {
      try {
        const result = await driveBusinessService.getFileContent(item.id);
        if (cancelled) {
          return;
        }

        if (result.success) {
          setTextContent(result.data || '');
        } else {
          setErrorMessage(result.message || t('drive.preview.unavailable'));
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : t('drive.preview.unavailable'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item, needsTextFetch, t]);

  if (!item) {
    return null;
  }

  const previewFacts = buildPreviewFacts(item);
  const highlightFacts = buildPreviewHighlightFacts(previewFacts);
  const previewStatusFlags = buildPreviewStatusFlagIds(item);
  const revealPath = resolvePreviewRevealPath(item);

  function resolveFactValue(id: string, value: string) {
    if (id === 'starred' || id === 'shared') {
      return value === 'true' ? t('common.yes') : t('common.no');
    }

    return value;
  }

  async function handleDownload() {
    const result = await driveBusinessService.downloadItems([item]);
    if (!result.success) {
      toast.error(result.message || 'Failed to download file.');
      return;
    }

    toast.success(t('drive.preview.downloadReady'));
  }

  async function handleCopyPath() {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(item.path || item.name);
      toast.success(t('common.copied'));
    } catch {
      toast.error(t('drive.preview.copyPathFailed'));
    }
  }

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-6xl overflow-hidden border-white/70 bg-white/96 p-0 shadow-2xl shadow-zinc-950/15 dark:border-zinc-800 dark:bg-zinc-950/96">
        <DialogHeader className="border-b border-zinc-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.92))] px-6 py-5 dark:border-zinc-800 dark:bg-[linear-gradient(135deg,rgba(24,24,27,0.96),rgba(15,23,42,0.92))]">
          <div className="flex flex-wrap items-start gap-4">
            <div className="rounded-[26px] border border-white/70 bg-white/92 p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/92">
              <FileIcon item={item} className="h-7 w-7" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-primary-200/80 bg-primary-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700 dark:border-primary-500/30 dark:bg-primary-950/40 dark:text-primary-300">
                  {resolveDriveItemKindLabel(item)}
                </span>
                {previewStatusFlags.map((flag) => (
                  <span
                    key={flag}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                      flag === 'starred'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
                    }`}
                  >
                    {flag === 'starred' ? (
                      <Star className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" />
                    )}
                    {t(`drive.preview.badges.${flag}`)}
                  </span>
                ))}
              </div>
              <DialogTitle className="mt-3 truncate text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50">
                {item.name}
              </DialogTitle>
              <DialogDescription className="mt-2 break-all text-sm text-zinc-500 dark:text-zinc-400">
                {item.path}
              </DialogDescription>
            </div>

            <div className="flex max-w-full flex-wrap justify-end gap-2">
              {highlightFacts.map((fact) => (
                <div
                  key={fact.id}
                  className="rounded-2xl border border-white/70 bg-white/92 px-3 py-2 text-right shadow-sm dark:border-zinc-700 dark:bg-zinc-900/92"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    {t(`drive.preview.fields.${fact.id}`)}
                  </div>
                  <div className="mt-1 max-w-[11rem] break-all text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {resolveFactValue(fact.id, fact.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-[420px] overflow-hidden rounded-[28px] border border-zinc-200/70 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,244,245,0.92))] shadow-inner shadow-zinc-950/5 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_42%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(15,23,42,0.94))]">
            {isRenderableImage(item) ? (
              <img src={item.previewUrl} alt={item.name} className="h-full max-h-[70vh] w-full object-contain" />
            ) : isRenderableVideo(item) ? (
              <video src={item.previewUrl} className="h-full max-h-[70vh] w-full" controls autoPlay />
            ) : isRenderableAudio(item) ? (
              <div className="flex h-full min-h-[420px] items-center justify-center px-8">
                <audio src={item.previewUrl} className="w-full max-w-2xl" controls autoPlay />
              </div>
            ) : isRenderablePdf(item) ? (
              <iframe src={item.previewUrl} title={item.name} className="h-[70vh] w-full" />
            ) : isLoading ? (
              <div className="flex h-[420px] items-center justify-center gap-3 text-zinc-500 dark:text-zinc-400">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                {t('common.loading')}
              </div>
            ) : errorMessage ? (
              <div className="flex h-[420px] items-center justify-center px-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {errorMessage}
              </div>
            ) : (
              <pre className="h-[70vh] overflow-auto p-6 text-sm leading-7 text-zinc-700 dark:text-zinc-200">
                {textContent || t('drive.preview.empty')}
              </pre>
            )}
          </div>

          <aside className="space-y-4 rounded-[28px] border border-white/60 bg-white/90 p-5 shadow-xl shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900/90">
            <div className="rounded-[24px] border border-zinc-200/70 bg-zinc-50/85 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                {t('drive.details.quickActions')}
              </div>
              <div className="mt-4 grid gap-2">
                <Button className="w-full justify-start" onClick={() => void handleDownload()}>
                  <Download className="h-4 w-4" />
                  {t('drive.actions.download')}
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => void handleCopyPath()}>
                  <Copy className="h-4 w-4" />
                  {t('drive.preview.copyPath')}
                </Button>
                {onRevealInDrive ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      onRevealInDrive(item);
                      onClose();
                    }}
                  >
                    <MapPin className="h-4 w-4" />
                    {t('drive.actions.showInDrive', { path: revealPath })}
                  </Button>
                ) : null}
              </div>
            </div>

            {previewStatusFlags.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {previewStatusFlags.map((flag) => (
                  <div
                    key={`aside-${flag}`}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                      flag === 'starred'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300'
                    }`}
                  >
                    {flag === 'starred' ? (
                      <Star className="h-3.5 w-3.5 fill-current" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" />
                    )}
                    {t(`drive.preview.badges.${flag}`)}
                  </div>
                ))}
              </div>
            ) : null}

            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                {t('drive.preview.detailsTitle')}
              </div>
              <div className="mt-3 space-y-3">
                {previewFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/70"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                      {t(`drive.preview.fields.${fact.id}`)}
                    </div>
                    <div className="mt-1 break-all text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {resolveFactValue(fact.id, fact.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <DialogFooter className="border-t border-zinc-200/70 px-6 py-4 dark:border-zinc-800">
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
          <Button onClick={() => void handleDownload()}>
            <Download className="h-4 w-4" />
            {t('drive.actions.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
