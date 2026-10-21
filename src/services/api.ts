import type { SessionUser } from "@/types";

/**
 * Shared API client for the AutoLedger backend.
 *
 * - Base URL comes from VITE_API_BASE_URL (falls back to the local dev server).
 * - Bearer access token from the stored session is attached automatically.
 * - On 401 the client performs a single-flight token refresh and retries once;
 *   if refresh fails the session is cleared and `autoledger:unauthenticated`
 *   is dispatched so the auth context can drop the user (guards then redirect
 *   to the login page).
 */

export const API_BASE_URL = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:5000/api/v1"
).replace(/\/+$/, "");

const SESSION_KEY = "autoledger.session";
export const UNAUTHENTICATED_EVENT = "autoledger:unauthenticated";

export interface StoredSession {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.accessToken || !parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: StoredSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

function notifyUnauthenticated(): void {
  window.dispatchEvent(new Event(UNAUTHENTICATED_EVENT));
}

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: { code: string; message: string; details?: unknown };
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  let payload: Envelope<T> | null = null;
  try {
    payload = (await res.json()) as Envelope<T>;
  } catch {
    // Non-JSON response (e.g. proxy error page)
  }
  if (res.ok && payload?.success) return payload.data;
  const err = payload?.error;
  throw new ApiError(
    res.status,
    err?.code ?? "HTTP_ERROR",
    err?.message ?? `Request failed with status ${res.status}`,
    err?.details
  );
}

let refreshPromise: Promise<StoredSession> | null = null;

/** Exchanges the stored refresh token for a fresh token pair. */
export async function refreshSession(): Promise<StoredSession> {
  refreshPromise ??= (async () => {
    const session = getSession();
    if (!session?.refreshToken) throw new ApiError(401, "UNAUTHENTICATED", "No session.");
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    const data = await parseEnvelope<{
      user: SessionUser;
      accessToken: string;
      refreshToken: string;
    }>(res);
    const next: StoredSession = {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
    setSession(next);
    return next;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  /** Skip the Authorization header (public endpoints). */
  anonymous?: boolean;
}

async function request<T>(path: string, options: RequestOptions, isRetry: boolean): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {};
  if (!options.anonymous && session?.accessToken) {
    headers.Authorization = `Bearer ${session.accessToken}`;
  }

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData; // browser sets multipart boundary
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });

  if (res.status === 401 && !isRetry && !options.anonymous) {
    try {
      await refreshSession();
    } catch {
      clearSession();
      notifyUnauthenticated();
      throw new ApiError(401, "UNAUTHENTICATED", "Your session has expired. Please sign in again.");
    }
    return request<T>(path, options, true);
  }

  return parseEnvelope<T>(res);
}

export const api = {
  get<T>(path: string) {
    return request<T>(path, {}, false);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "POST", body }, false);
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "PUT", body }, false);
  },
  patch<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "PATCH", body }, false);
  },
  delete<T>(path: string) {
    return request<T>(path, { method: "DELETE" }, false);
  },
  postForm<T>(path: string, formData: FormData) {
    return request<T>(path, { method: "POST", formData }, false);
  },
  /** Public endpoint without Authorization (login, forgot/reset password). */
  postPublic<T>(path: string, body?: unknown) {
    return request<T>(path, { method: "POST", body, anonymous: true }, false);
  },
};

/** Builds a paginated query string, skipping empty/"all" values. */
export function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === "all") continue;
    q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
