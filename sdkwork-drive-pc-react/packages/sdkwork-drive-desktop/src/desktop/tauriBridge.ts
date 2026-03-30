import { invoke } from '@tauri-apps/api/core';
import {
  configureDesktopPlatformBridge,
  type DesktopPlatformBridge,
} from '@sdkwork/drive-core';
import { DESKTOP_COMMANDS, type DesktopCommandName } from './catalog';
import { getDesktopWindow, isTauriRuntime, waitForTauriRuntime } from './runtime';

interface DesktopAppInfo {
  name: string;
  version: string;
}

function headersToRecord(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) {
    return undefined;
  }

  const normalized = new Headers(headers);
  const entries = Array.from(normalized.entries()).filter(
    ([key, value]) => Boolean(key.trim()) && Boolean(value.trim()),
  );

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

async function invokeDriveDesktopCommand<T>(
  command: DesktopCommandName,
  payload?: Record<string, unknown>,
): Promise<T> {
  if (!(await waitForTauriRuntime())) {
    throw new Error(`Tauri runtime is unavailable for ${command}.`);
  }

  return invoke<T>(command, payload);
}

async function requestBinary(url: string, options?: RequestInit): Promise<Uint8Array> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Failed to download resource: HTTP ${response.status}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

const driveDesktopBridge: DesktopPlatformBridge = {
  system: {
    async path(name) {
      if (name !== 'downloads') {
        throw new Error(`Unsupported desktop system path: ${name}`);
      }

      return invokeDriveDesktopCommand<string>(DESKTOP_COMMANDS.downloadsDir);
    },
  },
  fileSystem: {
    exists(path) {
      return invokeDriveDesktopCommand<boolean>(DESKTOP_COMMANDS.pathExists, { path });
    },
    writeBinary(path, content) {
      return invokeDriveDesktopCommand<void>(DESKTOP_COMMANDS.writeBinaryFile, {
        path,
        content: Array.from(content),
      });
    },
    async readBinary(path) {
      const bytes = await invokeDriveDesktopCommand<number[]>(DESKTOP_COMMANDS.readBinaryFile, { path });
      return new Uint8Array(bytes);
    },
    selectFile() {
      return invokeDriveDesktopCommand<string[]>(DESKTOP_COMMANDS.pickFiles);
    },
  },
  network: {
    requestBinary,
    downloadToFile(url, destinationPath, options) {
      return invokeDriveDesktopCommand<void>(DESKTOP_COMMANDS.downloadToFile, {
        url,
        destinationPath,
        headers: headersToRecord(options?.headers) ?? null,
      });
    },
  },
  window: {
    minimize: () => minimizeWindow(),
    maximize: () => maximizeWindow(),
    restore: () => restoreWindow(),
    isMaximized: () => isWindowMaximized(),
    subscribeMaximized: (listener) => subscribeWindowMaximized(listener),
    close: () => closeWindow(),
  },
};

export function configureDriveDesktopPlatformBridge() {
  configureDesktopPlatformBridge(driveDesktopBridge);
}

export function getAppInfo() {
  return invokeDriveDesktopCommand<DesktopAppInfo>(DESKTOP_COMMANDS.appInfo);
}

export async function minimizeWindow(): Promise<void> {
  const currentWindow = getDesktopWindow();
  if (!currentWindow) {
    return;
  }

  await currentWindow.minimize();
}

export async function maximizeWindow(): Promise<void> {
  const currentWindow = getDesktopWindow();
  if (!currentWindow) {
    return;
  }

  if (await currentWindow.isFullscreen()) {
    await currentWindow.setFullscreen(false);
  }

  await currentWindow.maximize();
}

export async function restoreWindow(): Promise<void> {
  const currentWindow = getDesktopWindow();
  if (!currentWindow) {
    return;
  }

  const [
    isFullscreenWindow,
    isMaximizedWindow,
    isMinimizedWindow,
    isHiddenWindow,
  ] = await Promise.all([
    currentWindow.isFullscreen(),
    currentWindow.isMaximized(),
    currentWindow.isMinimized(),
    currentWindow.isVisible().then((isVisibleWindow) => !isVisibleWindow),
  ]);

  if (isHiddenWindow) {
    await currentWindow.show();
  }

  if (isFullscreenWindow) {
    await currentWindow.setFullscreen(false);
  }

  if (isMinimizedWindow) {
    await currentWindow.unminimize();
  }

  if (isMaximizedWindow) {
    await currentWindow.unmaximize();
  }

  if (isFullscreenWindow || isMinimizedWindow || isHiddenWindow) {
    await currentWindow.setFocus().catch(() => {});
  }
}

export async function isWindowMaximized(): Promise<boolean> {
  const currentWindow = getDesktopWindow();
  if (!currentWindow) {
    return false;
  }

  const [isFullscreenWindow, isMaximizedWindow] = await Promise.all([
    currentWindow.isFullscreen(),
    currentWindow.isMaximized(),
  ]);

  return isFullscreenWindow || isMaximizedWindow;
}

export async function subscribeWindowMaximized(
  listener: (isMaximized: boolean) => void,
): Promise<() => void> {
  if (!isTauriRuntime()) {
    return async () => {};
  }

  const currentWindow = getDesktopWindow();
  if (!currentWindow) {
    return async () => {};
  }

  let active = true;

  const emitWindowState = async () => {
    if (!active) {
      return;
    }

    listener(await isWindowMaximized());
  };

  await emitWindowState();

  const unlistenResize = await currentWindow.onResized(() => {
    void emitWindowState();
  });

  const unlistenMove = await currentWindow.onMoved(() => {
    void emitWindowState();
  });

  return async () => {
    active = false;
    await Promise.all([unlistenResize(), unlistenMove()]);
  };
}

export async function closeWindow(): Promise<void> {
  const currentWindow = getDesktopWindow();
  if (!currentWindow) {
    return;
  }

  await currentWindow.hide();
}
