import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, LoaderCircle, Share2, Star } from 'lucide-react';
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
import { buildPreviewFacts } from '../utils/viewState.ts';

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
}

export function FilePreviewModal({ item, onClose }: FilePreviewModalProps) {
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
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.path}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-h-[420px] overflow-hidden rounded-[24px] border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
            {isRenderableImage(item) ? (
              <img src={item.previewUrl} alt={item.name} className="h-full w-full object-contain" />
            ) : isRenderableVideo(item) ? (
              <video src={item.previewUrl} className="h-full w-full" controls autoPlay />
            ) : isRenderableAudio(item) ? (
              <div className="flex h-full items-center justify-center px-8">
                <audio src={item.previewUrl} className="w-full" controls autoPlay />
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

          <aside className="space-y-4 rounded-[24px] border border-white/60 bg-white/90 p-5 shadow-xl shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900/90">
            <div className="flex flex-wrap items-center gap-2">
              {item.isStarred ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {t('drive.preview.badges.starred')}
                </div>
              ) : null}
              {item.isShared ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300">
                  <Share2 className="h-3.5 w-3.5" />
                  {t('drive.preview.badges.shared')}
                </div>
              ) : null}
            </div>

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

            <Button variant="outline" className="w-full justify-start" onClick={() => void handleCopyPath()}>
              <Copy className="h-4 w-4" />
              {t('drive.preview.copyPath')}
            </Button>
          </aside>
        </div>

        <DialogFooter>
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
