import { isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import type { DesktopEventName } from './catalog';

interface TauriInternalsLike {
  invoke?: unknown;
}

const TAURI_RUNTIME_WAIT_TIMEOUT_MS = 600;
const TAURI_RUNTIME_WAIT_POLL_MS = 20;

function resolveTauriInternals() {
  if (typeof window === 'undefined') {
    return null;
  }

  const runtimeWindow = window as Window & {
    __TAURI_INTERNALS__?: TauriInternalsLike;
  };

  return runtimeWindow.__TAURI_INTERNALS__ ?? null;
}

export function isTauriRuntime() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (isTauri()) {
    return true;
  }

  const tauriInternals = resolveTauriInternals();
  return Boolean(tauriInternals && typeof tauriInternals.invoke === 'function');
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function waitForTauriRuntime(options?: {
  timeoutMs?: number;
  pollMs?: number;
}): Promise<boolean> {
  if (isTauriRuntime()) {
    return true;
  }

  if (typeof window === 'undefined') {
    return false;
  }

  const timeoutMs = Math.max(0, options?.timeoutMs ?? TAURI_RUNTIME_WAIT_TIMEOUT_MS);
  const pollMs = Math.max(1, options?.pollMs ?? TAURI_RUNTIME_WAIT_POLL_MS);
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await sleep(pollMs);
    if (isTauriRuntime()) {
      return true;
    }
  }

  return isTauriRuntime();
}

export function getDesktopWindow() {
  if (!isTauriRuntime()) {
    return null;
  }

  return getCurrentWindow();
}

export async function listenDesktopEvent<T>(
  event: DesktopEventName,
  listener: (payload: T) => void,
): Promise<() => void> {
  if (!(await waitForTauriRuntime())) {
    return () => {};
  }

  return listen<T>(event, (nextEvent) => {
    listener(nextEvent.payload);
  });
}
