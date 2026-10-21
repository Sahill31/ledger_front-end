import * as React from "react";
import { authService } from "@/services/auth.service";
import { UNAUTHENTICATED_EVENT } from "@/services/api";
import type { SessionUser } from "@/types";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Fast path: cached session renders immediately, then we validate it
    // against the backend (expired/inactive sessions get cleared).
    setUser(authService.getSessionUser());
    setLoading(false);
    authService.me().then((fresh) => {
      if (authService.getSessionUser() && !fresh) setUser(null);
      else if (fresh) setUser(fresh);
    });
  }, []);

  React.useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(UNAUTHENTICATED_EVENT, onExpired);
    return () => window.removeEventListener(UNAUTHENTICATED_EVENT, onExpired);
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const sessionUser = await authService.login(email, password);
        setUser(sessionUser);
        return sessionUser;
      },
      logout: async () => {
        await authService.logout();
        setUser(null);
      },
      refreshUser: () => {
        // Pull the freshest record from the backend; fall back to the cache.
        void authService.me().then((fresh) => {
          if (fresh) setUser(fresh);
          else setUser(authService.getSessionUser());
        });
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
