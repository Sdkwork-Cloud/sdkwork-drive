export type WindowControlAction = 'minimize' | 'maximize' | 'unmaximize' | 'close' | 'show';

export interface HostAdapter {
  isNativeHost: boolean;
  windowControl(action: WindowControlAction): Promise<void>;
  openExternal(url: string): Promise<void>;
  writeTextToClipboard(text: string): Promise<void>;
}

interface TauriGlobal {
  core?: {
    invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
  };
  shell?: {
    open(url: string): Promise<void>;
  };
  clipboard?: {
    writeText(text: string): Promise<void>;
  };
}

function getTauriGlobal(): TauriGlobal | undefined {
  return (globalThis as typeof globalThis & { __TAURI__?: TauriGlobal }).__TAURI__;
}

function assertSafeExternalUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only HTTP(S) URLs can be opened externally.');
  }
}

export function createHostAdapter(): HostAdapter {
  const tauri = getTauriGlobal();

  return {
    isNativeHost: Boolean(tauri),
    async windowControl(action) {
      if (!tauri?.core?.invoke) {
        return;
      }
      await tauri.core.invoke('window_control', { request: { action } });
    },
    async openExternal(url) {
      assertSafeExternalUrl(url);
      if (tauri?.shell?.open) {
        await tauri.shell.open(url);
        return;
      }
      globalThis.open?.(url, '_blank', 'noopener,noreferrer');
    },
    async writeTextToClipboard(text) {
      if (tauri?.clipboard?.writeText) {
        await tauri.clipboard.writeText(text);
        return;
      }
      await navigator.clipboard?.writeText(text);
    },
  };
}
