import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AccountantLayout } from "@/components/layout/accountant-layout";
import { RedirectIfAuthed, RequireAuth, RequireRole } from "@/features/auth/route-guards";
import { useAuth } from "@/features/auth/auth-context";
import { authService } from "@/services/auth.service";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const LoginPage = lazy(() => import("@/features/auth/login-page"));

const AdminDashboardPage = lazy(() => import("@/features/admin/dashboard/dashboard-page"));
const AdminBillsPage = lazy(() => import("@/features/admin/bills/admin-bills-page"));
const AdminSchedulesPage = lazy(() => import("@/features/admin/schedules/schedules-page"));
const AdminBudgetsPage = lazy(() => import("@/features/admin/budgets/budgets-page"));
const AdminAnalyticsPage = lazy(() => import("@/features/admin/analytics/analytics-page"));
const AdminDealershipsPage = lazy(() => import("@/features/admin/dealerships/dealerships-page"));
const AdminAccountsPage = lazy(() => import("@/features/admin/accounts/accounts-page"));
const AdminCategoriesPage = lazy(() => import("@/features/admin/categories/categories-page"));
const AdminNotificationsPage = lazy(() => import("@/features/admin/notifications/notifications-page"));
const AdminSettingsPage = lazy(() => import("@/features/admin/settings/settings-page"));

const AccountantDashboardPage = lazy(() => import("@/features/accountant/dashboard/accountant-dashboard-page"));
const AccountantTasksPage = lazy(() => import("@/features/accountant/tasks/tasks-page"));
const AccountantBillsPage = lazy(() => import("@/features/accountant/bills/accountant-bills-page"));
const NewBillPage = lazy(() => import("@/features/accountant/bills/new-bill-page"));
const AccountantNotificationsPage = lazy(() => import("@/features/accountant/notifications/accountant-notifications-page"));
const AccountantProfilePage = lazy(() => import("@/features/accountant/profile/profile-page"));

function PageLoader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="text-4xl font-semibold text-slate-300">404</p>
      <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/">Back to home</Link>
      </Button>
    </div>
  );
}

/**
 * `/` is the application entry point:
 * - authenticated accountants → /accountant/dashboard
 * - authenticated admins → /admin/dashboard
 * - unauthenticated → accountant sign-in at /login
 */
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    );
  }
  if (user) return <Navigate to={authService.homePathFor(user.role)} replace />;
  return <Navigate to="/login" replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="p-8"><PageLoader /></div>}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          {/* Accountant sign-in — the primary/public entry point */}
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          {/* Admin sign-in — separate portal entry, same form, admin-branded */}
          <Route
            path="/admin/login"
            element={
              <RedirectIfAuthed>
                <LoginPage admin />
              </RedirectIfAuthed>
            }
          />

          <Route element={<RequireAuth />}>
            {/* ── Admin portal ─────────────────────────────────────────── */}
            <Route element={<RequireRole role="admin" />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="dealerships" element={<AdminDealershipsPage />} />
                <Route path="accountants" element={<AdminAccountsPage />} />
                <Route path="categories" element={<AdminCategoriesPage />} />
                <Route path="budgets" element={<AdminBudgetsPage />} />
                <Route path="schedules" element={<AdminSchedulesPage />} />
                <Route path="bills" element={<AdminBillsPage />} />
                <Route path="reports" element={<AdminAnalyticsPage />} />
                <Route path="notifications" element={<AdminNotificationsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                {/* Legacy paths */}
                <Route path="analytics" element={<Navigate to="/admin/reports" replace />} />
                <Route path="accounts" element={<Navigate to="/admin/accountants" replace />} />
              </Route>
            </Route>

            {/* ── Accountant portal (primary) ──────────────────────────── */}
            <Route element={<RequireRole role="accountant" />}>
              <Route path="/accountant" element={<AccountantLayout />}>
                <Route index element={<Navigate to="/accountant/dashboard" replace />} />
                <Route path="dashboard" element={<AccountantDashboardPage />} />
                <Route path="tasks" element={<AccountantTasksPage />} />
                <Route path="upload-bill" element={<NewBillPage />} />
                <Route path="submissions" element={<AccountantBillsPage />} />
                <Route path="notifications" element={<AccountantNotificationsPage />} />
                <Route path="profile" element={<AccountantProfilePage />} />
                {/* Legacy paths */}
                <Route path="bills" element={<Navigate to="/accountant/submissions" replace />} />
                <Route path="bills/new" element={<Navigate to="/accountant/upload-bill" replace />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
