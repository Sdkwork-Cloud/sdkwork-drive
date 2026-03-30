import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { pathUtils } from '@sdkwork/drive-commons';
import type { DriveItem, DriveStats } from '../entities/drive.entity.ts';
import { driveBusinessService } from '../services/driveBusinessService.ts';
import { normalizeBrowserFiles, pickBrowserFiles, type UploadFile } from '../utils/uploadHelper.ts';
import {
  buildSelectionRange,
  createDriveLoadRequestTracker,
  filterDriveItems,
  readDriveViewPreferences,
  sortDriveItems,
  writeDriveViewPreferences,
  type FileTypeFilter,
  type SortDirection,
  type SortOption,
  type ViewMode,
} from './driveStore.helpers.ts';

export interface DriveStoreProviderProps {
  children: ReactNode;
  path: string;
  searchQuery: string;
  onNavigate: (path: string) => void;
}

interface DriveStoreContextValue {
  rootPath: string;
  currentPath: string;
  items: DriveItem[];
  rawItems: DriveItem[];
  selectedItems: DriveItem[];
  stats: DriveStats | null;
  isLoading: boolean;
  isVirtualView: boolean;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selection: Set<string>;
  focusSelection: (id: string) => void;
  toggleSelection: (id: string, multi: boolean, range?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  sortBy: SortOption;
  sortDirection: SortDirection;
  setSort: (sortBy: SortOption, sortDirection: SortDirection) => void;
  filterType: FileTypeFilter;
  setFilterType: (filterType: FileTypeFilter) => void;
  searchQuery: string;
  navigateTo: (path: string) => void;
  navigateHome: () => void;
  navigateUp: () => void;
  refresh: () => Promise<void>;
  createFolder: (name: string) => Promise<boolean>;
  uploadFiles: (files?: File[]) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  restoreItems: (ids: string[]) => Promise<void>;
  emptyTrash: () => Promise<void>;
  toggleStar: (id: string, status: boolean) => Promise<void>;
  toggleStars: (ids: string[], status: boolean) => Promise<void>;
  renameItem: (id: string, newName: string) => Promise<void>;
  downloadItems: (ids: string[]) => Promise<void>;
}

const DriveStoreContext = createContext<DriveStoreContextValue | null>(null);

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Drive request failed.';
}

function assertSuccess<T>(result: { success: boolean; data?: T; message?: string }, fallback: string) {
  if (!result.success) {
    throw new Error(result.message || fallback);
  }

  return result.data as T;
}

