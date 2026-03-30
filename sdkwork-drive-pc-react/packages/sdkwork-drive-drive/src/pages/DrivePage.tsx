import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CloudUpload, Download, Star, Trash2, Undo2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBytes, pathUtils } from '@sdkwork/drive-commons';
import { Button } from '@sdkwork/drive-ui';
import type { DriveItem } from '../entities/drive.entity.ts';
import {
  DriveBreadcrumbs,
  DriveContextMenu,
  DriveDetailsPanel,
  DriveEmptyState,
  DriveGrid,
  DriveNameDialog,
  DriveLoadingState,
  DriveSidebar,
  DriveToolbar,
  DriveWorkspaceHero,
  FilePreviewModal,
} from '../components/index.ts';
import { useDriveStore } from '../store/driveStore.tsx';
import { getSelectedItemsTotalBytes } from '../store/driveStore.helpers.ts';
import { hasFilesInDataTransfer, resolveBatchStarStatus } from '../utils/interaction.ts';
import { isTypingElement, resolveDriveKeyboardAction } from '../utils/keyboard.ts';
import { resolveDriveEmptyStateMode } from '../utils/viewState.ts';
import {
  buildDriveDetailsPanelModel,
  buildDriveWorkspaceSummary,
} from '../utils/workspacePresentation.ts';

