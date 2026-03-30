import { startTransition, useEffect, useEffectEvent } from 'react';
import { ROUTE_PATHS } from '@sdkwork/drive-shell';
import { DESKTOP_EVENTS } from '../catalog';
import { listenDesktopEvent } from '../runtime';

const ALLOWED_TRAY_ROUTES = new Set<string>([
  ROUTE_PATHS.DRIVE,
  ROUTE_PATHS.DRIVE_STARRED,
  ROUTE_PATHS.DRIVE_RECENT,
  ROUTE_PATHS.DRIVE_TRASH,
  ROUTE_PATHS.SETTINGS,
]);

interface TrayNavigatePayload {
  route: string;
}

declare global {
  interface Window {
    __SDKWORK_DRIVE_PENDING_TRAY_ROUTE__?: string;
  }
}

export function DesktopTrayRouteBridge() {
  const applyRoute = useEffectEvent((nextRoute: string) => {
    const route = nextRoute.trim();
    if (!ALLOWED_TRAY_ROUTES.has(route)) {
      return;
    }

    window.__SDKWORK_DRIVE_PENDING_TRAY_ROUTE__ = undefined;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl === route) {
      return;
    }

    startTransition(() => {
      window.history.pushState({}, '', route);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  });

  useEffect(() => {
    const pendingRoute = window.__SDKWORK_DRIVE_PENDING_TRAY_ROUTE__;
    if (pendingRoute) {
      applyRoute(pendingRoute);
    }
  }, [applyRoute]);

  useEffect(() => {
    const handleWindowEvent = (event: Event) => {
      const route = (event as CustomEvent<TrayNavigatePayload>).detail?.route;
      if (typeof route === 'string') {
        applyRoute(route);
      }
    };

    window.addEventListener('sdkwork-drive:tray-navigate', handleWindowEvent as EventListener);

    let disposed = false;
    let unlisten = () => {};

    void listenDesktopEvent<TrayNavigatePayload>(
      DESKTOP_EVENTS.trayNavigate,
      (payload) => {
        applyRoute(payload.route);
      },
    ).then((nextUnlisten) => {
      if (disposed) {
        void nextUnlisten();
        return;
      }

      unlisten = nextUnlisten;
    }).catch((error) => {
      console.error('[sdkwork-drive][desktop-tray-route-bridge] Failed to subscribe tray navigation.', error);
    });

    return () => {
      disposed = true;
      window.removeEventListener('sdkwork-drive:tray-navigate', handleWindowEvent as EventListener);
      void unlisten();
    };
  }, [applyRoute]);

  return null;
}
