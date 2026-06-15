// Types from @sdkwork/auth-pc-react
// These types are exported from the package but TypeScript may not resolve them correctly
// from workspace dependencies, so we define them locally for type safety

export interface SdkworkAuthAppearanceConfig {
  asidePanelClassName?: string;
  bodyClassName?: string;
  contentContainerClassName?: string;
  pageClassName?: string;
  qrFrameClassName?: string;
  shellClassName?: string;
  slotProps?: {
    background?: { className?: string };
    page?: { className?: string };
    shell?: { className?: string };
  };
  theme?: Record<string, string>;
}

export interface SdkworkAuthRuntimeConfig {
  leftRailMode?: string;
  loginMethods?: string[];
  oauthLoginEnabled?: boolean;
  oauthProviders?: string[];
  qrLoginEnabled?: boolean;
  recoveryMethods?: string[];
  registerMethods?: string[];
  verificationPolicy?: Record<string, boolean>;
  developmentPrefill?: Record<string, unknown>;
}

const DRIVE_VERIFICATION_POLICY = {
  emailCodeLoginEnabled: false,
  emailRegistrationVerificationRequired: false,
  phoneCodeLoginEnabled: false,
  phoneRegistrationVerificationRequired: false,
};

export function resolveDriveAuthRuntimeConfig(): SdkworkAuthRuntimeConfig {
  return {
    leftRailMode: 'qr-only',
    loginMethods: ['password'],
    oauthLoginEnabled: false,
    oauthProviders: [],
    qrLoginEnabled: true,
    recoveryMethods: [],
    registerMethods: ['email', 'phone'],
    verificationPolicy: DRIVE_VERIFICATION_POLICY,
  };
}

export function resolveDriveAuthAppearance(): SdkworkAuthAppearanceConfig {
  return {
    asidePanelClassName: 'sdkwork-drive-auth-aside-panel',
    bodyClassName: 'sdkwork-drive-auth-body',
    contentContainerClassName: 'sdkwork-drive-auth-content',
    pageClassName: 'sdkwork-drive-auth-page',
    qrFrameClassName: 'sdkwork-drive-auth-qr-frame',
    shellClassName: 'sdkwork-drive-auth-card-shell',
    slotProps: {
      background: {
        className: 'sdkwork-drive-auth-background',
      },
      page: {
        className: 'sdkwork-drive-auth-page',
      },
      shell: {
        className: 'sdkwork-drive-auth-card-shell',
      },
    },
    theme: {
      asideCardBackgroundColor: 'var(--sdkwork-drive-auth-aside-card-bg)',
      asideCardBorderColor: 'var(--sdkwork-drive-auth-aside-card-border)',
      asidePanelBackgroundColor: 'var(--sdkwork-drive-auth-aside-bg)',
      asidePanelBorderColor: 'var(--sdkwork-drive-auth-aside-border)',
      asidePanelColor: 'var(--sdkwork-drive-auth-aside-text)',
      badgeBackgroundColor: 'var(--sdkwork-drive-auth-aside-badge-bg)',
      badgeTextColor: 'var(--sdkwork-drive-auth-aside-badge-text)',
      contentBackgroundColor: 'var(--sdkwork-drive-auth-content-bg)',
      contentBorderColor: 'var(--sdkwork-drive-auth-content-border)',
      contentTextColor: 'var(--sdkwork-drive-auth-content-text)',
      descriptionColor: 'var(--sdkwork-drive-auth-muted-text)',
      dividerColor: 'var(--sdkwork-drive-auth-divider)',
      fieldBackgroundColor: 'var(--sdkwork-drive-auth-field-bg)',
      fieldBorderColor: 'var(--sdkwork-drive-auth-field-border)',
      fieldPlaceholderColor: '#9ca3af',
      fieldTextColor: 'var(--sdkwork-drive-auth-content-text)',
      formMutedTextColor: 'var(--sdkwork-drive-auth-muted-text)',
      iconMutedColor: 'var(--sdkwork-drive-auth-muted-text)',
      labelColor: 'var(--sdkwork-drive-auth-content-text)',
      pageBackgroundColor: 'var(--sdkwork-drive-auth-bg)',
      qrFrameBackgroundColor: 'var(--sdkwork-drive-auth-qr-bg)',
      qrFrameBorderColor: 'var(--sdkwork-drive-auth-qr-border)',
      shellBackdropFilter: 'blur(16px)',
      shellBackgroundColor: 'var(--sdkwork-drive-auth-content-bg)',
      shellBorderColor: 'var(--sdkwork-drive-auth-content-border)',
      tabActiveBackgroundColor: 'var(--sdkwork-drive-auth-tab-active-bg)',
      tabActiveTextColor: 'var(--sdkwork-drive-auth-content-text)',
      tabBackgroundColor: 'var(--sdkwork-drive-auth-tab-bg)',
      tabInactiveTextColor: 'var(--sdkwork-drive-auth-muted-text)',
      titleColor: 'var(--sdkwork-drive-auth-content-text)',
    },
  };
}

export function resolveDriveAuthLocale(): string | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const language = navigator.language.trim();
  return language || null;
}
