import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, clearSession, readSession, writeSession, type StoredSession } from './api';
import { atLeast, type AuthResponse, type Permissions, type Role, type SessionUser, type UserProfile } from './types';

export interface LoginInput {
  email: string;
  password: string;
  otp?: string;
  rememberMe?: boolean;
  tenant?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  tenantSlug: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  profile: UserProfile | null;
  permissions: Permissions;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<SessionUser>;
  register: (input: RegisterInput) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toSessionUser(profile: UserProfile): SessionUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    tenantId: profile.tenantId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => readSession());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(readSession()));

  const refreshProfile = useCallback(async () => {
    if (!readSession()) {
      setProfile(null);
      return null;
    }
    const { data } = await api.get<UserProfile>('/users/me');
    setProfile(data);
    const stored = readSession();
    if (stored) {
      const next = { ...stored, user: toSessionUser(data) };
      writeSession(next);
      setSession(next);
    }
    return data;
  }, []);

  const accessToken = session?.accessToken;

  useEffect(() => {
    let active = true;

    if (!accessToken) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    setIsLoading(true);
    refreshProfile()
      .catch(() => {
        if (active) {
          clearSession();
          setSession(null);
          setProfile(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessToken, refreshProfile]);

  const login = useCallback(async (input: LoginInput) => {
    const { data } = await api.post<AuthResponse>('/auth/login', {
      email: input.email,
      password: input.password,
      otp: input.otp || undefined,
      rememberMe: Boolean(input.rememberMe),
      tenant: input.tenant || undefined,
    });
    const next: StoredSession = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    };
    writeSession(next);
    setSession(next);
    return data.user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { data } = await api.post<AuthResponse>('/auth/register', input);
    const next: StoredSession = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    };
    writeSession(next);
    setSession(next);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    const stored = readSession();
    try {
      await api.post('/auth/logout', { refreshToken: stored?.refreshToken });
    } catch {
      /* the local session is cleared regardless of the server response */
    }
    clearSession();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: profile ? toSessionUser(profile) : session?.user ?? null,
      profile,
      permissions: profile?.permissions ?? {},
      isAuthenticated: Boolean(session),
      isLoading,
      login,
      register,
      logout,
      refreshProfile,
    }),
    [profile, session, isLoading, login, register, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 dark:border-slate-800 dark:border-t-indigo-400" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (isLoading && !profile) {
    return <FullPageSpinner />;
  }

  return <>{children}</>;
}

export function RequireRole({ minimum, children }: { minimum: Role; children: ReactNode }) {
  const { user, isLoading, profile } = useAuth();

  if (isLoading && !profile) {
    return <FullPageSpinner />;
  }

  if (!atLeast(user?.role, minimum)) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-10 text-center shadow-card dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
          You do not have access to this area
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          This page requires the {minimum} role or higher. Ask a workspace administrator if you
          believe this is a mistake.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
