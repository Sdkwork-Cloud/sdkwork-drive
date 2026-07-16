// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SandboxEntry, SandboxExplorerPort, SandboxRoot } from './contracts';
import { SandboxDirectoryPickerDialog } from './SandboxDirectoryPickerDialog';
import {
  SandboxDirectoryPickerProvider,
  useSandboxDirectoryPicker,
} from './SandboxDirectoryPickerProvider';
import { SandboxExplorerView } from './SandboxExplorerView';

const root: SandboxRoot = {
  id: 'sandbox-1',
  displayName: 'Server workspace',
  rootEntryId: 'root-entry-1',
  capabilities: {
    browse: true,
    createDirectory: true,
    selectDirectory: true,
  },
};

const sourceDirectory: SandboxEntry = {
  id: 'entry-src',
  sandboxId: root.id,
  parentId: root.rootEntryId,
  name: 'src',
  kind: 'directory',
  logicalPath: 'src',
  revision: 'revision-src',
};

const readmeFile: SandboxEntry = {
  id: 'entry-readme',
  sandboxId: root.id,
  parentId: root.rootEntryId,
  name: 'README.md',
  kind: 'file',
  logicalPath: 'README.md',
  revision: 'revision-readme',
};

afterEach(cleanup);

function explorerPort(): SandboxExplorerPort & {
  listSandboxes: ReturnType<typeof vi.fn>;
  listChildren: ReturnType<typeof vi.fn>;
  createDirectory: ReturnType<typeof vi.fn>;
} {
  return {
    listSandboxes: vi.fn(async () => ({
      items: [root],
      page: 1,
      pageSize: 50,
      totalItems: 1,
      totalPages: 1,
    })),
    listChildren: vi.fn(async ({ parentPath, cursor }) => {
      if (cursor === 'root-next') {
        return { items: [readmeFile] };
      }
      if (parentPath === 'src') {
        return { items: [] };
      }
      return { items: [sourceDirectory], nextCursor: 'root-next' };
    }),
    createDirectory: vi.fn(async ({ parentPath, name }) => ({
      id: `entry-${name}`,
      sandboxId: root.id,
      parentId: parentPath ? sourceDirectory.id : root.rootEntryId,
      name,
      kind: 'directory' as const,
      logicalPath: parentPath ? `${parentPath}/${name}` : name,
      revision: `revision-${name}`,
    })),
  };
}

