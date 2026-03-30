import { useEffect, type ReactNode } from 'react';

interface DesktopProvidersProps {
  children: ReactNode;
}

export function DesktopProviders({ children }: DesktopProvidersProps) {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const root = document.documentElement;
    const previousPlatform = root.getAttribute('data-app-platform');
    root.setAttribute('data-app-platform', 'desktop');
    document.body.setAttribute('data-drive-host', 'desktop');

    return () => {
      if (previousPlatform) {
        root.setAttribute('data-app-platform', previousPlatform);
      } else {
        root.removeAttribute('data-app-platform');
      }

      document.body.removeAttribute('data-drive-host');
    };
  }, []);

  return <>{children}</>;
}
