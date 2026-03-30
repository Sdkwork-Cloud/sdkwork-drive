import { useEffect, useState } from 'react';
import type { DriveItem } from '../entities/drive.entity.ts';
import { resolveDriveItemThumbnailSrc } from '../utils/driveItemPresentation.ts';
import { FileIcon } from './FileIcon.tsx';

export interface DriveItemVisualProps {
  item: DriveItem;
  variant: 'list' | 'card';
}

export function DriveItemVisual({ item, variant }: DriveItemVisualProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [item.id, item.thumbnailUrl, item.previewUrl]);

  const thumbnailSrc = imageFailed ? null : resolveDriveItemThumbnailSrc(item);

  if (variant === 'card') {
    if (thumbnailSrc) {
      return (
        <div className="h-32 w-full overflow-hidden rounded-[22px] border border-white/60 bg-zinc-100 shadow-inner shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900">
          <img
            src={thumbnailSrc}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        </div>
      );
    }

    return (
      <div className="flex h-32 w-full items-center justify-center rounded-[22px] border border-white/60 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,244,245,0.92))] text-zinc-600 shadow-inner shadow-zinc-950/5 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_45%),linear-gradient(180deg,rgba(24,24,27,0.98),rgba(15,23,42,0.92))] dark:text-zinc-300">
        <div className="rounded-[22px] bg-white/90 p-4 shadow-sm dark:bg-zinc-900/90">
          <FileIcon item={item} className="h-9 w-9" />
        </div>
      </div>
    );
  }

  if (thumbnailSrc) {
    return (
      <div className="h-12 w-12 overflow-hidden rounded-2xl border border-white/60 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <img
          src={thumbnailSrc}
          alt={item.name}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-zinc-100 p-3 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      <FileIcon item={item} className="h-5 w-5" />
    </div>
  );
}