describe('SandboxExplorerView', () => {
  it('navigates into a directory without submitting the picker selection', async () => {
    const port = explorerPort();
    const onDirectorySelected = vi.fn();
    render(
      <SandboxExplorerView
        mode="select-directory"
        port={port}
        onDirectorySelected={onDirectorySelected}
      />,
    );

    await screen.findByRole('button', { name: 'src' });
    fireEvent.click(screen.getByRole('button', { name: 'src' }));

    await waitFor(() => {
      expect(port.listChildren).toHaveBeenLastCalledWith({
        sandboxId: root.id,
        parentPath: 'src',
        pageSize: 100,
      });
    });
    expect(onDirectorySelected).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Select directory' }));
    expect(onDirectorySelected).toHaveBeenCalledWith({
      sandboxId: root.id,
      sandboxDisplayName: root.displayName,
      entryId: sourceDirectory.id,
      directoryName: sourceDirectory.name,
      logicalPath: 'src',
      displayPath: 'Server workspace / src',
    });
  });

  it('creates a folder below the current canonical logical path', async () => {
    const port = explorerPort();
    render(<SandboxExplorerView port={port} />);

    fireEvent.click(await screen.findByRole('button', { name: 'src' }));
    await waitFor(() => {
      expect(port.listChildren).toHaveBeenLastCalledWith({
        sandboxId: root.id,
        parentPath: 'src',
        pageSize: 100,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'New folder' }));
    fireEvent.change(screen.getByLabelText('Folder name'), {
      target: { value: 'components' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create folder' }));

    await waitFor(() => {
      expect(port.createDirectory).toHaveBeenCalledWith({
        sandboxId: root.id,
        parentPath: 'src',
        name: 'components',
      });
    });
  });

  it('loads the next cursor page without replacing existing entries', async () => {
    const port = explorerPort();
    render(<SandboxExplorerView port={port} />);

    await screen.findByRole('button', { name: 'src' });
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await screen.findByText('README.md');
    expect(screen.getByText('src')).toBeTruthy();
    expect(port.listChildren).toHaveBeenLastCalledWith({
      sandboxId: root.id,
      parentPath: '',
      cursor: 'root-next',
      pageSize: 100,
    });
  });

  it('discards a cursor page that returns after directory navigation', async () => {
    let resolveOldPage: ((page: { items: readonly SandboxEntry[] }) => void) | undefined;
    const oldPage = new Promise<{ items: readonly SandboxEntry[] }>((resolve) => {
      resolveOldPage = resolve;
    });
    const port = explorerPort();
    port.listChildren.mockImplementation(async ({ parentPath, cursor }) => {
      if (cursor === 'root-next') return oldPage;
      if (parentPath === 'src') return { items: [] };
      return { items: [sourceDirectory], nextCursor: 'root-next' };
    });
    render(<SandboxExplorerView port={port} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    fireEvent.click(screen.getByRole('button', { name: 'src' }));
    await waitFor(() => {
      expect(port.listChildren).toHaveBeenLastCalledWith({
        sandboxId: root.id,
        parentPath: 'src',
        pageSize: 100,
      });
    });

    resolveOldPage?.({ items: [readmeFile] });
    await waitFor(() => expect(screen.queryByText('README.md')).toBeNull());
    expect(screen.getByRole('button', { name: 'Server workspace' })).toBeTruthy();
  });
});

describe('SandboxDirectoryPickerDialog', () => {
  it('stays unmounted while closed and closes from Escape', () => {
    const port = explorerPort();
    const onCancel = vi.fn();
    const { rerender } = render(
      <SandboxDirectoryPickerDialog
        open={false}
        port={port}
        onCancel={onCancel}
        onDirectorySelected={vi.fn()}
      />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(
      <SandboxDirectoryPickerDialog
        open
        port={port}
        onCancel={onCancel}
        onDirectorySelected={vi.fn()}
      />,
    );
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

function DirectoryPickerConsumer({
  onSelected,
}: {
  readonly onSelected: (selection: unknown) => void;
}) {
  const { pickDirectory } = useSandboxDirectoryPicker();
  return (
    <button
      type="button"
      onClick={() => void pickDirectory({ title: 'Choose project root' }).then(onSelected)}
    >
      Open picker
    </button>
  );
}

describe('SandboxDirectoryPickerProvider', () => {
  it('resolves a selected server directory and unmounts the dialog', async () => {
    const port = explorerPort();
    const onSelected = vi.fn();
    render(
      <SandboxDirectoryPickerProvider port={port}>
        <DirectoryPickerConsumer onSelected={onSelected} />
      </SandboxDirectoryPickerProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open picker' }));
    expect(await screen.findByRole('dialog', { name: 'Choose project root' })).toBeTruthy();
    await screen.findByRole('button', { name: 'src' });
    fireEvent.click(screen.getByRole('button', { name: 'Select directory' }));

    await waitFor(() => {
      expect(onSelected).toHaveBeenCalledWith({
        sandboxId: root.id,
        sandboxDisplayName: root.displayName,
        entryId: root.rootEntryId,
        directoryName: root.displayName,
        logicalPath: '',
        displayPath: 'Server workspace /',
      });
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('resolves cancellation as null', async () => {
    const onSelected = vi.fn();
    render(
      <SandboxDirectoryPickerProvider port={explorerPort()}>
        <DirectoryPickerConsumer onSelected={onSelected} />
      </SandboxDirectoryPickerProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open picker' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }));

    await waitFor(() => expect(onSelected).toHaveBeenCalledWith(null));
  });
});
