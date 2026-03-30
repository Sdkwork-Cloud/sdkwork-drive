import {
  Component,
  startTransition,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { DriveApp } from '@sdkwork/drive-shell';
import { DesktopTrayRouteBridge } from './DesktopTrayRouteBridge';
import { DesktopProviders } from '../providers/DesktopProviders';
import { getDesktopWindow } from '../runtime';
import { getAppInfo } from '../tauriBridge';

const APP_STORAGE_KEY = 'sdkwork-drive-app-storage';
const SPLASH_MINIMUM_VISIBLE_MS = 220;

type StartupStatus = 'booting' | 'ready' | 'error';
type StartupLanguage = 'zh' | 'en';
type StartupThemeColor = 'lobster' | 'tech-blue' | 'green-tech' | 'zinc' | 'violet' | 'rose';
type StartupThemeMode = 'light' | 'dark' | 'system';

interface StartupAppearanceSnapshot {
  language: StartupLanguage;
  themeColor: StartupThemeColor;
  themeMode: StartupThemeMode;
  isDark: boolean;
}

interface DesktopBootstrapAppProps {
  appName: string;
  hasNativeRuntime: boolean;
  initialAppearance: StartupAppearanceSnapshot;
}

interface DesktopShellErrorBoundaryProps {
  resetKey: number;
  onError: (error: Error) => void;
  children: ReactNode;
}

interface DesktopShellErrorBoundaryState {
  hasError: boolean;
}

class DesktopShellErrorBoundary extends Component<
  DesktopShellErrorBoundaryProps,
  DesktopShellErrorBoundaryState
> {
  state: DesktopShellErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): DesktopShellErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo) {
    this.props.onError(error);
  }

  componentDidUpdate(prevProps: DesktopShellErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function waitFor(ms: number) {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

function normalizeLanguage(language?: string | null): StartupLanguage {
  if (language?.toLowerCase().startsWith('zh')) {
    return 'zh';
  }

  return 'en';
}

function normalizeThemeColor(value: unknown): StartupThemeColor {
  switch (value) {
    case 'lobster':
    case 'green-tech':
    case 'zinc':
    case 'violet':
    case 'rose':
      return value;
    default:
      return 'tech-blue';
  }
}

function normalizeThemeMode(value: unknown): StartupThemeMode {
  switch (value) {
    case 'light':
    case 'dark':
      return value;
    default:
      return 'system';
  }
}

function resolveErrorMessage(error: unknown, language: StartupLanguage) {
  const fallback = 'Desktop bootstrap failed. Review the Tauri runtime and local file permissions.';

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}

function readStorageAppearance() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(APP_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      state?: {
        languagePreference?: string;
        themeColor?: string;
        themeMode?: string;
      } | null;
    };

    return parsed.state ?? null;
  } catch {
    return null;
  }
}

function getStatusCopy(status: StartupStatus, language: StartupLanguage) {
  if (status === 'error') {
    return 'Startup failed';
  }

  if (status === 'ready') {
    return 'Desktop workspace ready';
  }

  return 'Connecting desktop runtime';
}

function getDescriptionCopy(language: StartupLanguage) {
  return 'Bootstrapping the drive workspace with the claw-studio desktop host pattern, native file access, and persisted appearance.';
}

function getHighlights(language: StartupLanguage) {
  return [
    'Native downloads directory and binary writes',
    'Desktop file picking and local import reads',
    'Layered claw-studio-style desktop host',
  ];
}

interface DesktopStartupScreenProps {
  appName: string;
  language: StartupLanguage;
  status: StartupStatus;
  errorMessage: string | null;
  visible: boolean;
  onRetry: () => void;
}

