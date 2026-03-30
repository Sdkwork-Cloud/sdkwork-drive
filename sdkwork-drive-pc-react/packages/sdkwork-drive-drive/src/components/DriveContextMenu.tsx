import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Download,
  Eye,
  FolderOpen,
  FolderPen,
  FolderPlus,
  RefreshCw,
  Star,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DriveItem } from '../entities/drive.entity.ts';
import { clampMenuPosition, type Point } from '../utils/interaction.ts';

function MenuAction({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30'
          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export interface DriveContextMenuProps {
  position: Point;
  item: DriveItem | null;
  isTrashView: boolean;
  onClose: () => void;
  onOpen: (item: DriveItem) => void;
  onPreview: (item: DriveItem) => void;
  onCreateFolder: () => void;
  onUpload: () => void;
  onRefresh: () => void;
  onRename: (item: DriveItem) => void;
  onDelete: (item: DriveItem) => void;
  onRestore: (item: DriveItem) => void;
  onToggleStar: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
}

export function DriveContextMenu({
  position,
  item,
  isTrashView,
  onClose,
  onOpen,
  onPreview,
  onCreateFolder,
  onUpload,
  onRefresh,
  onRename,
  onDelete,
  onRestore,
  onToggleStar,
  onDownload,
}: DriveContextMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [resolvedPosition, setResolvedPosition] = useState(position);

  useLayoutEffect(() => {
    function updatePosition() {
      if (!menuRef.current || typeof window === 'undefined') {
        setResolvedPosition(position);
        return;
      }

      const { width, height } = menuRef.current.getBoundingClientRect();
      setResolvedPosition(
        clampMenuPosition(
          position,
          {
            width,
            height,
          },
          {
            width: window.innerWidth,
            height: window.innerHeight,
          },
        ),
      );
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
    };
  }, [isTrashView, item, position]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-[220px] rounded-[24px] border border-white/60 bg-white/95 p-2 shadow-2xl shadow-zinc-950/20 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95"
      style={{ left: resolvedPosition.x, top: resolvedPosition.y }}
    >
      {item ? (
        <>
          <MenuAction
            icon={item.type === 'folder' ? FolderOpen : Eye}
            label={item.type === 'folder' ? t('drive.actions.open') : t('drive.actions.preview')}
            onClick={() => {
              onClose();
              if (item.type === 'folder') {
                onOpen(item);
              } else {
                onPreview(item);
              }
            }}
          />
          {item.type === 'file' ? (
            <MenuAction
              icon={Download}
              label={t('drive.actions.download')}
              onClick={() => {
                onClose();
                onDownload(item);
              }}
            />
          ) : null}
          {!isTrashView ? (
            <>
              <MenuAction
                icon={FolderPen}
                label={t('drive.actions.rename')}
                onClick={() => {
                  onClose();
                  onRename(item);
                }}
              />
              <MenuAction
                icon={Star}
                label={item.isStarred ? t('drive.actions.removeStar') : t('drive.actions.addStar')}
                onClick={() => {
                  onClose();
                  onToggleStar(item);
                }}
              />
              <MenuAction
                icon={Trash2}
                label={t('drive.actions.moveToTrash')}
                danger
                onClick={() => {
                  onClose();
                  onDelete(item);
                }}
              />
            </>
          ) : (
            <MenuAction
              icon={Undo2}
              label={t('drive.actions.restore')}
              onClick={() => {
                onClose();
                onRestore(item);
              }}
            />
          )}
        </>
      ) : (
        <>
          <MenuAction
            icon={FolderPlus}
            label={t('drive.actions.newFolder')}
            onClick={() => {
              onClose();
              onCreateFolder();
            }}
          />
          {!isTrashView ? (
            <MenuAction
              icon={Upload}
              label={t('drive.actions.upload')}
              onClick={() => {
                onClose();
                onUpload();
              }}
            />
          ) : null}
          <MenuAction
            icon={RefreshCw}
            label={t('drive.actions.refresh')}
            onClick={() => {
              onClose();
              onRefresh();
            }}
          />
        </>
      )}
    </div>
  );
}
