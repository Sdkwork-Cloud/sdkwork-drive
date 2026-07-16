import {
  ArrowUp,
  Check,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  FolderPlus,
  LoaderCircle,
  MoreHorizontal,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  type FormEvent,
  useCallback,
  useEffect,
  useId,
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

const SANDBOX_PAGE_SIZE = 50;
const DIRECTORY_PAGE_SIZE = 100;

interface DirectoryLocation {
  readonly entryId: string;
  readonly logicalPath: string;
}

interface BreadcrumbItem extends DirectoryLocation {
  readonly label: string;
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
  const requestSequence = useRef(0);
  const currentRootId = useRef<string | null>(null);
  const entryIdsByPath = useRef(new Map<string, string>());
  const onDirectoryChangedRef = useRef(onDirectoryChanged);
  const [roots, setRoots] = useState<readonly SandboxRoot[]>([]);
  const [root, setRoot] = useState<SandboxRoot | null>(null);
  const [directory, setDirectory] = useState<DirectoryLocation | null>(null);
  const [entries, setEntries] = useState<readonly SandboxEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sandboxPage, setSandboxPage] = useState(1);
  const [sandboxTotalPages, setSandboxTotalPages] = useState(1);
  const [loadingMoreSandboxes, setLoadingMoreSandboxes] = useState(false);
  const [creatingDirectory, setCreatingDirectory] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState('');
  const [createPending, setCreatePending] = useState(false);

  useEffect(() => {
    onDirectoryChangedRef.current = onDirectoryChanged;
  }, [onDirectoryChanged]);

  const rememberEntries = useCallback((items: readonly SandboxEntry[]) => {
    for (const entry of items) entryIdsByPath.current.set(entry.logicalPath, entry.id);
  }, []);

  const loadDirectory = useCallback(async (
    nextRoot: SandboxRoot,
    nextDirectory: DirectoryLocation,
  ) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setCreatingDirectory(false);
    try {
      const page = await port.listChildren({
        sandboxId: nextRoot.id,
        parentPath: nextDirectory.logicalPath,
        pageSize: DIRECTORY_PAGE_SIZE,
      });
      if (requestSequence.current !== requestId) return;
      if (currentRootId.current !== nextRoot.id) entryIdsByPath.current.clear();
      currentRootId.current = nextRoot.id;
      entryIdsByPath.current.set('', nextRoot.rootEntryId);
      entryIdsByPath.current.set(nextDirectory.logicalPath, nextDirectory.entryId);
      rememberEntries(page.items);
      setRoot(nextRoot);
      setDirectory(nextDirectory);
      setEntries(page.items);
      setNextCursor(page.nextCursor);
      onDirectoryChangedRef.current?.(currentSelection(nextRoot, nextDirectory));
    } catch (cause) {
      if (requestSequence.current === requestId) {
        setError(errorMessage(cause, 'Unable to load the sandbox directory.'));
      }
    } finally {
      if (requestSequence.current === requestId) setLoading(false);
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
        void loadDirectory(first, { entryId: first.rootEntryId, logicalPath: '' });
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
  }, [loadDirectory, port]);

  const breadcrumbs = useMemo(
    () => buildBreadcrumbs(root, directory, entryIdsByPath.current),
    [directory, entries, root],
  );

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

  const loadMoreEntries = async () => {
    if (!root || !directory || !nextCursor || loadingMore) return;
    const requestId = requestSequence.current;
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
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to load more directory entries.'));
    } finally {
      setLoadingMore(false);
    }
  };

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
        await loadDirectory(root, directory);
      }
    } catch (cause) {
      setError(errorMessage(cause, 'Unable to create the directory.'));
    } finally {
      setCreatePending(false);
    }
  };

  const navigateUp = () => {
    if (!root || breadcrumbs.length < 2) return;
    const parent = breadcrumbs[breadcrumbs.length - 2];
    if (parent) void loadDirectory(root, parent);
  };

  const selectCurrentDirectory = () => {
    if (!root || !directory || !root.capabilities.selectDirectory) return;
    onDirectorySelected?.(currentSelection(root, directory));
  };

  return (
    <section
      className={className ?? 'flex min-h-0 flex-col border border-slate-300 bg-white text-sm text-slate-900'}
      aria-label="Sandbox file explorer"
    >
      <header className="flex min-h-11 items-center gap-1 border-b border-slate-200 px-2">
        <label className="sr-only" htmlFor={sandboxSelectId}>Sandbox</label>
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
          className="min-w-0 flex-1 bg-transparent px-1 py-1 outline-none"
        >
          {roots.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{candidate.displayName}</option>
          ))}
        </select>
        {sandboxPage < sandboxTotalPages && (
          <button
            type="button"
            title="Load more sandboxes"
            aria-label="Load more sandboxes"
            className="grid size-8 shrink-0 place-items-center hover:bg-slate-100 disabled:opacity-50"
            disabled={loadingMoreSandboxes}
            onClick={() => void loadMoreSandboxes()}
          >
            {loadingMoreSandboxes
              ? <LoaderCircle size={16} className="animate-spin" />
              : <MoreHorizontal size={16} />}
          </button>
        )}
        <button
          type="button"
          title="Parent directory"
          aria-label="Parent directory"
          className="grid size-8 shrink-0 place-items-center hover:bg-slate-100 disabled:opacity-40"
          disabled={!directory?.logicalPath || loading}
          onClick={navigateUp}
        >
          <ArrowUp size={16} />
        </button>
        <button
          type="button"
          title="Refresh"
          aria-label="Refresh"
          className="grid size-8 shrink-0 place-items-center hover:bg-slate-100 disabled:opacity-40"
          disabled={!root || !directory || loading}
          onClick={() => root && directory && void loadDirectory(root, directory)}
        >
          <RefreshCw size={16} />
        </button>
        <button
          type="button"
          title="New folder"
          aria-label="New folder"
          className="grid size-8 shrink-0 place-items-center hover:bg-slate-100 disabled:opacity-40"
          disabled={!root?.capabilities.createDirectory || !directory || loading}
          onClick={() => {
            setNewDirectoryName('');
            setCreatingDirectory(true);
          }}
        >
          <FolderPlus size={16} />
        </button>
      </header>

      <nav
        className="flex min-h-9 items-center overflow-x-auto border-b border-slate-200 px-2 text-slate-600"
        aria-label="Current logical path"
      >
        {breadcrumbs.map((breadcrumb, index) => {
          const current = index === breadcrumbs.length - 1;
          return (
            <span key={breadcrumb.logicalPath || 'root'} className="flex shrink-0 items-center">
              {index > 0 && <ChevronRight size={14} className="text-slate-400" />}
              <button
                type="button"
                aria-current={current ? 'page' : undefined}
                className="max-w-52 truncate px-1 py-1 hover:text-slate-950 disabled:font-medium disabled:text-slate-900"
                disabled={current || loading}
                onClick={() => root && void loadDirectory(root, breadcrumb)}
              >
                {breadcrumb.label}
              </button>
            </span>
          );
        })}
      </nav>

      {error && (
        <div role="alert" className="flex items-start gap-2 border-b border-red-200 bg-red-50 px-3 py-2 text-red-800">
          <span className="min-w-0 flex-1 break-words">{error}</span>
          <button
            type="button"
            title="Dismiss"
            aria-label="Dismiss"
            className="grid size-6 shrink-0 place-items-center hover:bg-red-100"
            onClick={() => setError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto" aria-busy={loading}>
        {creatingDirectory && root?.capabilities.createDirectory && directory && (
          <form
            className="flex min-h-10 items-center gap-2 border-b border-sky-200 bg-sky-50 px-3"
            onSubmit={(event) => void submitCreateDirectory(event)}
          >
            <Folder size={16} className="shrink-0 text-amber-600" />
            <label className="sr-only" htmlFor={newDirectoryNameId}>Folder name</label>
            <input
              id={newDirectoryNameId}
              autoFocus
              required
              maxLength={255}
              value={newDirectoryName}
              placeholder="Folder name"
              className="min-w-0 flex-1 border-b border-sky-500 bg-transparent py-1 outline-none"
              disabled={createPending}
              onChange={(event) => setNewDirectoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setCreatingDirectory(false);
                  setNewDirectoryName('');
                }
              }}
            />
            <button
              type="submit"
              title="Create folder"
              aria-label="Create folder"
              className="grid size-8 place-items-center text-sky-700 hover:bg-sky-100 disabled:opacity-40"
              disabled={!newDirectoryName.trim() || createPending}
            >
              {createPending
                ? <LoaderCircle size={16} className="animate-spin" />
                : <Check size={16} />}
            </button>
            <button
              type="button"
              title="Cancel"
              aria-label="Cancel"
              className="grid size-8 place-items-center hover:bg-sky-100 disabled:opacity-40"
              disabled={createPending}
              onClick={() => {
                setCreatingDirectory(false);
                setNewDirectoryName('');
              }}
            >
              <X size={16} />
            </button>
          </form>
        )}

        {loading ? (
          <div className="grid min-h-24 place-items-center text-slate-500">
            <LoaderCircle size={20} className="animate-spin" aria-label="Loading" />
          </div>
        ) : roots.length === 0 ? (
          <p className="p-4 text-center text-slate-500">No accessible sandboxes.</p>
        ) : entries.length === 0 ? (
          <p className="p-4 text-center text-slate-500">This directory is empty.</p>
        ) : (
          entries.map((entry) => {
            const isDirectory = entry.kind === 'directory';
            return (
              <button
                key={entry.id}
                type="button"
                className="flex min-h-10 w-full items-center gap-2 border-b border-slate-100 px-3 text-left hover:bg-slate-50 disabled:cursor-default disabled:text-slate-700"
                disabled={!isDirectory}
                onClick={() => {
                  if (root && isDirectory) {
                    void loadDirectory(root, {
                      entryId: entry.id,
                      logicalPath: entry.logicalPath,
                    });
                  }
                }}
              >
                {isDirectory
                  ? <Folder size={16} className="shrink-0 text-amber-600" />
                  : <File size={16} className="shrink-0 text-slate-500" />}
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                {isDirectory && <ChevronRight size={16} className="shrink-0 text-slate-400" />}
              </button>
            );
          })
        )}

        {nextCursor && !loading && (
          <button
            type="button"
            className="flex min-h-10 w-full items-center justify-center gap-2 border-b border-slate-100 text-sky-700 hover:bg-slate-50 disabled:opacity-50"
            disabled={loadingMore}
            onClick={() => void loadMoreEntries()}
          >
            {loadingMore && <LoaderCircle size={15} className="animate-spin" />}
            Load more
          </button>
        )}
      </div>

      {mode === 'select-directory' && root && directory && (
        <footer className="flex min-h-12 items-center gap-3 border-t border-slate-200 px-3 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 text-slate-600">
            <FolderOpen size={16} className="shrink-0 text-amber-600" />
            <span className="truncate">{currentSelection(root, directory).displayPath}</span>
          </div>
          <button
            type="button"
            className="shrink-0 border border-sky-700 bg-sky-700 px-3 py-2 text-white hover:bg-sky-800 disabled:opacity-50"
            disabled={!root.capabilities.selectDirectory || loading}
            onClick={selectCurrentDirectory}
          >
            Select directory
          </button>
        </footer>
      )}
    </section>
  );
}
