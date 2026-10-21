import { api, clearSession, getSession, setSession, type StoredSession } from "./api";
import type { Role, SessionUser } from "@/types";

/**
 * Real JWT authentication against the Express API.
 * Session (user + access/refresh tokens) lives in sessionStorage.
 */

export const authService = {
  async login(email: string, password: string): Promise<SessionUser> {
    const data = await api.postPublic<{ user: SessionUser; accessToken: string; refreshToken: string }>(
      "/auth/login",
      { email: email.trim().toLowerCase(), password }
    );
    setSession({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.user;
  },

  async logout(): Promise<void> {
    const session = getSession();
    try {
      if (session?.refreshToken) {
        await api.post("/auth/logout", { refreshToken: session.refreshToken });
      }
    } catch {
      // Best effort — the local session is cleared regardless.
    }
    clearSession();
  },

  /** Stored session user — null when signed out. */
  getSessionUser(): SessionUser | null {
    return getSession()?.user ?? null;
  },

  /** Returns the full session record (tokens included). */
  getSession(): StoredSession | null {
    return getSession();
  },

  /**
   * Re-validates the session against the backend. Returns the freshest user
   * record (role/status/dealerships may have changed server-side) or null if
   * the session is no longer valid.
   */
  async me(): Promise<SessionUser | null> {
    const session = getSession();
    if (!session) return null;
    try {
      const user = await api.get<SessionUser>("/auth/me");
      setSession({ ...session, user });
      return user;
    } catch (e) {
      if (e instanceof Error && "status" in e && (e as { status: number }).status === 403) {
        clearSession();
        return null;
      }
      // Network errors keep the cached session — don't sign out on blips.
      return session.user;
    }
  },

  homePathFor(role: Role): string {
    return role === "admin" ? "/admin/dashboard" : "/accountant/dashboard";
  },

  loginPathFor(role?: Role | null): string {
    return role === "admin" ? "/admin/login" : "/login";
  },
};