function DesktopStartupScreen({
  appName,
  language,
  status,
  errorMessage,
  visible,
  onRetry,
}: DesktopStartupScreenProps) {
  const highlights = useMemo(() => getHighlights(language), [language]);
  const statusCopy = getStatusCopy(status, language);
  const descriptionCopy = getDescriptionCopy(language);
  const progressWidth = status === 'ready' ? '100%' : status === 'error' ? '100%' : '68%';

  return (
    <div
      className={[
        'absolute inset-0 z-20 transition-all duration-300',
        visible ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.32),_transparent_54%),linear-gradient(135deg,_rgba(15,23,42,0.94),_rgba(9,9,11,0.98))]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="relative mx-auto flex h-full max-w-6xl items-center justify-center px-10">
        <div className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-white/12 bg-white/6 p-10 shadow-[0_40px_120px_rgba(15,23,42,0.55)] backdrop-blur-2xl">
          <div className="flex items-center gap-6">
            <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[26px] bg-gradient-to-br from-primary-300/80 via-primary-500/80 to-primary-700/90 text-3xl font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
              D
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.34em] text-white/45">
                Desktop Workspace
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">{appName}</h1>
              <p className="max-w-2xl text-sm leading-6 text-white/68">{descriptionCopy}</p>
            </div>
          </div>

          <div className="mt-8 rounded-[24px] border border-white/10 bg-black/18 p-6">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-white/82">{statusCopy}</span>
              <span className="text-xs uppercase tracking-[0.28em] text-white/42">
                {status === 'error' ? 'Error' : 'Host Bootstrap'}
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={[
                  'h-full rounded-full bg-gradient-to-r from-primary-300 via-primary-500 to-primary-700 transition-all duration-500',
                  status === 'error' ? 'opacity-80' : '',
                ].join(' ')}
                style={{ width: progressWidth }}
              />
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-[24px] border border-rose-300/30 bg-rose-500/12 p-6 text-white">
              <p className="text-sm font-medium">
                Desktop bootstrap error
              </p>
              <p className="mt-2 text-sm leading-6 text-white/72">{errorMessage}</p>
              <button
                type="button"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-950 transition hover:bg-white/90"
                onClick={onRetry}
              >
                Retry bootstrap
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {highlights.map((highlight) => (
                <div
                  key={highlight}
                  className="rounded-[20px] border border-white/10 bg-white/6 px-4 py-4 text-sm leading-6 text-white/72"
                >
                  {highlight}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function readInitialStartupAppearance(): StartupAppearanceSnapshot {
  if (typeof window === 'undefined') {
    return {
      language: 'en',
      themeColor: 'tech-blue',
      themeMode: 'system',
      isDark: true,
    };
  }

  const storedAppearance = readStorageAppearance();
  const languagePreference = storedAppearance?.languagePreference;
  const themeMode = normalizeThemeMode(storedAppearance?.themeMode);
  const browserLanguage = normalizeLanguage(window.navigator.language);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    language:
      languagePreference === 'system' || !languagePreference
        ? browserLanguage
        : normalizeLanguage(languagePreference),
    themeColor: normalizeThemeColor(storedAppearance?.themeColor),
    themeMode,
    isDark: themeMode === 'dark' || (themeMode === 'system' && prefersDark),
  };
}

export function applyStartupAppearanceHints(appearance: StartupAppearanceSnapshot) {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.setAttribute('lang', appearance.language);
  root.setAttribute('data-app-platform', 'desktop');
  root.setAttribute('data-theme', appearance.themeColor);
  root.classList.toggle('dark', appearance.isDark);

  document.body.style.backgroundColor = appearance.isDark ? '#09090b' : '#eff6ff';
  document.body.style.color = appearance.isDark ? '#f8fafc' : '#0f172a';
}

export function DesktopBootstrapApp({
  appName,
  hasNativeRuntime,
  initialAppearance,
}: DesktopBootstrapAppProps) {
  const [status, setStatus] = useState<StartupStatus>('booting');
  const [showShell, setShowShell] = useState(false);
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retrySeed, setRetrySeed] = useState(0);
  const startedAtRef = useRef(Date.now());

  const handleShellError = useEffectEvent((error: Error) => {
    setStatus('error');
    setErrorMessage(resolveErrorMessage(error, initialAppearance.language));
    setShowShell(false);
    setIsSplashVisible(true);
  });

  useEffect(() => {
    let cancelled = false;
    startedAtRef.current = Date.now();
    setStatus('booting');
    setErrorMessage(null);
    setShowShell(false);
    setIsSplashVisible(true);

    void (async () => {
      try {
        if (hasNativeRuntime) {
          await getAppInfo();
          await waitForNextPaint();

          const desktopWindow = getDesktopWindow();
          if (desktopWindow) {
            await desktopWindow.show();
            await desktopWindow.setFocus().catch(() => {
              // Focus is best-effort after reveal.
            });
          }
        }

        if (cancelled) {
          return;
        }

        startTransition(() => {
          setShowShell(true);
          setStatus('ready');
        });

        await waitFor(
          Math.max(0, SPLASH_MINIMUM_VISIBLE_MS - (Date.now() - startedAtRef.current)),
        );
        if (cancelled) {
          return;
        }

        setIsSplashVisible(false);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus('error');
        setErrorMessage(resolveErrorMessage(error, initialAppearance.language));
        setShowShell(false);
        setIsSplashVisible(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasNativeRuntime, initialAppearance.language, retrySeed]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#09090b]">
      {showShell ? (
        <DesktopProviders>
          <DesktopShellErrorBoundary
            resetKey={retrySeed}
            onError={handleShellError}
          >
            <div
              className={[
                'h-full w-full transition-all duration-300',
                isSplashVisible ? 'scale-[0.992] opacity-0' : 'scale-100 opacity-100',
              ].join(' ')}
            >
              <DesktopTrayRouteBridge />
              <DriveApp />
            </div>
          </DesktopShellErrorBoundary>
        </DesktopProviders>
      ) : null}

      <DesktopStartupScreen
        appName={appName}
        language={initialAppearance.language}
        status={status}
        errorMessage={errorMessage}
        visible={isSplashVisible || status === 'error'}
        onRetry={() => {
          setRetrySeed((value) => value + 1);
        }}
      />
    </div>
  );
}

export function resolveDesktopBootstrapContext() {
  return {
    appName: 'SDKWork Drive',
    initialAppearance: readInitialStartupAppearance(),
  };
}
