import { AppProviders } from './application/providers/AppProviders.tsx';
import { AppRoutes } from './application/router/AppRoutes.tsx';

export function DriveApp() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}
