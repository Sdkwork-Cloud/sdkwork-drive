export type PlatformKind = 'web' | 'desktop';

export interface PlatformRuntime {
  system: {
    kind(): PlatformKind;
    path(name: 'downloads'): Promise<string>;
  };
  fileSystem: {
    exists(path: string): Promise<boolean>;
    writeBinary(path: string, content: Uint8Array): Promise<void>;
  };
  network: {
    requestBinary(url: string, options?: RequestInit): Promise<Uint8Array>;
    downloadToFile(url: string, destinationPath: string, options?: RequestInit): Promise<void>;
  };
}

export interface DesktopPlatformBridge {
  system: {
    path(name: 'downloads'): Promise<string>;
  };
  fileSystem: {
    exists(path: string): Promise<boolean>;
    writeBinary(path: string, content: Uint8Array): Promise<void>;
    readBinary(path: string): Promise<Uint8Array>;
    selectFile(): Promise<string[]>;
  };
  network: {
    requestBinary(url: string, options?: RequestInit): Promise<Uint8Array>;
    downloadToFile(url: string, destinationPath: string, options?: RequestInit): Promise<void>;
  };
}

let desktopPlatformBridge: DesktopPlatformBridge | null = null;

function resolvePlatformKind(): PlatformKind {
  return desktopPlatformBridge ? 'desktop' : 'web';
}

export function configureDesktopPlatformBridge(bridge: DesktopPlatformBridge) {
  desktopPlatformBridge = bridge;
}

export function resetDesktopPlatformBridge() {
  desktopPlatformBridge = null;
}

function triggerBrowserDownload(blob: Blob, fileName: string) {
  if (typeof document === 'undefined') {
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

const webRuntime: PlatformRuntime = {
  system: {
    kind: () => resolvePlatformKind(),
    async path() {
      return 'Downloads';
    },
  },
  fileSystem: {
    async exists() {
      return false;
    },
    async writeBinary(path: string, content: Uint8Array) {
      triggerBrowserDownload(new Blob([content]), path.split(/[\\/]/).pop() || 'download.bin');
    },
  },
  network: {
    async requestBinary(url: string, options?: RequestInit) {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Failed to download resource: HTTP ${response.status}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    async downloadToFile(url: string, destinationPath: string, options?: RequestInit) {
      const bytes = await this.requestBinary(url, options);
      await webRuntime.fileSystem.writeBinary(destinationPath, bytes);
    },
  },
};

function getDesktopRuntime(): PlatformRuntime | null {
  if (!desktopPlatformBridge) {
    return null;
  }

  return {
    system: {
      kind: () => 'desktop',
      path: (name) => desktopPlatformBridge!.system.path(name),
    },
    fileSystem: {
      exists: (path) => desktopPlatformBridge!.fileSystem.exists(path),
      writeBinary: (path, content) => desktopPlatformBridge!.fileSystem.writeBinary(path, content),
    },
    network: {
      requestBinary: (url, options) => desktopPlatformBridge!.network.requestBinary(url, options),
      downloadToFile: (url, destinationPath, options) =>
        desktopPlatformBridge!.network.downloadToFile(url, destinationPath, options),
    },
  };
}

export const platform = {
  getPlatform(): PlatformKind {
    return resolvePlatformKind();
  },
  async selectFile(): Promise<string[]> {
    if (desktopPlatformBridge) {
      return desktopPlatformBridge.fileSystem.selectFile();
    }
    return [];
  },
  async readFileBinary(path?: string): Promise<Uint8Array> {
    if (desktopPlatformBridge && path) {
      return desktopPlatformBridge.fileSystem.readBinary(path);
    }

    throw new Error('Native file path reading is not available in the web runtime.');
  },
};

export function getPlatformRuntime(): PlatformRuntime {
  const desktopRuntime = getDesktopRuntime();
  if (desktopRuntime) {
    return desktopRuntime;
  }
  return webRuntime;
}

export function encodeTextToBytes(content: string) {
  return new TextEncoder().encode(content);
}
