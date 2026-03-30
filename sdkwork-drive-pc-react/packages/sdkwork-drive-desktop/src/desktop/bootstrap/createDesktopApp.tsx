import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { configureDriveDesktopPlatformBridge } from '../tauriBridge';
import { waitForTauriRuntime } from '../runtime';
import {
  applyStartupAppearanceHints,
  DesktopBootstrapApp,
  resolveDesktopBootstrapContext,
} from './DesktopBootstrapApp';

export async function createDesktopApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element #root was not found.');
  }

  const bootstrapContext = resolveDesktopBootstrapContext();
  applyStartupAppearanceHints(bootstrapContext.initialAppearance);
  const hasNativeRuntime = await waitForTauriRuntime();
  if (hasNativeRuntime) {
    configureDriveDesktopPlatformBridge();
  }

  createRoot(rootElement).render(
    <StrictMode>
      <DesktopBootstrapApp
        appName={bootstrapContext.appName}
        hasNativeRuntime={hasNativeRuntime}
        initialAppearance={bootstrapContext.initialAppearance}
      />
    </StrictMode>,
  );
}
