import { Navigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Tags,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { AppShell, type NavItem } from "./app-shell";

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Bills", to: "/admin/bills", icon: ReceiptText },
  { label: "Schedules", to: "/admin/schedules", icon: CalendarClock },
  { label: "Budgets", to: "/admin/budgets", icon: Wallet },
  { label: "Reports", to: "/admin/reports", icon: BarChart3 },
  { label: "Dealerships", to: "/admin/dealerships", icon: Building2 },
  { label: "Accountants", to: "/admin/accountants", icon: Users },
  { label: "Categories", to: "/admin/categories", icon: Tags },
  { label: "Notifications", to: "/admin/notifications", icon: Bell },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

export function AdminLayout() {
  const { user } = useAuth();
  if (!user || user.role !== "admin") return <Navigate to="/login" replace />;
  return (
    <AppShell
      user={user}
      navItems={NAV}
      variant="dark"
      brandCaption="Admin console"
      profilePath="/admin/settings"
      notificationsPath="/admin/notifications"
    />
  );
}
