import { Navigate, Outlet, useLocation } from "react-router-dom";
import { authService } from "@/services/auth.service";
import type { Role } from "@/types";
import { useAuth } from "./auth-context";
import { Skeleton } from "@/components/ui/skeleton";

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  );
}

/** Blocks unauthenticated access — sends users to the portal's own login page. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) {
    const loginPath = location.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** Restricts a subtree to a single role. Wrong-role users go to their own home. */
export function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) {
    const loginPath = location.pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return <Navigate to={loginPath} replace />;
  }
  if (user.role !== role) {
    return <Navigate to={authService.homePathFor(user.role)} replace />;
  }
  return <Outlet />;
}

/** Keeps signed-in users away from the login screen. */
export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to={authService.homePathFor(user.role)} replace />;
  return <>{children}</>;
}
