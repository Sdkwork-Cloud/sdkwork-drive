import type {
  LoginForm,
  LoginVO,
  OAuthAuthUrlForm,
  OAuthLoginForm,
  OAuthUrlVO,
  PasswordResetRequestForm,
  QrCodeStatusVO,
  QrCodeVO,
  RegisterForm,
  TokenRefreshForm,
  UserInfoVO,
  VerifyCodeCheckForm,
  VerifyCodeSendForm,
  VerifyResultVO,
} from '@sdkwork/app-sdk';
import {
  clearAppSdkSessionTokens,
  getAppSdkClientWithSession,
  persistAppSdkSessionTokens,
  readAppSdkSessionTokens,
  resolveAppSdkAccessToken,
} from '../sdk/useAppSdkClient.ts';
import { unwrapAppSdkResponse } from '../sdk/appSdkResult.ts';

export type AppAuthVerifyType = 'EMAIL' | 'PHONE';
export type AppAuthScene = 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD';
export type AppAuthPasswordResetChannel = 'EMAIL' | 'SMS';
export type AppAuthSocialProvider = 'wechat' | 'github' | 'google' | 'douyin';
export type AppAuthOAuthDeviceType = 'web' | 'desktop' | 'android' | 'ios';
export type AppAuthLoginQrCodeStatus = 'pending' | 'scanned' | 'confirmed' | 'expired';

export interface AppAuthLoginInput {
  username: string;
  password: string;
}

export interface AppAuthRegisterInput {
  username: string;
  password: string;
  confirmPassword?: string;
  email?: string;
  phone?: string;
  verificationCode?: string;
}

export interface AppAuthSendVerifyCodeInput {
  target: string;
  verifyType: AppAuthVerifyType;
  scene: AppAuthScene;
}

export interface AppAuthVerifyCodeInput extends AppAuthSendVerifyCodeInput {
  code: string;
}

export interface AppAuthPasswordResetRequestInput {
  account: string;
  channel: AppAuthPasswordResetChannel;
}

export interface AppAuthOAuthAuthorizationInput {
  provider: AppAuthSocialProvider;
  redirectUri: string;
  scope?: string;
  state?: string;
}

export interface AppAuthOAuthLoginInput {
  provider: AppAuthSocialProvider;
  code: string;
  state?: string;
  deviceId?: string;
  deviceType?: AppAuthOAuthDeviceType;
}

export interface AppAuthSession {
  authToken: string;
  accessToken: string;
  refreshToken?: string;
  userInfo?: UserInfoVO;
}

export interface AppAuthLoginQrCode {
  type?: string;
  title?: string;
  description?: string;
  qrKey: string;
  qrUrl?: string;
  qrContent?: string;
  expireTime?: number;
}

export interface AppAuthLoginQrCodeStatusResult {
  status: AppAuthLoginQrCodeStatus;
  session?: AppAuthSession;
  userInfo?: UserInfoVO;
}

function mapScene(scene: AppAuthScene): VerifyCodeSendForm['type'] {
  if (scene === 'REGISTER') {
    return 'REGISTER';
  }
  if (scene === 'RESET_PASSWORD') {
    return 'RESET_PASSWORD';
  }
  return 'LOGIN';
}

function mapVerifyType(type: AppAuthVerifyType): VerifyCodeSendForm['verifyType'] {
  return type === 'EMAIL' ? 'EMAIL' : 'PHONE';
}

function mapSocialProvider(provider: AppAuthSocialProvider): OAuthAuthUrlForm['provider'] {
  if (provider === 'wechat') {
    return 'WECHAT';
  }
  if (provider === 'github') {
    return 'GITHUB';
  }
  if (provider === 'google') {
    return 'GOOGLE';
  }
  return 'DOUYIN';
}

function mapQrStatus(status?: QrCodeStatusVO['status']): AppAuthLoginQrCodeStatus {
  if (status === 'scanned' || status === 'confirmed' || status === 'expired') {
    return status;
  }
  return 'pending';
}

function readOptionalString(value?: string | null): string | undefined {
  const normalized = (value || '').trim();
  return normalized || undefined;
}

function mapSession(loginData: LoginVO): AppAuthSession {
  const authToken = (loginData.authToken || '').trim();
  if (!authToken) {
    throw new Error('Auth token is missing.');
  }

  return {
    authToken,
    accessToken: resolveAppSdkAccessToken(),
    refreshToken: (loginData.refreshToken || '').trim() || undefined,
    userInfo: loginData.userInfo,
  };
}

function persistSession(session: AppAuthSession) {
  persistAppSdkSessionTokens(session);
  return session;
}

