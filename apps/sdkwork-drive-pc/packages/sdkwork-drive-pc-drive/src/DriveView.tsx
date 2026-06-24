import React, { useEffect, useMemo, useState } from 'react';
import './driveSurface.css';
import {
  LanguageProvider,
  ThemeProvider,
} from 'sdkwork-drive-pc-commons';
import {
  DriveRuntimeProvider,
  isDriveAbortError,
  type DriveStorageSummary,
} from 'sdkwork-drive-pc-core';
import {
  DrivePage,
  type DriveSection,
} from 'sdkwork-drive-pc-file';

import { bindHostSessionToDriveStore } from './sessionBridge';
import { createHostManagedDriveRuntime } from './createHostManagedDriveRuntime';

function DriveWorkspaceFallback() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#111] text-gray-400">
      Loading Drive...
    </div>
  );
}

export const DriveView: React.FC = () => {
  const runtime = useMemo(() => createHostManagedDriveRuntime(), []);
  const [activeSection, setActiveSection] = useState<DriveSection>('my-storage');
  const [storageSummary, setStorageSummary] = useState<DriveStorageSummary | undefined>();
  const [sessionSnapshot, setSessionSnapshot] = useState(() => runtime.session.getSnapshot());

  useEffect(() => {
    const unbindHostSession = bindHostSessionToDriveStore(runtime.session);
    const unsubscribeSession = runtime.session.subscribe(setSessionSnapshot);
    return () => {
      unbindHostSession();
      unsubscribeSession();
    };
  }, [runtime.session]);

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
      .catch((error) => {
        if (isDriveAbortError(error)) {
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

  return (
    <DriveRuntimeProvider runtime={runtime}>
      <LanguageProvider>
        <ThemeProvider>
          <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden bg-[#111] text-[#eee]">
            <React.Suspense fallback={<DriveWorkspaceFallback />}>
              <DrivePage
                activeSection={activeSection}
                fileService={runtime.services.fileService}
                storageSummary={storageSummary}
                onOpenExternal={runtime.host.openExternal}
                onSectionChange={setActiveSection}
              />
            </React.Suspense>
          </div>
        </ThemeProvider>
      </LanguageProvider>
    </DriveRuntimeProvider>
  );
};
