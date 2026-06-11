import React, { useEffect, useMemo, useState } from 'react';
import {
  LanguageProvider,
  SettingsModal,
  SystemSidebar,
  ThemeProvider,
  type PreferenceStorage,
  type SettingsTab,
} from 'sdkwork-drive-pc-commons';
import type { DriveSection } from 'sdkwork-drive-pc-file';
import {
  DriveAuthGate,
  DriveRuntimeProvider,
  type DriveRuntime,
  type DriveStorageSummary,
} from 'sdkwork-drive-pc-core';
import { createDrivePcRuntime } from './bootstrap/createDrivePcRuntime';
import {
  createDriveAccountViewModel,
  signOutDriveAccount,
} from './bootstrap/driveAccountViewModel';
import type { DriveIamRuntime } from './bootstrap/driveIamRuntime';

const DrivePage = React.lazy(() =>
  import('sdkwork-drive-pc-file').then((module) => ({ default: module.DrivePage })),
);
const StorageProvidersAdminPage = React.lazy(() =>
  import('sdkwork-drive-pc-admin-storage-providers').then((module) => ({
    default: module.StorageProvidersAdminPage,
  })),
);
const SdkworkIamAuthRoutes = React.lazy(() =>
  import('@sdkwork/auth-pc-react').then((module) => ({ default: module.SdkworkIamAuthRoutes })),
);

function isDriveAppAbortError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return true;
  }
  if (err instanceof Error) {
    return err.name === 'AbortError' || /\babort(?:ed)?\b/i.test(err.message);
  }
  return false;
}

export default function App() {
  const runtime = useMemo(() => createDrivePcRuntime(), []);
  const preferenceStorage = useMemo(() => createBrowserPreferenceStorage(), []);
  const [activeSection, setActiveSection] = useState<DriveSection>('my-storage');
  const [sessionSnapshot, setSessionSnapshot] = useState(() => runtime.session.getSnapshot());
  const [storageSummary, setStorageSummary] = useState<DriveStorageSummary | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>('account');

  useEffect(() => runtime.session.subscribe(setSessionSnapshot), [runtime.session]);

  useEffect(() => {
    if (!sessionSnapshot.context?.tenantId || !sessionSnapshot.context?.userId) {
      setStorageSummary(undefined);
      return;
    }

    let active = true;
    const storageAbortController = new AbortController();
    runtime.services.fileService
      .getStorageSummary({
        signal: storageAbortController.signal,
      })
      .then((summary) => {
        if (active) {
          setStorageSummary(summary);
        }
      })
      .catch((err) => {
        if (isDriveAppAbortError(err)) {
          return;
        }
        if (active) {
          setStorageSummary(undefined);
        }
      });

    return () => {
      active = false;
      storageAbortController.abort();
    };
  }, [
    runtime.services.fileService,
    sessionSnapshot.context?.tenantId,
    sessionSnapshot.context?.userId,
  ]);

  const account = useMemo(
    () => createDriveAccountViewModel(sessionSnapshot, storageSummary),
    [sessionSnapshot, storageSummary],
  );

  const handleSignOut = () => {
    void (async () => {
      try {
        await getDriveIamRuntime(runtime).service.auth.sessions.current.delete();
      } finally {
        signOutDriveAccount(runtime.session);
        if (typeof window !== 'undefined') {
          window.location.assign('/auth/login?redirect=%2F');
        }
      }
    })();
  };

  const openSettings = (tab: SettingsTab = 'account') => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  };

  return (
    <DriveRuntimeProvider runtime={runtime}>
      <LanguageProvider preferenceStorage={preferenceStorage}>
        <ThemeProvider preferenceStorage={preferenceStorage}>
          <DriveAuthGate
            authRoutes={
              <DriveAppbaseAuthRouteHost getRuntime={() => getDriveIamRuntime(runtime)} />
            }
            session={runtime.session}
          >
            <div className="flex w-[100vw] h-[100vh] overflow-hidden text-[#333] dark:text-[#eee] select-none font-sans bg-[#f5f5f5] dark:bg-[#111]">
              <SystemSidebar
                activeSection={activeSection}
                onSectionChange={setActiveSection}
                account={account}
                onSignOut={handleSignOut}
                isSettingsOpen={isSettingsOpen}
                onOpenSettings={openSettings}
              />
              <React.Suspense fallback={<DriveWorkspaceFallback />}>
                {activeSection === 'admin-storage-providers' ? (
                  <StorageProvidersAdminPage
                    adminStorageSdkClient={runtime.sdk.adminStorage}
                    getSession={runtime.session.getSnapshot}
                  />
                ) : (
                  <DrivePage
                    activeSection={activeSection}
                    fileService={runtime.services.fileService}
                    storageSummary={storageSummary}
                    onOpenExternal={runtime.host.openExternal}
                    onOpenStorageSettings={() => openSettings('storage')}
                    onSectionChange={setActiveSection}
                  />
                )}
              </React.Suspense>
              <SettingsModal
                isOpen={isSettingsOpen}
                initialTab={settingsInitialTab}
                onClose={() => setIsSettingsOpen(false)}
                account={account}
                onSignOut={handleSignOut}
                runtimeMode={runtime.config.deploymentMode}
                appApiBaseUrl={runtime.config.appApiBaseUrl}
              />
            </div>
          </DriveAuthGate>
        </ThemeProvider>
      </LanguageProvider>
    </DriveRuntimeProvider>
  );
}

function createBrowserPreferenceStorage(): PreferenceStorage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return {
    getItem(key) {
      return window.localStorage.getItem(key) ?? undefined;
    },
    setItem(key, value) {
      window.localStorage.setItem(key, value);
    },
  };
}

function DriveAppbaseAuthRouteHost({
  getRuntime,
}: {
  getRuntime: () => DriveIamRuntime;
}) {
  return (
    <React.Suspense fallback={<DriveAuthRoutesFallback />}>
      <SdkworkIamAuthRoutes
        basePath="/auth"
        getRuntime={getRuntime}
        homePath="/"
        viewportMode="fixed"
      />
    </React.Suspense>
  );
}

function getDriveIamRuntime(runtime: DriveRuntime): DriveIamRuntime {
  const iamRuntime = runtime.auth?.iamRuntime;
  if (!iamRuntime) {
    throw new Error('Drive IAM runtime is not configured.');
  }
  return iamRuntime as DriveIamRuntime;
}

function DriveWorkspaceFallback() {
  return (
    <div
      aria-label="Loading Drive workspace"
      className="flex h-full w-full flex-1 items-center justify-center bg-white dark:bg-[#111]"
    >
      <div className="h-7 w-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );
}

function DriveAuthRoutesFallback() {
  return (
    <div
      aria-label="Loading Drive auth routes"
      className="flex h-[100vh] w-[100vw] items-center justify-center bg-[#f5f5f5] dark:bg-[#111]"
    >
      <div className="h-7 w-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  );
}
