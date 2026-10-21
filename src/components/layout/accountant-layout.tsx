import { Navigate } from "react-router-dom";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  PlusCircle,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { AppShell, type NavItem } from "./app-shell";

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/accountant/dashboard", icon: LayoutDashboard },
  { label: "My tasks", to: "/accountant/tasks", icon: ClipboardList },
  { label: "Upload bill", to: "/accountant/upload-bill", icon: PlusCircle },
  { label: "My submissions", to: "/accountant/submissions", icon: ReceiptText },
  { label: "Notifications", to: "/accountant/notifications", icon: Bell },
  { label: "Profile", to: "/accountant/profile", icon: UserRound },
];

export function AccountantLayout() {
  const { user } = useAuth();
  if (!user || user.role !== "accountant") return <Navigate to="/login" replace />;
  return (
    <AppShell
      user={user}
      navItems={NAV}
      variant="light"
      brandCaption="Accountant workspace"
      profilePath="/accountant/profile"
      notificationsPath="/accountant/notifications"
    />
  );
}
