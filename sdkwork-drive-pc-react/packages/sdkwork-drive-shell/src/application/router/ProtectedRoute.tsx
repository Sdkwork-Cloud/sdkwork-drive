import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@sdkwork/drive-core';
import { ROUTE_PATHS } from './routePaths.ts';

export interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    const redirectTarget = `${location.pathname}${location.search}${location.hash}`;
    const nextSearch = redirectTarget && redirectTarget !== ROUTE_PATHS.DRIVE
      ? `?redirect=${encodeURIComponent(redirectTarget)}`
      : '';

    return <Navigate to={`${ROUTE_PATHS.LOGIN}${nextSearch}`} replace />;
  }

  return <>{children}</>;
}
