/// <reference path="./styles.d.ts" />

import {
  ArrowLeft,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  File,
  FilePenLine,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Info,
  LayoutGrid,
  List,
  LoaderCircle,
  MoreHorizontal,
  Move,
  PanelRight,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Server,
  Trash2,
  X,
} from 'lucide-react';
import {
  type FormEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  SandboxEntry,
  SandboxExplorerPort,
  SandboxRoot,
  SandboxSelection,
} from './contracts';
import { requireDriveSandboxExplorerPort } from './runtime';
import './SandboxExplorerView.css';

const SANDBOX_PAGE_SIZE = 50;
const DIRECTORY_PAGE_SIZE = 1_000;
const DIRECTORY_NAME_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});
const TYPEAHEAD_RESET_DELAY_MS = 700;

interface DirectoryLocation {
  readonly entryId: string;
  readonly logicalPath: string;
}

interface BreadcrumbItem extends DirectoryLocation {
  readonly label: string;
}

interface HistoryLocation {
  readonly rootId: string;
  readonly directory: DirectoryLocation;
}

type HistoryMode = 'push' | 'replace' | 'preserve';
type ViewMode = 'details' | 'grid';

interface FileEditorState {
  readonly entry: SandboxEntry;
  readonly content: string;
  readonly encoding: 'utf8' | 'base64';
  readonly sizeBytes: string;
  readonly checksumSha256: string;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly error: string | null;
}

interface EntryContextMenu {
  readonly kind: 'entry' | 'background';
  readonly entry?: SandboxEntry;
  readonly x: number;
  readonly y: number;
  readonly focusMenu: boolean;
  readonly returnFocus: HTMLElement | null;
}

interface PropertiesTarget {
  readonly kind: 'entry' | 'directory';
  readonly entry?: SandboxEntry;
}

type DesktopPlatform = 'windows' | 'macos' | 'linux';

function resolveDesktopPlatform(): DesktopPlatform {
  if (typeof navigator === 'undefined') return 'windows';
  const platform = `${navigator.userAgent} ${navigator.platform}`.toLocaleLowerCase();
  if (platform.includes('mac')) return 'macos';
  if (platform.includes('linux')) return 'linux';
  return 'windows';
}

export interface SandboxExplorerViewProps {
  readonly mode?: 'manage' | 'select-directory';
  readonly port?: SandboxExplorerPort;
  readonly onDirectorySelected?: (selection: SandboxSelection) => void;
  readonly onDirectoryChanged?: (selection: SandboxSelection) => void;
  readonly className?: string;
}

function currentSelection(root: SandboxRoot, directory: DirectoryLocation): SandboxSelection {
  const directoryName = directory.logicalPath.split('/').filter(Boolean).at(-1)
    ?? root.displayName;
  return {
    sandboxId: root.id,
    sandboxDisplayName: root.displayName,
    entryId: directory.entryId,
    directoryName,
    logicalPath: directory.logicalPath,
    displayPath: directory.logicalPath
      ? `${root.displayName} / ${directory.logicalPath}`
      : `${root.displayName} /`,
  };
}

function sandboxAbsolutePath(root: SandboxRoot | null, directory: DirectoryLocation | null): string {
  if (!root || !directory) return '';
  return `sandbox://${root.id}/${directory.logicalPath}`;
}

function copyTextFallback(value: string): boolean {
  if (typeof document === 'undefined') return false;
  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  return copied;
}

function mergeUniqueEntries(
  current: readonly SandboxEntry[],
  incoming: readonly SandboxEntry[],
): readonly SandboxEntry[] {
  const known = new Set(current.map((entry) => entry.id));
  return [...current, ...incoming.filter((entry) => !known.has(entry.id))];
}

function buildBreadcrumbs(
  root: SandboxRoot | null,
  directory: DirectoryLocation | null,
  entryIdsByPath: ReadonlyMap<string, string>,
): readonly BreadcrumbItem[] {
  if (!root || !directory) return [];
  const breadcrumbs: BreadcrumbItem[] = [
    { label: root.displayName, logicalPath: '', entryId: root.rootEntryId },
  ];
  let logicalPath = '';
  for (const segment of directory.logicalPath.split('/').filter(Boolean)) {
    logicalPath = logicalPath ? `${logicalPath}/${segment}` : segment;
    const entryId = entryIdsByPath.get(logicalPath);
    if (entryId) breadcrumbs.push({ label: segment, logicalPath, entryId });
  }
  return breadcrumbs;
}

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message.trim() ? cause.message : fallback;
}

function entryType(entry: SandboxEntry): string {
  if (entry.kind === 'directory') return 'File folder';
  const extension = entry.name.includes('.') ? entry.name.split('.').at(-1) : undefined;
  return extension ? `${extension.toUpperCase()} file` : 'File';
}

function entryLocation(entry: SandboxEntry): string {
  const segments = entry.logicalPath.split('/').filter(Boolean);
  return segments.slice(0, -1).join('/') || '/';
}

const TEXT_FILE_EXTENSIONS = new Set([
  'c', 'conf', 'cpp', 'cs', 'css', 'csv', 'dart', 'env', 'go', 'h', 'html', 'ini', 'java',
  'js', 'json', 'jsx', 'kt', 'less', 'log', 'md', 'mjs', 'php', 'properties', 'py', 'rb',
  'rs', 'scss', 'sh', 'sql', 'svg', 'swift', 'toml', 'ts', 'tsx', 'txt', 'xml', 'yaml', 'yml',
]);

function preferredFileEncoding(name: string): 'utf8' | 'base64' {
  const extension = name.includes('.') ? name.split('.').at(-1)?.toLocaleLowerCase() : undefined;
  return extension && TEXT_FILE_EXTENSIONS.has(extension) ? 'utf8' : 'base64';
}

