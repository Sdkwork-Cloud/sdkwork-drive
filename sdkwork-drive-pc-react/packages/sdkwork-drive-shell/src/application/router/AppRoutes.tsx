import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppHeader } from '../../components/AppHeader.tsx';
import { MainLayout } from '../layouts/MainLayout.tsx';
import { ProtectedRoute } from './ProtectedRoute.tsx';
import { buildDriveUrl, resolveDrivePathFromLocation } from './routeMapping.ts';
import { ROUTE_PATHS } from './routePaths.ts';

const AuthPage = lazy(() =>
  import('@sdkwork/drive-auth').then((module) => ({
    default: module.AuthPage,
  })),
);

const AuthOAuthCallbackPage = lazy(() =>
  import('@sdkwork/drive-auth').then((module) => ({
    default: module.AuthOAuthCallbackPage,
  })),
);

const ProfileSettingsPage = lazy(() =>
  import('@sdkwork/drive-user').then((module) => ({
    default: module.ProfileSettingsPage,
  })),
);

const DriveWorkspaceScreen = lazy(async () => {
  const module = await import('@sdkwork/drive-drive');

  function DriveWorkspace() {
    const location = useLocation();
    const navigate = useNavigate();
    const drivePath = resolveDrivePathFromLocation(location.pathname, location.search);
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('q') || '';

    return (
      <module.DriveStoreProvider
        path={drivePath}
        searchQuery={searchQuery}
        onNavigate={(nextPath) => {
          navigate(buildDriveUrl(nextPath));
        }}
      >
        <module.DrivePage />
      </module.DriveStoreProvider>
    );
  }

  return {
    default: DriveWorkspace,
  };
});

function RouteFallback() {
  const { t } = useTranslation();

  return (
    <div
      aria-busy="true"
      className="flex min-h-[320px] flex-col items-center justify-center rounded-[28px] border border-white/60 bg-white/80 px-6 text-sm text-zinc-500 shadow-xl shadow-zinc-950/5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400"
    >
      <div className="w-full max-w-md space-y-3">
        <div className="h-4 animate-pulse rounded-full bg-zinc-200/80 dark:bg-zinc-800/80" />
        <div className="h-14 animate-pulse rounded-[22px] bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-14 animate-pulse rounded-[22px] bg-zinc-200/70 dark:bg-zinc-800/70" />
        <div className="h-14 animate-pulse rounded-[22px] bg-zinc-200/70 dark:bg-zinc-800/70" />
      </div>
      <div className="mt-6 font-medium">{t('common.loadingView')}</div>
    </div>
  );
}

function AuthLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_42%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_32%,#f8fafc_100%)] text-zinc-900 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(180deg,#09090b_0%,#111827_40%,#09090b_100%)] dark:text-zinc-50">
      <AppHeader authMode />
      <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTE_PATHS.ROOT} element={<Navigate to={ROUTE_PATHS.DRIVE} replace />} />

      <Route element={<AuthLayout />}>
        <Route path={ROUTE_PATHS.AUTH} element={<Navigate to={ROUTE_PATHS.LOGIN} replace />} />
        <Route
          path={ROUTE_PATHS.LOGIN}
          element={
            <Suspense fallback={<RouteFallback />}>
              <AuthPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTE_PATHS.REGISTER}
          element={
            <Suspense fallback={<RouteFallback />}>
              <AuthPage />
            </Suspense>
          }
        />
        <Route
          path={ROUTE_PATHS.FORGOT_PASSWORD}
          element={
            <Suspense fallback={<RouteFallback />}>
              <AuthPage />
            </Suspense>
          }
        />
        <Route
          path={`${ROUTE_PATHS.OAUTH_CALLBACK_PREFIX}/:provider`}
          element={
            <Suspense fallback={<RouteFallback />}>
              <AuthOAuthCallbackPage />
            </Suspense>
          }
        />
      </Route>

      <Route
        element={(
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        )}
      >
        <Route
          path={ROUTE_PATHS.DRIVE}
          element={
            <Suspense fallback={<RouteFallback />}>
              <DriveWorkspaceScreen />
            </Suspense>
          }
        />
        <Route
          path={ROUTE_PATHS.DRIVE_STARRED}
          element={
            <Suspense fallback={<RouteFallback />}>
              <DriveWorkspaceScreen />
            </Suspense>
          }
        />
        <Route
          path={ROUTE_PATHS.DRIVE_RECENT}
          element={
            <Suspense fallback={<RouteFallback />}>
              <DriveWorkspaceScreen />
            </Suspense>
          }
        />
        <Route
          path={ROUTE_PATHS.DRIVE_TRASH}
          element={
            <Suspense fallback={<RouteFallback />}>
              <DriveWorkspaceScreen />
            </Suspense>
          }
        />
        <Route
          path={ROUTE_PATHS.SETTINGS}
          element={
            <Suspense fallback={<RouteFallback />}>
              <ProfileSettingsPage />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to={ROUTE_PATHS.DRIVE} replace />} />
    </Routes>
  );
}
