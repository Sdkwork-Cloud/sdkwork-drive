import type { SessionSnapshot, SessionStore } from './sessionStore';

export interface DriveSessionAuthTokens {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
}

export interface DriveSessionTokenManager {
  clearAccessToken(): void;
  clearAuthToken(): void;
  clearTokens(): void;
  getAccessToken(): string | undefined;
  getAuthToken(): string | undefined;
  getRefreshToken(): string | undefined;
  getTokens(): DriveSessionAuthTokens;
  hasAccessToken(): boolean;
  hasAuthToken(): boolean;
  hasToken(): boolean;
  isExpired(): boolean;
  isValid(): boolean;
  setAccessToken(token: string): void;
  setAuthToken(token: string): void;
  setRefreshToken(token: string): void;
  setTokens(tokens: DriveSessionAuthTokens): void;
  willExpireIn(seconds: number): boolean;
}

export function createDriveSessionTokenManager(
  session: SessionStore,
): DriveSessionTokenManager {
  return {
    clearAccessToken() {
      deleteDriveSessionFields(session, ['accessToken']);
    },
    clearAuthToken() {
      deleteDriveSessionFields(session, ['authToken']);
    },
    clearTokens() {
      session.clearSession();
    },
    getAccessToken() {
      return session.getSnapshot().accessToken;
    },
    getAuthToken() {
      return session.getSnapshot().authToken;
    },
    getRefreshToken() {
      return session.getSnapshot().refreshToken;
    },
    getTokens() {
      const snapshot = session.getSnapshot();
      return {
        accessToken: snapshot.accessToken,
        authToken: snapshot.authToken,
        refreshToken: snapshot.refreshToken,
      };
    },
    hasAccessToken() {
      return Boolean(session.getSnapshot().accessToken);
    },
    hasAuthToken() {
      return Boolean(session.getSnapshot().authToken);
    },
    hasToken() {
      const snapshot = session.getSnapshot();
      return Boolean(snapshot.authToken || snapshot.accessToken);
    },
    isExpired() {
      return false;
    },
    isValid() {
      const snapshot = session.getSnapshot();
      return Boolean(snapshot.authToken && snapshot.accessToken);
    },
    setAccessToken(token) {
      mergeDriveSession(session, { accessToken: token });
    },
    setAuthToken(token) {
      mergeDriveSession(session, { authToken: token });
    },
    setRefreshToken(token) {
      mergeDriveSession(session, { refreshToken: token });
    },
    setTokens(tokens) {
      replaceDriveSession(session, {
        ...session.getSnapshot(),
        accessToken: tokens.accessToken,
        authToken: tokens.authToken,
        refreshToken: tokens.refreshToken,
      });
    },
    willExpireIn(_seconds) {
      return false;
    },
  };
}

function mergeDriveSession(
  session: SessionStore,
  patch: Partial<SessionSnapshot>,
): void {
  replaceDriveSession(session, {
    ...session.getSnapshot(),
    ...compactSessionPatch(patch),
  });
}

function replaceDriveSession(
  session: SessionStore,
  nextSession: SessionSnapshot,
): void {
  const compact = compactSessionPatch(nextSession) as SessionSnapshot;
  if (!compact.authToken && !compact.accessToken && !compact.refreshToken) {
    session.clearSession();
    return;
  }

  session.setSession(compact);
}

function deleteDriveSessionFields(
  session: SessionStore,
  keys: Array<keyof SessionSnapshot>,
): void {
  replaceDriveSession(session, omitSessionKeys(session.getSnapshot(), keys));
}

function omitSessionKeys(
  snapshot: SessionSnapshot,
  keys: Array<keyof SessionSnapshot>,
): SessionSnapshot {
  const next = { ...snapshot };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

function compactSessionPatch<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}