export function SandboxExplorerView({
  mode = 'manage',
  port: injectedPort,
  onDirectorySelected,
  onDirectoryChanged,
  className,
}: SandboxExplorerViewProps) {
  const port = useMemo(
    () => injectedPort ?? requireDriveSandboxExplorerPort(),
    [injectedPort],
  );
  const sandboxSelectId = useId();
  const newDirectoryNameId = useId();
  const searchId = useId();
  const explorerRef = useRef<HTMLElement>(null);
  const loadMoreRef = useRef<HTMLButtonElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLElement>(null);
  const requestSequence = useRef(0);
  const loadingMoreRequestId = useRef<number | null>(null);
  const automaticLoadingPaused = useRef(false);
  const currentRootId = useRef<string | null>(null);
  const currentDirectoryKey = useRef<string | null>(null);
  const pendingFocusEntryId = useRef<string | null>(null);
  const selectedEntryIdRef = useRef<string | null>(null);
  const historyIndexRef = useRef(-1);
  const entryIdsByPath = useRef(new Map<string, string>());
  const entryElementsById = useRef(new Map<string, HTMLButtonElement>());
  const onDirectoryChangedRef = useRef(onDirectoryChanged);
  const copyFeedbackTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const typeaheadBufferRef = useRef('');
  const typeaheadTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const [roots, setRoots] = useState<readonly SandboxRoot[]>([]);
  const [root, setRoot] = useState<SandboxRoot | null>(null);
  const [directory, setDirectory] = useState<DirectoryLocation | null>(null);
  const [entries, setEntries] = useState<readonly SandboxEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<SandboxEntry | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandboxPage, setSandboxPage] = useState(1);
  const [sandboxTotalPages, setSandboxTotalPages] = useState(1);
  const [sandboxLoadAttempt, setSandboxLoadAttempt] = useState(0);
  const [loadingMoreSandboxes, setLoadingMoreSandboxes] = useState(false);
  const [creatingDirectory, setCreatingDirectory] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState('');
  const [creatingFile, setCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [createPending, setCreatePending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [addressFocused, setAddressFocused] = useState(false);
  const [pathCopied, setPathCopied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('details');
  const [sortAscending, setSortAscending] = useState(true);
  const [detailsVisible, setDetailsVisible] = useState(true);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<EntryContextMenu | null>(null);
  const [fileEditor, setFileEditor] = useState<FileEditorState | null>(null);
  const [renamingEntry, setRenamingEntry] = useState<SandboxEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [movingEntry, setMovingEntry] = useState<SandboxEntry | null>(null);
  const [moveDestination, setMoveDestination] = useState('');
  const [deletingEntry, setDeletingEntry] = useState<SandboxEntry | null>(null);
  const [propertiesTarget, setPropertiesTarget] = useState<PropertiesTarget | null>(null);
  const [mutationPending, setMutationPending] = useState(false);
  const [history, setHistory] = useState<readonly HistoryLocation[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const platform = resolveDesktopPlatform();

  useEffect(() => {
    onDirectoryChangedRef.current = onDirectoryChanged;
  }, [onDirectoryChanged]);

  useEffect(() => {
    selectedEntryIdRef.current = selectedEntry?.id ?? null;
  }, [selectedEntry]);

  useEffect(() => {
    if (!moreMenuOpen) return undefined;
    const dismissMenu = (event: PointerEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) setMoreMenuOpen(false);
    };
    const dismissMenuFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreMenuOpen(false);
    };
    document.addEventListener('pointerdown', dismissMenu);
    document.addEventListener('keydown', dismissMenuFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', dismissMenu);
      document.removeEventListener('keydown', dismissMenuFromKeyboard);
    };
  }, [moreMenuOpen]);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const dismissMenu = (event: PointerEvent) => {
      if (!contextMenuRef.current?.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };
    const dismissMenuFromKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setContextMenu(null);
        contextMenu.returnFocus?.focus();
      }
    };
    document.addEventListener('pointerdown', dismissMenu);
    document.addEventListener('keydown', dismissMenuFromKeyboard);
    return () => {
      document.removeEventListener('pointerdown', dismissMenu);
      document.removeEventListener('keydown', dismissMenuFromKeyboard);
    };
  }, [contextMenu]);

  useLayoutEffect(() => {
    const menu = contextMenuRef.current;
    if (!contextMenu || !menu) return;
    const bounds = menu.getBoundingClientRect();
    const x = Math.max(8, Math.min(contextMenu.x, globalThis.innerWidth - bounds.width - 8));
    const y = Math.max(8, Math.min(contextMenu.y, globalThis.innerHeight - bounds.height - 8));
    if (x === contextMenu.x && y === contextMenu.y) return;
    setContextMenu((current) => current ? { ...current, x, y } : null);
  }, [contextMenu]);

  useEffect(() => {
    if (!contextMenu?.focusMenu) return;
    const firstItem = contextMenuRef.current?.querySelector<HTMLButtonElement>(
      'button[role^="menuitem"]:not(:disabled)',
    );
    firstItem?.focus();
  }, [contextMenu]);

  const rememberEntries = useCallback((items: readonly SandboxEntry[]) => {
    for (const entry of items) entryIdsByPath.current.set(entry.logicalPath, entry.id);
  }, []);

  const loadDirectory = useCallback(async (
    nextRoot: SandboxRoot,
    nextDirectory: DirectoryLocation,
    historyMode: HistoryMode = 'push',
  ) => {
    const requestId = ++requestSequence.current;
    const directoryKey = `${nextRoot.id}\u0000${nextDirectory.logicalPath}`;
    const refreshInPlace = currentDirectoryKey.current === directoryKey;
    pendingFocusEntryId.current = refreshInPlace && document.activeElement instanceof HTMLElement
      ? document.activeElement.closest<HTMLElement>('[data-entry-id]')?.dataset.entryId
        ?? selectedEntryIdRef.current
      : null;
    loadingMoreRequestId.current = null;
    automaticLoadingPaused.current = false;
    if (refreshInPlace) {
      setRefreshing(true);
    } else {
      setRefreshing(false);
      setLoading(true);
    }
    setLoadingMore(false);
    setError(null);
    setCreatingDirectory(false);
    setCreatingFile(false);
    setContextMenu(null);
    try {
      const page = await port.listChildren({
        sandboxId: nextRoot.id,
        parentPath: nextDirectory.logicalPath,
        pageSize: DIRECTORY_PAGE_SIZE,
      });
      if (requestSequence.current !== requestId) return;
      if (currentRootId.current !== nextRoot.id) entryIdsByPath.current.clear();
      currentRootId.current = nextRoot.id;
      currentDirectoryKey.current = directoryKey;
      entryIdsByPath.current.set('', nextRoot.rootEntryId);
      entryIdsByPath.current.set(nextDirectory.logicalPath, nextDirectory.entryId);
      rememberEntries(page.items);
      setRoot(nextRoot);
      setDirectory(nextDirectory);
      setEntries(page.items);
      setSelectedEntry((current) => refreshInPlace && current
        ? page.items.find((entry) => entry.id === current.id) ?? null
        : null);
      if (!refreshInPlace) setSearchQuery('');
      setNextCursor(page.nextCursor);
      if (historyMode !== 'preserve') {
        const location: HistoryLocation = { rootId: nextRoot.id, directory: nextDirectory };
        setHistory((current) => {
          if (historyMode === 'replace') return [location];
          const retained = current.slice(0, historyIndexRef.current + 1);
          const last = retained.at(-1);
          if (
            last?.rootId === location.rootId
            && last.directory.logicalPath === location.directory.logicalPath
          ) {
            return retained;
          }
          return [...retained, location];
        });
        setHistoryIndex((current) => {
          const nextIndex = historyMode === 'replace' ? 0 : current + 1;
          historyIndexRef.current = nextIndex;
          return nextIndex;
        });
      }
      onDirectoryChangedRef.current?.(currentSelection(nextRoot, nextDirectory));
    } catch (cause) {
      if (requestSequence.current === requestId) {
        setError(errorMessage(cause, 'Unable to load the sandbox directory.'));
      }
    } finally {
      if (requestSequence.current === requestId) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [port, rememberEntries]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void port.listSandboxes({ page: 1, pageSize: SANDBOX_PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setRoots(result.items);
        setSandboxPage(result.page);
        setSandboxTotalPages(Math.max(result.totalPages, 1));
        const first = result.items[0];
        if (!first) {
          setLoading(false);
          return;
        }
        void loadDirectory(
          first,
          { entryId: first.rootEntryId, logicalPath: '' },
          'replace',
        );
      })
      .catch((cause) => {
        if (!active) return;
        setError(errorMessage(cause, 'Unable to load available sandboxes.'));
        setLoading(false);
      });
    return () => {
      active = false;
      requestSequence.current += 1;
    };
  }, [loadDirectory, port, sandboxLoadAttempt]);

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(root, directory, entryIdsByPath.current),
    [directory, entries, root],
  );
  const absolutePath = useMemo(
    () => sandboxAbsolutePath(root, directory),
    [directory, root],
  );

  useEffect(() => {
    if (!addressFocused) return;
    addressInputRef.current?.focus();
    addressInputRef.current?.select();
  }, [absolutePath, addressFocused]);

  useEffect(() => {
    setPathCopied(false);
  }, [absolutePath]);

  useEffect(() => () => {
    if (copyFeedbackTimerRef.current) globalThis.clearTimeout(copyFeedbackTimerRef.current);
    if (typeaheadTimerRef.current) globalThis.clearTimeout(typeaheadTimerRef.current);
  }, []);

  const visibleEntries = useMemo(() => {
    const query = deferredSearchQuery.trim().toLocaleLowerCase();
    return entries
      .filter((entry) => !query || entry.name.toLocaleLowerCase().includes(query))
      .slice()
      .sort((left, right) => {
        if (left.kind !== right.kind) return left.kind === 'directory' ? -1 : 1;
        const order = DIRECTORY_NAME_COLLATOR.compare(left.name, right.name);
        return sortAscending ? order : -order;
      });
  }, [deferredSearchQuery, entries, sortAscending]);
  const selectedVisibleIndex = selectedEntry
    ? visibleEntries.findIndex((entry) => entry.id === selectedEntry.id)
    : -1;
  const rovingEntryId = selectedVisibleIndex >= 0
    ? selectedEntry?.id
    : visibleEntries[0]?.id;
  const filtering = searchQuery !== deferredSearchQuery;

  useEffect(() => {
    if (selectedEntry && selectedVisibleIndex < 0) setSelectedEntry(null);
  }, [selectedEntry, selectedVisibleIndex]);

  useLayoutEffect(() => {
    const entryId = pendingFocusEntryId.current;
    if (!entryId) return;
    pendingFocusEntryId.current = null;
    entryElementsById.current.get(entryId)?.focus({ preventScroll: true });
  }, [entries]);

  const loadMoreSandboxes = async () => {
    if (loadingMoreSandboxes || sandboxPage >= sandboxTotalPages) return;
    setLoadingMoreSandboxes(true);
    setError(null);
    try {
      const result = await port.listSandboxes({
        page: sandboxPage + 1,
        pageSize: SANDBOX_PAGE_SIZE,
      });
      setRoots((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...current, ...result.items.filter((item) => !known.has(item.id))];
      });
      setSandboxPage(result.page);
      setSandboxTotalPages(Math.max(result.totalPages, 1));
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to load more sandboxes.'));
    } finally {
      setLoadingMoreSandboxes(false);
    }
  };

  const loadMoreEntries = useCallback(async () => {
    if (!root || !directory || !nextCursor) return;
    const requestId = requestSequence.current;
    if (loadingMoreRequestId.current === requestId) return;
    loadingMoreRequestId.current = requestId;
    setLoadingMore(true);
    setError(null);
    try {
      const page = await port.listChildren({
        sandboxId: root.id,
        parentPath: directory.logicalPath,
        cursor: nextCursor,
        pageSize: DIRECTORY_PAGE_SIZE,
      });
      if (requestSequence.current !== requestId) return;
      rememberEntries(page.items);
      setEntries((current) => mergeUniqueEntries(current, page.items));
      setNextCursor(page.nextCursor);
      automaticLoadingPaused.current = false;
    } catch (cause) {
      if (requestSequence.current === requestId) {
        automaticLoadingPaused.current = true;
        setError(errorMessage(cause, 'Unable to load more directory entries.'));
      }
    } finally {
      if (loadingMoreRequestId.current === requestId) {
        loadingMoreRequestId.current = null;
        setLoadingMore(false);
      }
    }
  }, [directory, nextCursor, port, rememberEntries, root]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (
      !target
      || loading
      || loadingMore
      || !nextCursor
      || automaticLoadingPaused.current
      || typeof IntersectionObserver === 'undefined'
    ) {
      return undefined;
    }
    const observer = new IntersectionObserver((records) => {
      if (!records.some((record) => record.isIntersecting)) return;
      observer.disconnect();
      void loadMoreEntries();
    }, {
      root: target.closest('.sdkwork-sandbox-explorer__content'),
      rootMargin: '200px 0px',
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMoreEntries, loading, loadingMore, nextCursor]);

  const submitCreateDirectory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newDirectoryName.trim();
    if (!root || !directory || !name || !root.capabilities.createDirectory || createPending) {
      return;
    }
    setCreatePending(true);
    setError(null);
    const requestId = requestSequence.current;
    try {
      await port.createDirectory({
        sandboxId: root.id,
        parentPath: directory.logicalPath,
        name,
      });
      setNewDirectoryName('');
      setCreatingDirectory(false);
      if (requestSequence.current === requestId) {
        await loadDirectory(root, directory, 'preserve');
      }
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to create the directory.'));
    } finally {
      setCreatePending(false);
    }
  };

  const submitCreateFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = newFileName.trim();
    if (!root || !directory || !name || !root.capabilities.createFile || createPending) return;
    setCreatePending(true);
    setError(null);
    try {
      const entry = await port.createFile({
        sandboxId: root.id,
        parentPath: directory.logicalPath,
        name,
        content: '',
        encoding: 'utf8',
      });
      setNewFileName('');
      setCreatingFile(false);
      await loadDirectory(root, directory, 'preserve');
      setSelectedEntry(entry);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to create the file.'));
    } finally {
      setCreatePending(false);
    }
  };

  const navigateUp = () => {
    if (!root || breadcrumbs.length < 2) return;
    const parent = breadcrumbs[breadcrumbs.length - 2];
    if (parent) void loadDirectory(root, parent);
  };

  const navigateHistory = (nextIndex: number) => {
    const location = history[nextIndex];
    const nextRoot = roots.find((candidate) => candidate.id === location?.rootId);
    if (!location || !nextRoot) return;
    historyIndexRef.current = nextIndex;
    setHistoryIndex(nextIndex);
    void loadDirectory(nextRoot, location.directory, 'preserve');
  };

  const selectEntry = (entry: SandboxEntry) => {
    setSelectedEntry(entry);
    setContextMenu(null);
  };

  const focusVisibleEntry = useCallback((index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, visibleEntries.length - 1));
    const entry = visibleEntries[boundedIndex];
    if (!entry) return;
    setSelectedEntry(entry);
    const target = entryElementsById.current.get(entry.id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [visibleEntries]);

  const handleEntryNavigationKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (visibleEntries.length === 0) return false;
    const currentIndex = selectedVisibleIndex >= 0 ? selectedVisibleIndex : 0;
    const grid = contentRef.current?.querySelector<HTMLElement>(
      '.sdkwork-sandbox-explorer__grid-view',
    );
    const gridColumns = viewMode === 'grid'
      ? Math.max(1, Math.floor(((grid?.clientWidth ?? 112) + 8) / 120))
      : 1;
    let nextIndex: number | null = null;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = visibleEntries.length - 1;
    if (event.key === 'PageUp') nextIndex = currentIndex - 10;
    if (event.key === 'PageDown') nextIndex = currentIndex + 10;
    if (event.key === 'ArrowUp') nextIndex = currentIndex - gridColumns;
    if (event.key === 'ArrowDown') nextIndex = currentIndex + gridColumns;
    if (viewMode === 'grid' && event.key === 'ArrowLeft') nextIndex = currentIndex - 1;
    if (viewMode === 'grid' && event.key === 'ArrowRight') nextIndex = currentIndex + 1;
    if (nextIndex !== null) {
      event.preventDefault();
      focusVisibleEntry(nextIndex);
      return true;
    }
    if (
      event.key.length !== 1
      || event.ctrlKey
      || event.metaKey
      || event.altKey
      || /^\s$/u.test(event.key)
    ) {
      return false;
    }
    typeaheadBufferRef.current += event.key.toLocaleLowerCase();
    if (typeaheadTimerRef.current) globalThis.clearTimeout(typeaheadTimerRef.current);
    typeaheadTimerRef.current = globalThis.setTimeout(() => {
      typeaheadBufferRef.current = '';
    }, TYPEAHEAD_RESET_DELAY_MS);
    let matchIndex = -1;
    for (let offset = 1; offset <= visibleEntries.length; offset += 1) {
      const candidateIndex = (currentIndex + offset) % visibleEntries.length;
      const candidate = visibleEntries[candidateIndex];
      if (candidate?.name.toLocaleLowerCase().startsWith(typeaheadBufferRef.current)) {
        matchIndex = candidateIndex;
        break;
      }
    }
    if (matchIndex >= 0) {
      event.preventDefault();
      focusVisibleEntry(matchIndex);
      return true;
    }
    return false;
  };

  const openFile = async (entry: SandboxEntry) => {
    if (!root?.capabilities.readFile) return;
    const encoding = preferredFileEncoding(entry.name);
    setFileEditor({
      entry,
      content: '',
      encoding,
      sizeBytes: '0',
      checksumSha256: '',
      loading: true,
      saving: false,
      error: null,
    });
    try {
      const content = await port.readFile({
        sandboxId: root.id,
        entryId: entry.id,
        logicalPath: entry.logicalPath,
        encoding,
      });
      setFileEditor({
        entry: content.entry,
        content: content.content,
        encoding: content.encoding,
        sizeBytes: content.sizeBytes,
        checksumSha256: content.checksumSha256,
        loading: false,
        saving: false,
        error: null,
      });
      setEntries((current) => current.map((item) => item.id === entry.id ? content.entry : item));
      setSelectedEntry(content.entry);
    } catch (cause) {
      setFileEditor((current) => current ? {
        ...current,
        loading: false,
        error: errorMessage(cause, 'Unable to read the file.'),
      } : null);
    }
  };

  const activateEntry = (entry: SandboxEntry) => {
    setSelectedEntry(entry);
    if (root && entry.kind === 'directory') {
      void loadDirectory(root, { entryId: entry.id, logicalPath: entry.logicalPath });
    } else if (mode === 'manage' && entry.kind === 'file') {
      void openFile(entry);
    }
  };

  const saveFile = async () => {
    if (!root || !fileEditor || !root.capabilities.writeFile || fileEditor.saving) return;
    setFileEditor((current) => current ? { ...current, saving: true, error: null } : null);
    try {
      const entry = await port.updateFile({
        sandboxId: root.id,
        entryId: fileEditor.entry.id,
        logicalPath: fileEditor.entry.logicalPath,
        revision: fileEditor.entry.revision,
        content: fileEditor.content,
        encoding: fileEditor.encoding,
      });
      setFileEditor((current) => current ? { ...current, entry, saving: false } : null);
      setEntries((current) => current.map((item) => item.id === entry.id ? entry : item));
      setSelectedEntry(entry);
    } catch (cause) {
      setFileEditor((current) => current ? {
        ...current,
        saving: false,
        error: errorMessage(cause, 'Unable to save the file.'),
      } : null);
    }
  };

  const startRename = (entry: SandboxEntry) => {
    setContextMenu(null);
    setRenamingEntry(entry);
    setRenameValue(entry.name);
  };

  const submitRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const destinationName = renameValue.trim();
    if (!root || !directory || !renamingEntry || !destinationName || mutationPending) return;
    setMutationPending(true);
    setError(null);
    try {
      const entry = await port.moveEntry({
        sandboxId: root.id,
        entryId: renamingEntry.id,
        logicalPath: renamingEntry.logicalPath,
        revision: renamingEntry.revision,
        destinationParentPath: entryLocation(renamingEntry) === '/' ? '' : entryLocation(renamingEntry),
        destinationName,
      });
      setRenamingEntry(null);
      await loadDirectory(root, directory, 'preserve');
      setSelectedEntry(entry);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to rename the entry.'));
    } finally {
      setMutationPending(false);
    }
  };

  const startMove = (entry: SandboxEntry) => {
    setContextMenu(null);
    setMovingEntry(entry);
    setMoveDestination(entryLocation(entry) === '/' ? '' : entryLocation(entry));
  };

  const submitMove = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!root || !directory || !movingEntry || mutationPending) return;
    setMutationPending(true);
    setError(null);
    try {
      const entry = await port.moveEntry({
        sandboxId: root.id,
        entryId: movingEntry.id,
        logicalPath: movingEntry.logicalPath,
        revision: movingEntry.revision,
        destinationParentPath: moveDestination.trim(),
        destinationName: movingEntry.name,
      });
      setMovingEntry(null);
      await loadDirectory(root, directory, 'preserve');
      setSelectedEntry(entry);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to move the entry.'));
    } finally {
      setMutationPending(false);
    }
  };

  const confirmDelete = async () => {
    if (!root || !directory || !deletingEntry || mutationPending) return;
    setMutationPending(true);
    setError(null);
    try {
      await port.deleteEntry({
        sandboxId: root.id,
        entryId: deletingEntry.id,
        logicalPath: deletingEntry.logicalPath,
        revision: deletingEntry.revision,
        recursive: deletingEntry.kind === 'directory',
      });
      setDeletingEntry(null);
      await loadDirectory(root, directory, 'preserve');
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to delete the entry.'));
    } finally {
      setMutationPending(false);
    }
  };

  const selectCurrentDirectory = () => {
    if (!root || !directory || !root.capabilities.selectDirectory) return;
    onDirectorySelected?.(currentSelection(root, directory));
  };

  const copyCurrentPath = async () => {
    if (!absolutePath) return;
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(absolutePath);
          copied = true;
        } catch {
          copied = false;
        }
      }
      if (!copied) copied = copyTextFallback(absolutePath);
      if (!copied) throw new Error('Clipboard access is unavailable.');
      setPathCopied(true);
      if (copyFeedbackTimerRef.current) globalThis.clearTimeout(copyFeedbackTimerRef.current);
      copyFeedbackTimerRef.current = globalThis.setTimeout(() => setPathCopied(false), 1800);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to copy the sandbox path.'));
    }
  };

  const copyPath = async (value: string) => {
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(value);
          copied = true;
        } catch {
          copied = false;
        }
      }
      if (!copied) copied = copyTextFallback(value);
      if (!copied) throw new Error('Clipboard access is unavailable.');
      setPathCopied(true);
      if (copyFeedbackTimerRef.current) globalThis.clearTimeout(copyFeedbackTimerRef.current);
      copyFeedbackTimerRef.current = globalThis.setTimeout(() => setPathCopied(false), 1800);
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to copy the sandbox path.'));
    }
  };

  const entryAbsolutePath = (entry: SandboxEntry): string => (
    root ? `sandbox://${root.id}/${entry.logicalPath}` : ''
  );

  const openEntryContextMenu = (
    entry: SandboxEntry,
    x: number,
    y: number,
    returnFocus: HTMLElement | null,
    focusMenu = false,
  ) => {
    setMoreMenuOpen(false);
    selectEntry(entry);
    setContextMenu({ kind: 'entry', entry, x, y, focusMenu, returnFocus });
  };

  const openBackgroundContextMenu = (
    x: number,
    y: number,
    returnFocus: HTMLElement | null,
    focusMenu = false,
  ) => {
    setMoreMenuOpen(false);
    setSelectedEntry(null);
    setContextMenu({ kind: 'background', x, y, focusMenu, returnFocus });
  };

  const handleContextMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const menuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role^="menuitem"]:not(:disabled)'),
    );
    if (menuItems.length === 0) return;
    const currentIndex = menuItems.findIndex((item) => item === document.activeElement);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % menuItems.length;
    if (event.key === 'ArrowUp') nextIndex = currentIndex < 0 ? menuItems.length - 1 : (currentIndex - 1 + menuItems.length) % menuItems.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = menuItems.length - 1;
    if (event.key === 'Tab') {
      setContextMenu(null);
      contextMenu?.returnFocus?.focus();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const query = event.key.toLocaleLowerCase();
      const startIndex = currentIndex < 0 ? 0 : currentIndex + 1;
      let match: HTMLButtonElement | undefined;
      for (let offset = 0; offset < menuItems.length; offset += 1) {
        const candidate = menuItems[(startIndex + offset) % menuItems.length];
        if (candidate?.textContent?.trim().toLocaleLowerCase().startsWith(query)) {
          match = candidate;
          break;
        }
      }
      if (match) {
        event.preventDefault();
        match.focus();
      }
      return;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    menuItems[nextIndex]?.focus();
  };

  const currentLabel = breadcrumbs.at(-1)?.label ?? root?.displayName ?? 'Sandbox';
  const detailName = selectedEntry?.name ?? currentLabel;
  const detailKind = selectedEntry ? entryType(selectedEntry) : 'Sandbox folder';
  const explorerClassName = [
    'sdkwork-sandbox-explorer',
    error ? 'has-error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section
      ref={explorerRef}
      className={explorerClassName}
      aria-label="Sandbox file explorer"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'f') {
          event.preventDefault();
          searchInputRef.current?.focus();
          return;
        }
        const target = event.target;
        if (
          target instanceof HTMLInputElement
          || target instanceof HTMLSelectElement
          || target instanceof HTMLTextAreaElement
          || (target instanceof HTMLElement && target.isContentEditable)
          || (target instanceof HTMLElement && Boolean(target.closest(
            '[role="menu"], .sdkwork-sandbox-explorer__modal-backdrop',
          )))
        ) return;
        if (
          target instanceof HTMLElement
          && target.closest('[data-entry-id]')
          && handleEntryNavigationKeyDown(event)
        ) return;
        if (event.altKey && event.key === 'ArrowLeft' && historyIndex > 0) {
          event.preventDefault();
          navigateHistory(historyIndex - 1);
        } else if (
          event.altKey
          && event.key === 'ArrowRight'
          && historyIndex >= 0
          && historyIndex < history.length - 1
        ) {
          event.preventDefault();
          navigateHistory(historyIndex + 1);
        } else if (event.key === 'Backspace' && directory?.logicalPath) {
          event.preventDefault();
          navigateUp();
        } else if (event.key === 'F5' && root && directory && !loading && !refreshing) {
          event.preventDefault();
          void loadDirectory(root, directory, 'preserve');
        } else if (event.key === 'Enter' && selectedEntry) {
          event.preventDefault();
          activateEntry(selectedEntry);
        } else if (mode === 'manage' && event.key === 'F2' && selectedEntry && root?.capabilities.moveEntry) {
          event.preventDefault();
          startRename(selectedEntry);
        } else if (mode === 'manage' && event.key === 'Delete' && selectedEntry && root?.capabilities.deleteEntry) {
          event.preventDefault();
          setDeletingEntry(selectedEntry);
        } else if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
          event.preventDefault();
          const returnFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : explorerRef.current;
          const entryTarget = event.target instanceof HTMLElement
            ? event.target.closest<HTMLElement>('[data-entry-id]')
            : null;
          const targetEntry = entries.find((entry) => entry.id === entryTarget?.dataset.entryId)
            ?? selectedEntry;
          const bounds = targetEntry
            ? entryTarget?.getBoundingClientRect()
            : contentRef.current?.getBoundingClientRect();
          const x = bounds ? bounds.left + Math.min(36, bounds.width / 2) : 16;
          const y = bounds ? bounds.top + Math.min(28, bounds.height) : 80;
          if (targetEntry) {
            openEntryContextMenu(targetEntry, x, y, returnFocus, true);
          } else {
            openBackgroundContextMenu(x, y, returnFocus, true);
          }
        }
      }}
    >
      <div className="sdkwork-sandbox-explorer__navigation">
        <div className="sdkwork-sandbox-explorer__history" role="group" aria-label="Navigation history">
          <button
            type="button"
            title="Back"
            aria-label="Back"
            className="sdkwork-sandbox-explorer__icon-button"
            disabled={historyIndex <= 0 || loading}
            onClick={() => navigateHistory(historyIndex - 1)}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            title="Forward"
            aria-label="Forward"
            className="sdkwork-sandbox-explorer__icon-button"
            disabled={historyIndex < 0 || historyIndex >= history.length - 1 || loading}
            onClick={() => navigateHistory(historyIndex + 1)}
          >
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            title="Parent directory"
            aria-label="Parent directory"
            className="sdkwork-sandbox-explorer__icon-button"
            disabled={!directory?.logicalPath || loading}
            onClick={navigateUp}
          >
            <ArrowUp size={16} />
          </button>
          <button
            type="button"
            title="Refresh"
            aria-label="Refresh"
            className="sdkwork-sandbox-explorer__icon-button"
            disabled={!root || !directory || loading || refreshing}
            onClick={() => root && directory && void loadDirectory(root, directory, 'preserve')}
          >
            <RefreshCw size={15} className={loading || refreshing ? 'is-spinning' : undefined} />
          </button>
        </div>

        <nav
          className={`sdkwork-sandbox-explorer__address${addressFocused ? ' is-focused' : ''}`}
          aria-label="Current logical path"
          tabIndex={0}
          title={absolutePath || 'No sandbox path available'}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('.sdkwork-sandbox-explorer__address-copy')) return;
            setAddressFocused(true);
          }}
          onFocus={(event) => {
            if (event.target === event.currentTarget) setAddressFocused(true);
          }}
          onBlur={(event) => {
            if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget as Node)) {
              setAddressFocused(false);
            }
          }}
        >
          <HardDrive size={15} className="sdkwork-sandbox-explorer__address-icon" />
          {addressFocused ? (
            <input
              ref={addressInputRef}
              className="sdkwork-sandbox-explorer__address-input"
              aria-label="Sandbox absolute path"
              readOnly
              spellCheck={false}
              value={absolutePath}
              onClick={(event) => event.currentTarget.select()}
              onKeyDown={(event) => {
                if (event.key === 'Escape' || event.key === 'Enter') {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }}
            />
          ) : (
            <div className="sdkwork-sandbox-explorer__address-breadcrumbs">
              {breadcrumbs.map((breadcrumb, index) => {
                const current = index === breadcrumbs.length - 1;
                return (
                  <span key={breadcrumb.logicalPath || 'root'} className="sdkwork-sandbox-explorer__crumb">
                    {index > 0 && <ChevronRight size={14} aria-hidden />}
                    <button
                      type="button"
                      aria-current={current ? 'page' : undefined}
                      disabled={loading}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (current) {
                          setAddressFocused(true);
                        } else if (root) {
                          void loadDirectory(root, breadcrumb);
                        }
                      }}
                    >
                      {breadcrumb.label}
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          <button
            type="button"
            className={`sdkwork-sandbox-explorer__address-copy${pathCopied ? ' is-copied' : ''}`}
            aria-label={pathCopied ? 'Path copied' : 'Copy path'}
            title={pathCopied ? 'Path copied' : 'Copy full sandbox path'}
            disabled={!absolutePath}
            onClick={() => void copyCurrentPath()}
          >
            {pathCopied ? <Check size={14} /> : <Copy size={14} />}
          </button>
          <span className="sdkwork-sandbox-explorer__sr-only" aria-live="polite">
            {pathCopied ? 'Sandbox path copied to clipboard.' : ''}
          </span>
        </nav>

        <div className="sdkwork-sandbox-explorer__search">
          <Search size={14} aria-hidden />
          <label className="sdkwork-sandbox-explorer__sr-only" htmlFor={searchId}>
            Filter loaded items
          </label>
          <input
            ref={searchInputRef}
            id={searchId}
            type="search"
            value={searchQuery}
            placeholder={`Filter loaded items in ${currentLabel}`}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          {searchQuery && (
            <button type="button" aria-label="Clear search" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="sdkwork-sandbox-explorer__command-bar">
        {mode === 'manage' && (
          <button
            type="button"
            className="sdkwork-sandbox-explorer__command sdkwork-sandbox-explorer__command--primary"
            title="New folder"
            aria-label="New folder"
            disabled={!root?.capabilities.createDirectory || !directory || loading}
            onClick={() => {
              setNewDirectoryName('');
              setCreatingDirectory(true);
            }}
          >
            <FolderPlus size={16} />
            <span>New folder</span>
          </button>
        )}
        {mode === 'manage' && (
          <button
            type="button"
            className="sdkwork-sandbox-explorer__command sdkwork-sandbox-explorer__command--primary"
            title="New file"
            aria-label="New file"
            disabled={!root?.capabilities.createFile || !directory || loading}
            onClick={() => {
              setNewFileName('');
              setCreatingFile(true);
            }}
          >
            <FilePlus2 size={16} />
            <span>New file</span>
          </button>
        )}
        {mode === 'manage' && selectedEntry && (
          <>
            <span className="sdkwork-sandbox-explorer__separator" aria-hidden />
            <button
              type="button"
              className="sdkwork-sandbox-explorer__command"
              title="Rename"
              disabled={!root?.capabilities.moveEntry}
              onClick={() => startRename(selectedEntry)}
            >
              <Pencil size={15} />
              <span>Rename</span>
            </button>
            <button
              type="button"
              className="sdkwork-sandbox-explorer__command"
              title="Delete"
              disabled={!root?.capabilities.deleteEntry}
              onClick={() => setDeletingEntry(selectedEntry)}
            >
              <Trash2 size={15} />
              <span>Delete</span>
            </button>
          </>
        )}
        {mode === 'manage' && <span className="sdkwork-sandbox-explorer__separator" aria-hidden />}
        <button
          type="button"
          className="sdkwork-sandbox-explorer__command"
          title={sortAscending ? 'Sort descending' : 'Sort ascending'}
          onClick={() => setSortAscending((current) => !current)}
        >
          <span>Sort</span>
          <ChevronDown size={13} />
        </button>
        <button
          type="button"
          className="sdkwork-sandbox-explorer__command"
          title={viewMode === 'details' ? 'Switch to grid view' : 'Switch to details view'}
          onClick={() => setViewMode((current) => current === 'details' ? 'grid' : 'details')}
        >
          {viewMode === 'details' ? <List size={16} /> : <LayoutGrid size={16} />}
          <span>View</span>
          <ChevronDown size={13} />
        </button>
        <div ref={moreMenuRef} className="sdkwork-sandbox-explorer__more-wrap">
          <button
            type="button"
            className="sdkwork-sandbox-explorer__command sdkwork-sandbox-explorer__command--more"
            title="More options"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={moreMenuOpen}
            onClick={() => setMoreMenuOpen((current) => !current)}
          >
            <MoreHorizontal size={18} />
          </button>
          {moreMenuOpen && (
            <div className="sdkwork-sandbox-explorer__more-menu" role="menu" aria-label="More options">
              <button
                type="button"
                role="menuitem"
                disabled={!root || !directory || loading}
                onClick={() => {
                  setMoreMenuOpen(false);
                  if (root && directory) void loadDirectory(root, directory, 'preserve');
                }}
              >
                <RefreshCw size={15} />
                Refresh
                <kbd>F5</kbd>
              </button>
              {mode === 'manage' && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!root?.capabilities.createDirectory || !directory || loading}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setNewDirectoryName('');
                      setCreatingDirectory(true);
                    }}
                  >
                    <FolderPlus size={15} />
                    New folder
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!root?.capabilities.createFile || !directory || loading}
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setNewFileName('');
                      setCreatingFile(true);
                    }}
                  >
                    <FilePlus2 size={15} />
                    New file
                  </button>
                </>
              )}
              <span className="sdkwork-sandbox-explorer__menu-separator" role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoreMenuOpen(false);
                  setViewMode((current) => current === 'details' ? 'grid' : 'details');
                }}
              >
                {viewMode === 'details' ? <LayoutGrid size={15} /> : <List size={15} />}
                {viewMode === 'details' ? 'Grid view' : 'Details view'}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMoreMenuOpen(false);
                  setDetailsVisible((current) => !current);
                }}
              >
                <PanelRight size={15} />
                {detailsVisible ? 'Hide details pane' : 'Show details pane'}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          className={`sdkwork-sandbox-explorer__command sdkwork-sandbox-explorer__command--details${detailsVisible ? ' is-active' : ''}`}
          title={detailsVisible ? 'Hide details pane' : 'Show details pane'}
          aria-label={detailsVisible ? 'Hide details pane' : 'Show details pane'}
          aria-pressed={detailsVisible}
          onClick={() => setDetailsVisible((current) => !current)}
        >
          <PanelRight size={16} />
          <span>Details</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="sdkwork-sandbox-explorer__alert">
          <Info size={15} />
          <span>{error}</span>
          {root && directory && (
            <button
              type="button"
              className="sdkwork-sandbox-explorer__alert-retry"
              disabled={loading || refreshing}
              onClick={() => void loadDirectory(root, directory, 'preserve')}
            >
              Reload
            </button>
          )}
          {!root && (
            <button
              type="button"
              className="sdkwork-sandbox-explorer__alert-retry"
              disabled={loading}
              onClick={() => setSandboxLoadAttempt((current) => current + 1)}
            >
              Retry
            </button>
          )}
          <button type="button" title="Dismiss" aria-label="Dismiss" onClick={() => setError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className={`sdkwork-sandbox-explorer__workspace${detailsVisible ? '' : ' is-details-hidden'}`}>
        <aside className="sdkwork-sandbox-explorer__sidebar" aria-label="Sandbox navigation">
          <div className="sdkwork-sandbox-explorer__sidebar-heading">
            <ChevronDown size={13} aria-hidden />
            <Server size={15} aria-hidden />
            <span>Sandboxes</span>
          </div>
          <label className="sdkwork-sandbox-explorer__sr-only" htmlFor={sandboxSelectId}>Sandbox</label>
          <select
            id={sandboxSelectId}
            value={root?.id ?? ''}
            disabled={roots.length === 0 || loading}
            onChange={(event) => {
              const nextRoot = roots.find((candidate) => candidate.id === event.target.value);
              if (nextRoot) {
                void loadDirectory(nextRoot, {
                  entryId: nextRoot.rootEntryId,
                  logicalPath: '',
                });
              }
            }}
          >
            {roots.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.displayName}</option>
            ))}
          </select>

          <div className="sdkwork-sandbox-explorer__tree" role="tree" aria-label="Available sandboxes">
            {roots.map((candidate) => {
              const active = candidate.id === root?.id;
              return (
                <div key={candidate.id} className="sdkwork-sandbox-explorer__tree-group">
                  <button
                    type="button"
                    role="treeitem"
                    aria-label={`Open sandbox ${candidate.displayName}`}
                    aria-selected={active}
                    className={`sdkwork-sandbox-explorer__tree-item${active ? ' is-active' : ''}`}
                    disabled={loading && !active}
                    onClick={() => {
                      if (!active) {
                        void loadDirectory(candidate, {
                          entryId: candidate.rootEntryId,
                          logicalPath: '',
                        });
                      }
                    }}
                  >
                    {active ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    <HardDrive size={15} />
                    <span>{candidate.displayName}</span>
                  </button>
                  {active && breadcrumbs.slice(1).map((breadcrumb, index) => (
                    <button
                      key={breadcrumb.logicalPath}
                      type="button"
                      role="treeitem"
                      aria-current={index === breadcrumbs.length - 2 ? 'page' : undefined}
                      className="sdkwork-sandbox-explorer__tree-child"
                      disabled={loading || index === breadcrumbs.length - 2}
                      onClick={() => void loadDirectory(candidate, breadcrumb)}
                    >
                      <FolderOpen size={14} />
                      <span>{breadcrumb.label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {sandboxPage < sandboxTotalPages && (
            <button
              type="button"
              className="sdkwork-sandbox-explorer__load-roots"
              disabled={loadingMoreSandboxes}
              onClick={() => void loadMoreSandboxes()}
            >
              {loadingMoreSandboxes ? <LoaderCircle size={14} className="is-spinning" /> : <MoreHorizontal size={15} />}
              <span>More sandboxes</span>
            </button>
          )}
        </aside>

        <main
          ref={contentRef}
          className="sdkwork-sandbox-explorer__content"
          aria-busy={loading || refreshing}
          tabIndex={-1}
          onContextMenu={(event) => {
            if ((event.target as HTMLElement).closest('[data-entry-id], input, button, textarea, select')) return;
            event.preventDefault();
            openBackgroundContextMenu(
              event.clientX,
              event.clientY,
              document.activeElement instanceof HTMLElement ? document.activeElement : contentRef.current,
            );
          }}
        >
          <div className="sdkwork-sandbox-explorer__content-heading">
            <ChevronDown size={13} aria-hidden />
            <span>{currentLabel}</span>
          </div>

          {creatingDirectory && root?.capabilities.createDirectory && directory && (
            <form className="sdkwork-sandbox-explorer__create-row" onSubmit={(event) => void submitCreateDirectory(event)}>
              <Folder size={18} />
              <label className="sdkwork-sandbox-explorer__sr-only" htmlFor={newDirectoryNameId}>Folder name</label>
              <input
                id={newDirectoryNameId}
                autoFocus
                required
                maxLength={255}
                value={newDirectoryName}
                placeholder="Folder name"
                disabled={createPending}
                onChange={(event) => setNewDirectoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setCreatingDirectory(false);
                    setNewDirectoryName('');
                  }
                }}
              />
              <button type="submit" title="Create folder" aria-label="Create folder" disabled={!newDirectoryName.trim() || createPending}>
                {createPending ? <LoaderCircle size={15} className="is-spinning" /> : <Check size={15} />}
              </button>
              <button
                type="button"
                title="Cancel"
                aria-label="Cancel"
                disabled={createPending}
                onClick={() => {
                  setCreatingDirectory(false);
                  setNewDirectoryName('');
                }}
              >
                <X size={15} />
              </button>
            </form>
          )}

          {creatingFile && root?.capabilities.createFile && directory && (
            <form className="sdkwork-sandbox-explorer__create-row" onSubmit={(event) => void submitCreateFile(event)}>
              <FilePlus2 size={18} />
              <label className="sdkwork-sandbox-explorer__sr-only" htmlFor={`${newDirectoryNameId}-file`}>File name</label>
              <input
                id={`${newDirectoryNameId}-file`}
                autoFocus
                required
                maxLength={255}
                value={newFileName}
                placeholder="File name"
                disabled={createPending}
                onChange={(event) => setNewFileName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setCreatingFile(false);
                    setNewFileName('');
                  }
                }}
              />
              <button type="submit" title="Create file" aria-label="Create file" disabled={!newFileName.trim() || createPending}>
                {createPending ? <LoaderCircle size={15} className="is-spinning" /> : <Check size={15} />}
              </button>
              <button
                type="button"
                title="Cancel"
                aria-label="Cancel file creation"
                disabled={createPending}
                onClick={() => {
                  setCreatingFile(false);
                  setNewFileName('');
                }}
              >
                <X size={15} />
              </button>
            </form>
          )}

          {loading ? (
            <div className="sdkwork-sandbox-explorer__state">
              <LoaderCircle size={22} className="is-spinning" aria-label="Loading" />
              <span>Loading folder…</span>
            </div>
          ) : roots.length === 0 ? (
            <div className="sdkwork-sandbox-explorer__state">
              <Server size={34} />
              <span>No accessible sandboxes.</span>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="sdkwork-sandbox-explorer__state">
              <FolderOpen size={34} />
              <span>{searchQuery ? 'No items match your search.' : 'This folder is empty.'}</span>
            </div>
          ) : viewMode === 'details' ? (
            <div className="sdkwork-sandbox-explorer__details-view" aria-label="Directory items">
              <div className="sdkwork-sandbox-explorer__columns" aria-hidden>
                <span>Name</span>
                <span>Type</span>
                <span>Location</span>
              </div>
              {visibleEntries.map((entry) => (
                <button
                  key={entry.id}
                  ref={(element) => {
                    if (element) entryElementsById.current.set(entry.id, element);
                    else entryElementsById.current.delete(entry.id);
                  }}
                  data-entry-id={entry.id}
                  type="button"
                  aria-label={entry.name}
                  tabIndex={rovingEntryId === entry.id ? 0 : -1}
                  className={`sdkwork-sandbox-explorer__entry-row${selectedEntry?.id === entry.id ? ' is-selected' : ''}`}
                  onFocus={() => setSelectedEntry(entry)}
                  onClick={() => selectEntry(entry)}
                  onDoubleClick={() => activateEntry(entry)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openEntryContextMenu(entry, event.clientX, event.clientY, event.currentTarget);
                  }}
                >
                  <span className="sdkwork-sandbox-explorer__entry-name">
                    {entry.kind === 'directory'
                      ? <Folder size={18} className="is-folder" />
                      : <File size={18} className="is-file" />}
                    <span title={entry.name}>{entry.name}</span>
                  </span>
                  <span>{entryType(entry)}</span>
                  <span title={entryLocation(entry)}>{entryLocation(entry)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="sdkwork-sandbox-explorer__grid-view" aria-label="Directory items">
              {visibleEntries.map((entry) => (
                <button
                  key={entry.id}
                  ref={(element) => {
                    if (element) entryElementsById.current.set(entry.id, element);
                    else entryElementsById.current.delete(entry.id);
                  }}
                  data-entry-id={entry.id}
                  type="button"
                  aria-label={entry.name}
                  tabIndex={rovingEntryId === entry.id ? 0 : -1}
                  className={`sdkwork-sandbox-explorer__entry-card${selectedEntry?.id === entry.id ? ' is-selected' : ''}`}
                  onFocus={() => setSelectedEntry(entry)}
                  onClick={() => selectEntry(entry)}
                  onDoubleClick={() => activateEntry(entry)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openEntryContextMenu(entry, event.clientX, event.clientY, event.currentTarget);
                  }}
                >
                  {entry.kind === 'directory'
                    ? <Folder size={42} className="is-folder" />
                    : <File size={42} className="is-file" />}
                  <span title={entry.name}>{entry.name}</span>
                </button>
              ))}
            </div>
          )}

          {nextCursor && !loading && (
            <button
              ref={loadMoreRef}
              type="button"
              aria-label="Load more"
              className="sdkwork-sandbox-explorer__load-more"
              disabled={loadingMore}
              onClick={() => void loadMoreEntries()}
            >
              {loadingMore && <LoaderCircle size={14} className="is-spinning" />}
              {loadingMore ? 'Loading more items\u2026' : 'Load more items'}
            </button>
          )}
        </main>

        {detailsVisible && (
          <aside className="sdkwork-sandbox-explorer__details-pane" aria-label="Item details">
            <div className="sdkwork-sandbox-explorer__preview-icon">
              {selectedEntry?.kind === 'file'
                ? <File size={64} className="is-file" />
                : <FolderOpen size={64} className="is-folder" />}
            </div>
            <div className="sdkwork-sandbox-explorer__detail-copy">
              <h2 title={detailName}>{detailName}</h2>
              <dl>
                <div>
                  <dt>Type</dt>
                  <dd>{detailKind}</dd>
                </div>
                <div>
                  <dt>Sandbox</dt>
                  <dd>{root?.displayName ?? '—'}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selectedEntry ? entryLocation(selectedEntry) : directory?.logicalPath || '/'}</dd>
                </div>
              </dl>
              {mode === 'manage' && selectedEntry && (
                <div className="sdkwork-sandbox-explorer__detail-actions">
                  <button type="button" onClick={() => activateEntry(selectedEntry)}>
                    {selectedEntry.kind === 'directory'
                      ? <FolderOpen size={14} />
                      : <FilePenLine size={14} />}
                    {selectedEntry.kind === 'directory' ? 'Open' : 'Open file'}
                  </button>
                  <button
                    type="button"
                    disabled={!root?.capabilities.moveEntry}
                    onClick={() => startRename(selectedEntry)}
                  >
                    <Pencil size={14} />
                    Rename
                  </button>
                </div>
              )}
              {!selectedEntry && (
                <div className="sdkwork-sandbox-explorer__detail-hint">
                  <Info size={15} />
                  <span>Select an item to view its details.</span>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      <footer className="sdkwork-sandbox-explorer__status-bar">
        <span>{visibleEntries.length} {visibleEntries.length === 1 ? 'item' : 'items'} loaded</span>
        {searchQuery && <span>Filtered from {entries.length}</span>}
        {filtering && <span role="status">{'Filtering\u2026'}</span>}
        {refreshing && <span role="status">{'Refreshing\u2026'}</span>}
        {!searchQuery && entries.length > 0 && (
          <span role="status" aria-live="polite">
            {loadingMore ? 'Loading more items\u2026' : nextCursor ? 'More items available' : 'All items loaded'}
          </span>
        )}
        <span className="sdkwork-sandbox-explorer__status-path">
          {root && directory ? currentSelection(root, directory).displayPath : 'No sandbox selected'}
        </span>
        {mode === 'select-directory' && root && directory && (
          <button
            type="button"
            className="sdkwork-sandbox-explorer__select-button"
            disabled={!root.capabilities.selectDirectory || loading}
            onClick={selectCurrentDirectory}
          >
            <FolderOpen size={15} />
            Select directory
          </button>
        )}
      </footer>

      {contextMenu && (
        <div
          ref={contextMenuRef}
          className={`sdkwork-sandbox-explorer__context-menu sdkwork-sandbox-explorer__context-menu--${platform}`}
          role="menu"
          aria-label={contextMenu.kind === 'entry'
            ? `${contextMenu.entry?.name ?? 'Item'} actions`
            : 'Current folder actions'}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onKeyDown={handleContextMenuKeyDown}
        >
          {contextMenu.kind === 'entry' && contextMenu.entry ? (
            <>
              <button type="button" role="menuitem" className="is-default" onClick={() => activateEntry(contextMenu.entry!)}>
                {contextMenu.entry.kind === 'directory' ? <FolderOpen size={15} /> : <FilePenLine size={15} />}
                <span>Open</span>
                <kbd>{platform === 'macos' ? '⌘O' : 'Enter'}</kbd>
              </button>
              <span role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const path = entryAbsolutePath(contextMenu.entry!);
                  setContextMenu(null);
                  void copyPath(path);
                }}
              >
                <Copy size={15} />
                <span>{platform === 'windows' ? 'Copy as path' : platform === 'macos' ? 'Copy pathname' : 'Copy Location'}</span>
                <kbd>{platform === 'macos' ? '⌥⌘C' : 'Ctrl+Shift+C'}</kbd>
              </button>
              {mode === 'manage' && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!root?.capabilities.moveEntry}
                    onClick={() => startRename(contextMenu.entry!)}
                  >
                    <Pencil size={15} />
                    <span>Rename</span>
                    <kbd>{platform === 'macos' ? 'Return' : 'F2'}</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!root?.capabilities.moveEntry}
                    onClick={() => startMove(contextMenu.entry!)}
                  >
                    <Move size={15} />
                    <span>Move to…</span>
                    <kbd />
                  </button>
                </>
              )}
              <span role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPropertiesTarget({ kind: 'entry', entry: contextMenu.entry });
                  setContextMenu(null);
                }}
              >
                <Info size={15} />
                <span>{platform === 'macos' ? 'Get Info' : 'Properties'}</span>
                <kbd>{platform === 'macos' ? '⌘I' : 'Alt+Enter'}</kbd>
              </button>
              {mode === 'manage' && (
                <button
                  type="button"
                  role="menuitem"
                  className="is-danger"
                  disabled={!root?.capabilities.deleteEntry}
                  onClick={() => {
                    setContextMenu(null);
                    setDeletingEntry(contextMenu.entry!);
                  }}
                >
                  <Trash2 size={15} />
                  <span>Delete permanently…</span>
                  <kbd>{platform === 'macos' ? '⌥⌘⌫' : 'Shift+Del'}</kbd>
                </button>
              )}
            </>
          ) : (
            <>
              {mode === 'manage' && (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!root?.capabilities.createDirectory || !directory || loading}
                    onClick={() => {
                      setContextMenu(null);
                      setNewDirectoryName('');
                      setCreatingDirectory(true);
                    }}
                  >
                    <FolderPlus size={15} />
                    <span>New folder</span>
                    <kbd>{platform === 'macos' ? '⇧⌘N' : 'Ctrl+Shift+N'}</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!root?.capabilities.createFile || !directory || loading}
                    onClick={() => {
                      setContextMenu(null);
                      setNewFileName('');
                      setCreatingFile(true);
                    }}
                  >
                    <FilePlus2 size={15} />
                    <span>New file</span>
                    <kbd />
                  </button>
                  <span role="separator" />
                </>
              )}
              <button
                type="button"
                role="menuitem"
                disabled={!root || !directory || loading}
                onClick={() => {
                  setContextMenu(null);
                  if (root && directory) void loadDirectory(root, directory, 'preserve');
                }}
              >
                <RefreshCw size={15} />
                <span>Refresh</span>
                <kbd>{platform === 'macos' ? '⌘R' : 'F5'}</kbd>
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={sortAscending}
                onClick={() => {
                  setSortAscending((current) => !current);
                  setContextMenu(null);
                }}
              >
                <ArrowDown size={15} className={sortAscending ? 'is-ascending' : 'is-descending'} />
                <span>{sortAscending ? 'Sort descending' : 'Sort ascending'}</span>
                <kbd />
              </button>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={viewMode === 'details'}
                onClick={() => {
                  setViewMode((current) => current === 'details' ? 'grid' : 'details');
                  setContextMenu(null);
                }}
              >
                {viewMode === 'details' ? <LayoutGrid size={15} /> : <List size={15} />}
                <span>{viewMode === 'details' ? 'Grid view' : 'Details view'}</span>
                <kbd />
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={detailsVisible}
                onClick={() => {
                  setDetailsVisible((current) => !current);
                  setContextMenu(null);
                }}
              >
                <PanelRight size={15} />
                <span>{detailsVisible ? 'Hide details pane' : 'Show details pane'}</span>
                <kbd />
              </button>
              <span role="separator" />
              <button
                type="button"
                role="menuitem"
                disabled={!absolutePath}
                onClick={() => {
                  setContextMenu(null);
                  void copyPath(absolutePath);
                }}
              >
                <Copy size={15} />
                <span>{platform === 'windows' ? 'Copy current path' : platform === 'macos' ? 'Copy pathname' : 'Copy Location'}</span>
                <kbd />
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!root || !directory}
                onClick={() => {
                  setPropertiesTarget({ kind: 'directory' });
                  setContextMenu(null);
                }}
              >
                <Info size={15} />
                <span>{platform === 'macos' ? 'Get Info' : 'Properties'}</span>
                <kbd>{platform === 'macos' ? '⌘I' : 'Alt+Enter'}</kbd>
              </button>
            </>
          )}
        </div>
      )}

      {fileEditor && (
        <div className="sdkwork-sandbox-explorer__modal-backdrop" role="presentation">
          <section className="sdkwork-sandbox-explorer__operation-dialog sdkwork-sandbox-explorer__editor" role="dialog" aria-modal="true" aria-label={`Edit ${fileEditor.entry.name}`}>
            <header>
              <FilePenLine size={16} />
              <strong>{fileEditor.entry.name}</strong>
              <span>{fileEditor.encoding === 'utf8' ? `${fileEditor.sizeBytes} bytes` : 'Binary preview'}</span>
              <button type="button" aria-label="Close file" onClick={() => setFileEditor(null)}><X size={16} /></button>
            </header>
            {fileEditor.loading ? (
              <div className="sdkwork-sandbox-explorer__operation-state"><LoaderCircle size={20} className="is-spinning" />Loading file…</div>
            ) : (
              <>
                {fileEditor.error && <div role="alert" className="sdkwork-sandbox-explorer__editor-error">{fileEditor.error}</div>}
                <textarea
                  aria-label="File content"
                  readOnly={fileEditor.encoding === 'base64' || !root?.capabilities.writeFile}
                  value={fileEditor.content}
                  spellCheck={false}
                  onChange={(event) => setFileEditor((current) => current ? { ...current, content: event.target.value } : null)}
                />
                <footer>
                  <span>{fileEditor.encoding === 'base64' ? 'Base64-encoded read-only content' : fileEditor.checksumSha256 ? `SHA-256 ${fileEditor.checksumSha256.slice(0, 12)}…` : 'UTF-8 text'}</span>
                  <button type="button" onClick={() => setFileEditor(null)}>Close</button>
                  {fileEditor.encoding === 'utf8' && root?.capabilities.writeFile && (
                    <button type="button" className="is-primary" disabled={fileEditor.saving} onClick={() => void saveFile()}>
                      {fileEditor.saving ? <LoaderCircle size={14} className="is-spinning" /> : <Save size={14} />}
                      Save
                    </button>
                  )}
                </footer>
              </>
            )}
          </section>
        </div>
      )}

      {propertiesTarget && root && directory && (
        <OperationDialog
          title={platform === 'macos' ? 'Info' : 'Properties'}
          onCancel={() => setPropertiesTarget(null)}
        >
          <div className="sdkwork-sandbox-explorer__properties">
            <div className="sdkwork-sandbox-explorer__properties-icon">
              {propertiesTarget.entry?.kind === 'file'
                ? <File size={42} className="is-file" />
                : <FolderOpen size={42} className="is-folder" />}
            </div>
            <dl>
              <div><dt>Name</dt><dd>{propertiesTarget.entry?.name ?? currentLabel}</dd></div>
              <div><dt>Kind</dt><dd>{propertiesTarget.entry ? entryType(propertiesTarget.entry) : 'Sandbox folder'}</dd></div>
              <div><dt>Sandbox</dt><dd>{root.displayName}</dd></div>
              <div><dt>Location</dt><dd>{propertiesTarget.entry ? entryLocation(propertiesTarget.entry) : directory.logicalPath || '/'}</dd></div>
              <div><dt>Logical path</dt><dd>{propertiesTarget.entry ? entryAbsolutePath(propertiesTarget.entry) : absolutePath}</dd></div>
              {propertiesTarget.entry && <div><dt>Revision</dt><dd>{propertiesTarget.entry.revision}</dd></div>}
            </dl>
            <div className="sdkwork-sandbox-explorer__dialog-actions">
              <button
                type="button"
                onClick={() => void copyPath(propertiesTarget.entry ? entryAbsolutePath(propertiesTarget.entry) : absolutePath)}
              >
                <Copy size={14} />
                Copy path
              </button>
              <button type="button" className="is-primary" onClick={() => setPropertiesTarget(null)}>OK</button>
            </div>
          </div>
        </OperationDialog>
      )}

      {renamingEntry && (
        <OperationDialog title={`Rename ${renamingEntry.name}`} onCancel={() => setRenamingEntry(null)}>
          <form onSubmit={(event) => void submitRename(event)}>
            <label htmlFor={`${newDirectoryNameId}-rename`}>New name</label>
            <input id={`${newDirectoryNameId}-rename`} autoFocus required maxLength={255} value={renameValue} disabled={mutationPending} onChange={(event) => setRenameValue(event.target.value)} />
            <DialogActions pending={mutationPending} submitLabel="Rename" onCancel={() => setRenamingEntry(null)} />
          </form>
        </OperationDialog>
      )}

      {movingEntry && (
        <OperationDialog title={`Move ${movingEntry.name}`} onCancel={() => setMovingEntry(null)}>
          <form onSubmit={(event) => void submitMove(event)}>
            <label htmlFor={`${newDirectoryNameId}-move`}>Destination folder path</label>
            <input id={`${newDirectoryNameId}-move`} autoFocus placeholder="Empty for sandbox root" value={moveDestination} disabled={mutationPending} onChange={(event) => setMoveDestination(event.target.value)} />
            <p>Use a sandbox-relative path with forward slashes.</p>
            <DialogActions pending={mutationPending} submitLabel="Move" onCancel={() => setMovingEntry(null)} />
          </form>
        </OperationDialog>
      )}

      {deletingEntry && (
        <OperationDialog title={`Delete ${deletingEntry.name}`} onCancel={() => setDeletingEntry(null)} danger>
          <p>This permanently deletes the {deletingEntry.kind}. This action cannot be undone.</p>
          <div className="sdkwork-sandbox-explorer__dialog-actions">
            <button type="button" onClick={() => setDeletingEntry(null)} disabled={mutationPending}>Cancel</button>
            <button type="button" className="is-danger" onClick={() => void confirmDelete()} disabled={mutationPending}>
              {mutationPending && <LoaderCircle size={14} className="is-spinning" />}
              Delete permanently
            </button>
          </div>
        </OperationDialog>
      )}
    </section>
  );
}

function OperationDialog({
  title,
  children,
  onCancel,
  danger = false,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
  readonly onCancel: () => void;
  readonly danger?: boolean;
}) {
  return (
    <div className="sdkwork-sandbox-explorer__modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <section className={`sdkwork-sandbox-explorer__operation-dialog${danger ? ' is-danger' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><strong>{title}</strong><button type="button" aria-label="Close" onClick={onCancel}><X size={16} /></button></header>
        <div className="sdkwork-sandbox-explorer__operation-body">{children}</div>
      </section>
    </div>
  );
}

function DialogActions({
  pending,
  submitLabel,
  onCancel,
}: {
  readonly pending: boolean;
  readonly submitLabel: string;
  readonly onCancel: () => void;
}) {
  return (
    <div className="sdkwork-sandbox-explorer__dialog-actions">
      <button type="button" onClick={onCancel} disabled={pending}>Cancel</button>
      <button type="submit" className="is-primary" disabled={pending}>
        {pending && <LoaderCircle size={14} className="is-spinning" />}
        {submitLabel}
      </button>
    </div>
  );
}