export function DriveStoreProvider({
  children,
  path,
  searchQuery,
  onNavigate,
}: DriveStoreProviderProps) {
  const initialViewPreferences = useMemo(() => readDriveViewPreferences(), []);
  const [rootPath, setRootPath] = useState('/');
  const [currentPath, setCurrentPath] = useState(path);
  const [rawItems, setRawItems] = useState<DriveItem[]>([]);
  const [stats, setStats] = useState<DriveStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewPreferences.viewMode);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>(initialViewPreferences.sortBy);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialViewPreferences.sortDirection);
  const [filterType, setFilterType] = useState<FileTypeFilter>(initialViewPreferences.filterType);
  const loadRequestTrackerRef = useRef(createDriveLoadRequestTracker());

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await driveBusinessService.getDefaultPath();
        const nextRootPath = assertSuccess(result, 'Failed to load drive root');
        if (!cancelled) {
          setRootPath(nextRootPath || '/');
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadPath(nextPath: string) {
    const requestId = loadRequestTrackerRef.current.begin();
    setIsLoading(true);
    setSelection(new Set());
    setSelectionAnchorId(null);

    try {
      const [itemsResult, statsResult] = await Promise.all([
        driveBusinessService.list(nextPath),
        driveBusinessService.getStats(),
      ]);

      if (!loadRequestTrackerRef.current.isCurrent(requestId)) {
        return;
      }

      setRawItems(assertSuccess(itemsResult, 'Failed to load files'));
      setStats(assertSuccess(statsResult, 'Failed to load storage usage'));
      setCurrentPath(nextPath);
    } catch (error) {
      if (!loadRequestTrackerRef.current.isCurrent(requestId)) {
        return;
      }

      toast.error(getErrorMessage(error));
      setRawItems([]);
      setStats(null);
    } finally {
      if (loadRequestTrackerRef.current.isCurrent(requestId)) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadPath(path);
  }, [path]);

  useEffect(() => {
    writeDriveViewPreferences({
      viewMode,
      sortBy,
      sortDirection,
      filterType,
    });
  }, [filterType, sortBy, sortDirection, viewMode]);

  const items = useMemo(() => {
    const filteredItems = filterDriveItems(rawItems, {
      filterType,
      searchQuery,
    });

    return sortDriveItems(filteredItems, sortBy, sortDirection);
  }, [filterType, rawItems, searchQuery, sortBy, sortDirection]);

  const selectedItems = useMemo(() => {
    return rawItems.filter((item) => selection.has(item.id));
  }, [rawItems, selection]);

  function navigateTo(nextPath: string) {
    onNavigate(nextPath);
  }

  function navigateHome() {
    onNavigate(rootPath || '/');
  }

  function navigateUp() {
    if (currentPath.startsWith('virtual://')) {
      onNavigate(rootPath || '/');
      return;
    }

    const parentPath = pathUtils.dirname(currentPath || rootPath || '/');
    onNavigate(parentPath || '/');
  }

  async function refresh() {
    await loadPath(currentPath);
  }

  async function createFolder(name: string) {
    const result = await driveBusinessService.createFolder(name.trim(), currentPath);
    if (!result.success) {
      toast.error(result.message || 'Failed to create folder.');
      return false;
    }

    await refresh();
    return true;
  }

  async function uploadFiles(files?: File[]) {
    try {
      setIsLoading(true);
      const uploads: UploadFile[] = files?.length
        ? await normalizeBrowserFiles(files)
        : await pickBrowserFiles({ multiple: true });

      for (const file of uploads) {
        const result = await driveBusinessService.uploadFile(currentPath, file.name, file.data);
        if (!result.success) {
          throw new Error(result.message || `Failed to upload ${file.name}`);
        }
      }

      if (uploads.length > 0) {
        toast.success(`Uploaded ${uploads.length} item${uploads.length === 1 ? '' : 's'}.`);
      }

      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteItems(ids: string[]) {
    const result = await driveBusinessService.delete(ids);
    if (!result.success) {
      toast.error(result.message || 'Failed to move items to trash.');
      return;
    }

    await refresh();
  }

  async function restoreItems(ids: string[]) {
    const result = await driveBusinessService.restore(ids);
    if (!result.success) {
      toast.error(result.message || 'Failed to restore items.');
      return;
    }

    await refresh();
  }

  async function emptyTrash() {
    const result = await driveBusinessService.emptyTrash();
    if (!result.success) {
      toast.error(result.message || 'Failed to empty trash.');
      return;
    }

    await refresh();
  }

  async function toggleStar(id: string, status: boolean) {
    await toggleStars([id], status);
  }

  async function toggleStars(ids: string[], status: boolean) {
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      return;
    }

    const results = await Promise.all(
      uniqueIds.map((id) => driveBusinessService.toggleStar(id, status)),
    );
    const failures = results.filter((result) => !result.success);

    if (failures.length === uniqueIds.length) {
      toast.error(failures[0]?.message || 'Failed to update item star state.');
      return;
    }

    await refresh();

    if (failures.length > 0) {
      toast.error(`${failures.length} item${failures.length === 1 ? '' : 's'} failed to update star state.`);
    }
  }

  async function renameItem(id: string, newName: string) {
    const result = await driveBusinessService.rename(id, newName.trim());
    if (!result.success) {
      toast.error(result.message || 'Failed to rename item.');
      return;
    }

    await refresh();
  }

  async function downloadItems(ids: string[]) {
    const candidates = rawItems.filter((item) => ids.includes(item.id));
    if (candidates.length === 0) {
      return;
    }

    const result = await driveBusinessService.downloadItems(candidates);
    if (!result.success) {
      toast.error(result.message || 'Failed to download files.');
      return;
    }

    toast.success(`Downloaded ${result.data?.length || candidates.length} item${candidates.length === 1 ? '' : 's'}.`);
  }

  function toggleSelection(id: string, multi: boolean, range = false) {
    const orderedIds = items.map((item) => item.id);

    if (range) {
      setSelection(new Set(buildSelectionRange(orderedIds, selectionAnchorId, id)));
      setSelectionAnchorId(selectionAnchorId || id);
      return;
    }

    setSelection((currentSelection) => {
      const nextSelection = multi ? new Set(currentSelection) : new Set<string>();
      if (nextSelection.has(id)) {
        nextSelection.delete(id);
      } else {
        nextSelection.add(id);
      }
      return nextSelection;
    });
    setSelectionAnchorId(id);
  }

  function focusSelection(id: string) {
    setSelection((currentSelection) => {
      if (currentSelection.has(id)) {
        return currentSelection;
      }
      return new Set([id]);
    });
    setSelectionAnchorId(id);
  }

  function clearSelection() {
    setSelection(new Set());
    setSelectionAnchorId(null);
  }

  function selectAll() {
    setSelection(new Set(items.map((item) => item.id)));
    setSelectionAnchorId(items[0]?.id ?? null);
  }

  const contextValue: DriveStoreContextValue = {
    rootPath,
    currentPath,
    items,
    rawItems,
    selectedItems,
    stats,
    isLoading,
    isVirtualView: currentPath.startsWith('virtual://'),
    viewMode,
    setViewMode,
    selection,
    focusSelection,
    toggleSelection,
    clearSelection,
    selectAll,
    sortBy,
    sortDirection,
    setSort: (nextSortBy, nextSortDirection) => {
      setSortBy(nextSortBy);
      setSortDirection(nextSortDirection);
    },
    filterType,
    setFilterType,
    searchQuery,
    navigateTo,
    navigateHome,
    navigateUp,
    refresh,
    createFolder,
    uploadFiles,
    deleteItems,
    restoreItems,
    emptyTrash,
    toggleStar,
    toggleStars,
    renameItem,
    downloadItems,
  };

  return (
    <DriveStoreContext.Provider value={contextValue}>
      {children}
    </DriveStoreContext.Provider>
  );
}

export function useDriveStore() {
  const context = useContext(DriveStoreContext);
  if (!context) {
    throw new Error('useDriveStore must be used within a DriveStoreProvider.');
  }

  return context;
}
