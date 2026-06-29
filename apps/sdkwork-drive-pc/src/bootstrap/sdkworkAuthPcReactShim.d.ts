import type { ReactElement, ReactNode } from 'react';
import type { SdkworkAuthAppearanceConfig, SdkworkAuthRuntimeConfig } from './driveAuthConfig';

// ── SdkworkIamAuthRoutes Props ────────────────────────────────────────────────

export interface SdkworkIamAuthRoutesProps {
  appearance?: SdkworkAuthAppearanceConfig;
  basePath?: string;
  getRuntime: () => unknown;
  homePath?: string;
  locale?: string;
  runtimeConfig?: SdkworkAuthRuntimeConfig;
  viewportMode?: 'fixed' | 'page';
}

export function SdkworkIamAuthRoutes(
  props: SdkworkIamAuthRoutesProps,
): ReactElement | null;

// ── SdkworkSessionAuthBrowserRoot ─────────────────────────────────────────────

export interface SdkworkSessionAuthBrowserRootProps {
  children?: ReactNode;
}

export function SdkworkSessionAuthBrowserRoot(
  props: SdkworkSessionAuthBrowserRootProps,
): ReactElement | null;

// ── Extended IamAppContext with Drive-specific actor fields ───────────────────

declare module '@sdkwork/iam-contracts' {
  interface IamAppContext {
    /** Actor ID for impersonation audit trail (Drive-specific). */
    actorId?: string;
    /** Actor kind (user, admin, system) for audit trail (Drive-specific). */
    actorKind?: string;
  }
}
