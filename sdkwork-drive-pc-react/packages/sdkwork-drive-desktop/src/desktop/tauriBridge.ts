import { invoke } from '@tauri-apps/api/core';
import {
  configureDesktopPlatformBridge,
  type DesktopPlatformBridge,
} from '@sdkwork/drive-core';
import { DESKTOP_COMMANDS, type DesktopCommandName } from './catalog';
import { waitForTauriRuntime } from './runtime';

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
};

export function configureDriveDesktopPlatformBridge() {
  configureDesktopPlatformBridge(driveDesktopBridge);
}

export function getAppInfo() {
  return invokeDriveDesktopCommand<DesktopAppInfo>(DESKTOP_COMMANDS.appInfo);
}
