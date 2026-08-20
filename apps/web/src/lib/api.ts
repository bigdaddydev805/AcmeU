import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type { AuthTokens, SessionUser } from './types';

export const SESSION_KEY = 'acmeu.session';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL ?? '/graphql';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    return parsed && parsed.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(session: StoredSession): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function patchSession(patch: Partial<StoredSession>): StoredSession | null {
  const current = readSession();
  if (!current) return null;
  const next = { ...current, ...patch };
  writeSession(next);
  return next;
}

export function clearSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const session = readSession();
  if (session?.accessToken) {
    config.headers = { ...(config.headers ?? {}), Authorization: `Bearer ${session.accessToken}` };
  }
  return config;
});

interface RetryableRequest extends AxiosRequestConfig {
  _retried?: boolean;
}

let inflightRefresh: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const session = readSession();
  if (!session?.refreshToken) {
    throw new Error('no refresh token available');
  }

  const response = await axios.post<AuthTokens>(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken: session.refreshToken },
    { withCredentials: true },
  );

  const { accessToken, refreshToken } = response.data;
  writeSession({ ...session, accessToken, refreshToken: refreshToken ?? session.refreshToken });
  return accessToken;
}

function refreshOnce(): Promise<string> {
  if (!inflightRefresh) {
    inflightRefresh = refreshAccessToken().finally(() => {
      inflightRefresh = null;
    });
  }
  return inflightRefresh;
}

function redirectToLogin(): void {
  const { pathname, search } = window.location;
  if (pathname === '/login') return;
  const from = encodeURIComponent(`${pathname}${search}`);
  window.location.assign(`/login?next=${from}`);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableRequest | undefined;
    const status = error.response?.status;
    const isAuthCall = typeof original?.url === 'string' && original.url.startsWith('/auth/');

    if (status !== 401 || !original || original._retried || isAuthCall) {
      return Promise.reject(error);
    }

    original._retried = true;

    try {
      const accessToken = await refreshOnce();
      original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${accessToken}` };
      return await api.request(original);
    } catch {
      clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }
  },
);

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string;
  };
}

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const body: unknown = axiosError?.response?.data;
  if (typeof body === 'string' && body.trim()) return body;
  const message = (body as ApiErrorBody | undefined)?.error?.message;
  if (message) return message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function errorCode(error: unknown): string | undefined {
  const axiosError = error as AxiosError<ApiErrorBody>;
  return axiosError?.response?.data?.error?.code;
}

export async function getJson<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.get<T>(url, config);
  return response.data;
}

interface GraphQLEnvelope<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const session = readSession();
  const response = await axios.post<GraphQLEnvelope<T>>(
    GRAPHQL_URL,
    { query, variables },
    {
      withCredentials: true,
      headers: session?.accessToken
        ? { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` }
        : { 'Content-Type': 'application/json' },
    },
  );

  const { data, errors } = response.data;
  if (errors?.length) {
    throw new Error(errors.map((entry) => entry.message).join('; '));
  }
  return data as T;
}