export const appAuthService = {
  async login(input: AppAuthLoginInput): Promise<AppAuthSession> {
    const client = getAppSdkClientWithSession();
    const loginData = unwrapAppSdkResponse<LoginVO>(
      await client.auth.login({
        username: input.username.trim(),
        password: input.password,
      } satisfies LoginForm),
      'Failed to sign in.',
    );
    return persistSession(mapSession(loginData));
  },

  async register(input: AppAuthRegisterInput): Promise<AppAuthSession> {
    const client = getAppSdkClientWithSession();
    const request: RegisterForm = {
      username: input.username.trim(),
      password: input.password,
      confirmPassword: input.confirmPassword || input.password,
      email: input.email?.trim(),
      phone: input.phone?.trim(),
    };
    unwrapAppSdkResponse(await client.auth.register(request), 'Failed to register.');

    return this.login({
      username: request.username,
      password: input.password,
    });
  },

  async logout(): Promise<void> {
    const client = getAppSdkClientWithSession();
    try {
      unwrapAppSdkResponse(await client.auth.logout(), 'Failed to sign out.');
    } finally {
      clearAppSdkSessionTokens();
    }
  },

  async refreshToken(refreshToken?: string): Promise<AppAuthSession> {
    const client = getAppSdkClientWithSession();
    const storedTokens = readAppSdkSessionTokens();
    const nextRefreshToken = (refreshToken || storedTokens.refreshToken || '').trim();
    if (!nextRefreshToken) {
      throw new Error('Refresh token is required.');
    }

    const loginData = unwrapAppSdkResponse<LoginVO>(
      await client.auth.refreshToken({
        refreshToken: nextRefreshToken,
      } satisfies TokenRefreshForm),
      'Failed to refresh session.',
    );

    return persistSession({
      ...mapSession(loginData),
      refreshToken: (loginData.refreshToken || nextRefreshToken).trim() || undefined,
    });
  },

  async sendVerifyCode(input: AppAuthSendVerifyCodeInput): Promise<void> {
    const client = getAppSdkClientWithSession();
    unwrapAppSdkResponse(
      await client.auth.sendSmsCode({
        target: input.target.trim(),
        type: mapScene(input.scene),
        verifyType: mapVerifyType(input.verifyType),
      } satisfies VerifyCodeSendForm),
      'Failed to send verify code.',
    );
  },

  async verifyCode(input: AppAuthVerifyCodeInput): Promise<boolean> {
    const client = getAppSdkClientWithSession();
    const result = unwrapAppSdkResponse<VerifyResultVO>(
      await client.auth.verifySmsCode({
        target: input.target.trim(),
        type: mapScene(input.scene),
        verifyType: mapVerifyType(input.verifyType),
        code: input.code.trim(),
      } satisfies VerifyCodeCheckForm),
      'Failed to verify code.',
    );
    return Boolean(result?.valid);
  },

  async requestPasswordReset(input: AppAuthPasswordResetRequestInput): Promise<void> {
    const client = getAppSdkClientWithSession();
    unwrapAppSdkResponse(
      await client.auth.requestPasswordResetChallenge({
        account: input.account.trim(),
        channel: input.channel,
      } satisfies PasswordResetRequestForm),
      'Failed to request password reset.',
    );
  },

  async getOAuthAuthorizationUrl(input: AppAuthOAuthAuthorizationInput): Promise<string> {
    const client = getAppSdkClientWithSession();
    const oauthUrl = unwrapAppSdkResponse<OAuthUrlVO>(
      await client.auth.getOauthUrl({
        provider: mapSocialProvider(input.provider),
        redirectUri: input.redirectUri.trim(),
        scope: readOptionalString(input.scope),
        state: readOptionalString(input.state),
      } satisfies OAuthAuthUrlForm),
      'Failed to start OAuth login.',
    );

    const authUrl = (oauthUrl?.authUrl || '').trim();
    if (!authUrl) {
      throw new Error('OAuth authorization URL is missing.');
    }
    return authUrl;
  },

  async loginWithOAuth(input: AppAuthOAuthLoginInput): Promise<AppAuthSession> {
    const client = getAppSdkClientWithSession();
    const loginData = unwrapAppSdkResponse<LoginVO>(
      await client.auth.oauthLogin({
        provider: mapSocialProvider(input.provider),
        code: input.code.trim(),
        state: readOptionalString(input.state),
        deviceId: readOptionalString(input.deviceId),
        deviceType: readOptionalString(input.deviceType),
      } satisfies OAuthLoginForm),
      'Failed to complete OAuth login.',
    );

    return persistSession(mapSession(loginData));
  },

  async generateLoginQrCode(): Promise<AppAuthLoginQrCode> {
    const client = getAppSdkClientWithSession();
    const qrCode = unwrapAppSdkResponse<QrCodeVO>(
      await client.auth.generateQrCode(),
      'Failed to generate login QR code.',
    );
    const qrKey = (qrCode?.qrKey || '').trim();
    if (!qrKey) {
      throw new Error('QR code key is missing.');
    }

    return {
      type: readOptionalString(qrCode.type),
      title: readOptionalString(qrCode.title),
      description: readOptionalString(qrCode.description),
      qrKey,
      qrUrl: readOptionalString(qrCode.qrUrl),
      qrContent: readOptionalString(qrCode.qrContent),
      expireTime: typeof qrCode.expireTime === 'number' ? qrCode.expireTime : undefined,
    };
  },

  async checkLoginQrCodeStatus(qrKey: string): Promise<AppAuthLoginQrCodeStatusResult> {
    const client = getAppSdkClientWithSession();
    const qrCodeStatus = unwrapAppSdkResponse<QrCodeStatusVO>(
      await client.auth.checkQrCodeStatus(qrKey.trim()),
      'Failed to check login QR code status.',
    );
    const status = mapQrStatus(qrCodeStatus?.status);

    if (status !== 'confirmed' || !qrCodeStatus?.token) {
      return {
        status,
        userInfo: qrCodeStatus?.userInfo,
      };
    }

    const session = persistSession(mapSession(qrCodeStatus.token));
    return {
      status,
      session,
      userInfo: qrCodeStatus.userInfo || qrCodeStatus.token.userInfo,
    };
  },

  async getCurrentSession(): Promise<AppAuthSession | null> {
    const tokens = readAppSdkSessionTokens();
    const authToken = (tokens.authToken || '').trim();
    if (!authToken) {
      return null;
    }

    return {
      authToken,
      accessToken: resolveAppSdkAccessToken(),
      refreshToken: tokens.refreshToken,
    };
  },
};

export type AppAuthService = typeof appAuthService;