export function DrivePage() {
  const { t } = useTranslation();
  const {
    clearSelection,
    createFolder,
    currentPath,
    deleteItems,
    downloadItems,
    emptyTrash,
    filterType,
    focusSelection,
    isLoading,
    items,
    navigateTo,
    navigateUp,
    refresh,
    renameItem,
    restoreItems,
    searchQuery,
    selection,
    selectAll,
    setSort,
    setFilterType,
    selectedItems,
    sortBy,
    sortDirection,
    stats,
    toggleSelection,
    toggleStar,
    toggleStars,
    uploadFiles,
    viewMode,
  } = useDriveStore();
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: DriveItem | null } | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [nameDialogState, setNameDialogState] = useState<
    | { mode: 'create'; item: null }
    | { mode: 'rename'; item: DriveItem }
    | null
  >(null);
  const dragDepthRef = useRef(0);

  const isTrashView = currentPath === 'virtual://trash';
  const isVirtualView = currentPath.startsWith('virtual://');
  const canUpload = !currentPath.startsWith('virtual://');
  const nextBatchStarStatus = resolveBatchStarStatus(selectedItems);
  const selectedTotalBytes = getSelectedItemsTotalBytes(selectedItems);
  const singleSelectedItem = selectedItems.length === 1 ? selectedItems[0] : null;
  const emptyStateMode = resolveDriveEmptyStateMode({
    searchQuery,
    filterType,
    isTrashView,
  });
  const workspaceSummary = useMemo(
    () =>
      buildDriveWorkspaceSummary({
        currentPath,
        items,
        selectedItems,
        searchQuery,
        filterType,
        stats,
      }),
    [currentPath, filterType, items, searchQuery, selectedItems, stats],
  );
  const detailsPanelModel = useMemo(
    () =>
      buildDriveDetailsPanelModel({
        currentPath,
        items,
        selectedItems,
        searchQuery,
        filterType,
        stats,
      }),
    [currentPath, filterType, items, searchQuery, selectedItems, stats],
  );

  function handleOpenItem(item: DriveItem) {
    if (item.type === 'folder') {
      navigateTo(item.path || '/');
      return;
    }

    setPreviewItem(item);
  }

  function resetDragState() {
    dragDepthRef.current = 0;
    setIsDragActive(false);
  }

  function handleDragEnter(event: ReactDragEvent<HTMLElement>) {
    if (!canUpload || !hasFilesInDataTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  }

  function handleDragOver(event: ReactDragEvent<HTMLElement>) {
    if (!canUpload || !hasFilesInDataTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  function handleDragLeave(event: ReactDragEvent<HTMLElement>) {
    if (!canUpload || !hasFilesInDataTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  }

  async function handleDrop(event: ReactDragEvent<HTMLElement>) {
    if (!canUpload || !hasFilesInDataTransfer(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    resetDragState();

    if (files.length === 0) {
      return;
    }

    await uploadFiles(files);
  }

  function handleBackgroundContextMenu(event: ReactMouseEvent) {
    event.preventDefault();
    clearSelection();
    setContextMenu({ x: event.clientX, y: event.clientY, item: null });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const action = resolveDriveKeyboardAction({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        selectionCount: selection.size,
        isTypingTarget: isTypingElement(event.target),
        isTrashView,
        hasPreviewOpen: Boolean(previewItem),
        hasContextMenuOpen: Boolean(contextMenu),
        hasNameDialogOpen: Boolean(nameDialogState),
      });

      if (!action) {
        return;
      }

      event.preventDefault();

      switch (action) {
        case 'selectAll':
          selectAll();
          break;
        case 'openSelection':
          if (singleSelectedItem) {
            handleOpenItem(singleSelectedItem);
          }
          break;
        case 'previewSelection':
          if (singleSelectedItem?.type === 'file') {
            setPreviewItem(singleSelectedItem);
          }
          break;
        case 'deleteSelection':
          if (!isTrashView && selection.size > 0) {
            void deleteItems(Array.from(selection));
          }
          break;
        case 'renameSelection':
          if (!isTrashView && singleSelectedItem) {
            setNameDialogState({ mode: 'rename', item: singleSelectedItem });
          }
          break;
        case 'closePreview':
          setPreviewItem(null);
          break;
        case 'closeContextMenu':
          setContextMenu(null);
          break;
        case 'clearSelection':
          clearSelection();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    clearSelection,
    contextMenu,
    deleteItems,
    isTrashView,
    nameDialogState,
    previewItem,
    selectAll,
    selection,
    singleSelectedItem,
  ]);

  return (
    <div className="flex h-full min-h-0 gap-6">
      <DriveSidebar onCreateFolder={() => setNameDialogState({ mode: 'create', item: null })} />

      <section
        className="relative min-w-0 flex-1 space-y-6"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(event) => void handleDrop(event)}
      >
        <DriveWorkspaceHero
          summary={workspaceSummary}
          searchQuery={searchQuery}
          filterType={filterType}
          isTrashView={isTrashView}
          onNavigateUp={navigateUp}
          onSelectAll={selectAll}
          onEmptyTrash={() => void emptyTrash()}
        />

        <div className="relative space-y-4 rounded-[32px] border border-white/60 bg-white/85 p-5 shadow-2xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
          <DriveBreadcrumbs />
          <DriveToolbar onCreateFolder={() => setNameDialogState({ mode: 'create', item: null })} />

          {selection.size > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[24px] bg-primary-50 px-4 py-3 text-sm dark:bg-primary-950/30">
              <span className="font-semibold text-primary-700 dark:text-primary-300">
                {t('drive.selection.selected', { count: selection.size })}
              </span>
              <span className="text-xs font-medium text-primary-700/80 dark:text-primary-300/80">
                {t('drive.selection.totalSize', { size: formatBytes(selectedTotalBytes) })}
              </span>
              {!isTrashView ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => void downloadItems(Array.from(selection))}>
                    <Download className="h-4 w-4" />
                    {t('drive.actions.download')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void toggleStars(Array.from(selection), nextBatchStarStatus)}
                  >
                    <Star className="h-4 w-4" />
                    {nextBatchStarStatus ? t('drive.actions.addStar') : t('drive.actions.removeStar')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void deleteItems(Array.from(selection))}>
                    <Trash2 className="h-4 w-4" />
                    {t('drive.actions.moveToTrash')}
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={() => void restoreItems(Array.from(selection))}>
                    <Undo2 className="h-4 w-4" />
                    {t('drive.actions.restore')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void emptyTrash()}>
                    <Trash2 className="h-4 w-4" />
                    {t('drive.actions.emptyTrash')}
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                <X className="h-4 w-4" />
                {t('drive.actions.clearSelection')}
              </Button>
            </div>
          ) : null}

          {isLoading ? (
            <DriveLoadingState viewMode={viewMode} />
          ) : items.length === 0 ? (
            <DriveEmptyState
              mode={emptyStateMode}
              searchQuery={searchQuery}
              filterType={filterType}
              onClearSearch={() => navigateTo(currentPath)}
              onClearFilter={() => {
                if (filterType !== 'all') {
                  setFilterType('all');
                }
              }}
              onCreateFolder={
                canUpload ? () => setNameDialogState({ mode: 'create', item: null }) : undefined
              }
              onUpload={canUpload ? () => void uploadFiles() : undefined}
            />
          ) : (
            <DriveGrid
              items={items}
              selection={selection}
              viewMode={viewMode}
              sortBy={sortBy}
              sortDirection={sortDirection}
              isTrashView={isTrashView}
              isVirtualView={isVirtualView}
              onItemOpen={handleOpenItem}
              onItemPreview={setPreviewItem}
              onItemDownload={(item) => void downloadItems([item.id])}
              onItemToggleStar={(item) => void toggleStar(item.id, !item.isStarred)}
              onItemRestore={(item) => void restoreItems([item.id])}
              onSortChange={setSort}
              onItemContextMenu={(event, item) => {
                event.preventDefault();
                focusSelection(item.id);
                setContextMenu({ x: event.clientX, y: event.clientY, item });
              }}
              onItemSelect={toggleSelection}
              onBackgroundClick={() => {
                clearSelection();
                setContextMenu(null);
              }}
              onBackgroundContextMenu={handleBackgroundContextMenu}
            />
          )}

          {isDragActive && canUpload ? (
            <div className="pointer-events-none absolute inset-4 z-20 flex items-center justify-center rounded-[28px] border-2 border-dashed border-primary-400 bg-primary-500/10 backdrop-blur-sm">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-primary-600 shadow-lg shadow-primary-950/10 dark:bg-zinc-900/90">
                  <CloudUpload className="h-8 w-8" />
                </div>
                <div className="mt-5 text-xl font-bold text-zinc-950 dark:text-zinc-50">
                  {t('drive.dropzone.title')}
                </div>
                <div className="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">
                  {t('drive.dropzone.description')}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <DriveDetailsPanel
        model={detailsPanelModel}
        items={items}
        selectedItems={selectedItems}
        searchQuery={searchQuery}
        filterType={filterType}
        onCreateFolder={() => setNameDialogState({ mode: 'create', item: null })}
        onUpload={() => void uploadFiles()}
        onClearSearch={() => navigateTo(currentPath)}
        onClearFilter={() => {
          if (filterType !== 'all') {
            setFilterType('all');
          }
        }}
        onClearSelection={clearSelection}
        onOpenItem={handleOpenItem}
        onPreviewItem={setPreviewItem}
        onDownloadItems={(ids) => void downloadItems(ids)}
        onToggleStars={(ids, status) => void toggleStars(ids, status)}
        onDeleteItems={(ids) => void deleteItems(ids)}
        onRestoreItems={(ids) => void restoreItems(ids)}
        onEmptyTrash={() => void emptyTrash()}
      />

      {contextMenu ? (
        <DriveContextMenu
          position={{ x: contextMenu.x, y: contextMenu.y }}
          item={contextMenu.item}
          isTrashView={isTrashView}
          onClose={() => setContextMenu(null)}
          onOpen={handleOpenItem}
          onPreview={setPreviewItem}
          onCreateFolder={() => setNameDialogState({ mode: 'create', item: null })}
          onUpload={() => void uploadFiles()}
          onRefresh={() => void refresh()}
          onRename={(item) => setNameDialogState({ mode: 'rename', item })}
          onDelete={(item) => void deleteItems([item.id])}
          onRestore={(item) => void restoreItems([item.id])}
          onToggleStar={(item) => void toggleStar(item.id, !item.isStarred)}
          onDownload={(item) => void downloadItems([item.id])}
        />
      ) : null}

      <DriveNameDialog
        open={Boolean(nameDialogState)}
        title={
          nameDialogState?.mode === 'rename'
            ? t('drive.dialogs.renameTitle')
            : t('drive.dialogs.newFolderTitle')
        }
        description={
          nameDialogState?.mode === 'rename'
            ? t('drive.dialogs.renameDescription')
            : t('drive.dialogs.newFolderDescription')
        }
        confirmLabel={
          nameDialogState?.mode === 'rename'
            ? t('drive.actions.rename')
            : t('drive.actions.create')
        }
        initialValue={nameDialogState?.mode === 'rename' ? nameDialogState.item.name : ''}
        onOpenChange={(open) => {
          if (!open) {
            setNameDialogState(null);
          }
        }}
        onConfirm={async (value) => {
          if (nameDialogState?.mode === 'rename') {
            await renameItem(nameDialogState.item.id, value);
            return;
          }

          await createFolder(value);
        }}
      />

      <FilePreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onRevealInDrive={(item) => {
          const targetPath =
            item.type === 'folder' ? item.path || '/' : pathUtils.dirname(item.path || '/') || '/';
          navigateTo(targetPath || '/');
        }}
      />
    </div>
  );
}
