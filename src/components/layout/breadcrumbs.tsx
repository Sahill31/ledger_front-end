import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { Fragment } from "react";

const LABELS: Record<string, string> = {
  admin: "Admin",
  accountant: "Accountant",
  dashboard: "Dashboard",
  dealerships: "Dealerships",
  accounts: "Accounts",
  categories: "Categories",
  budgets: "Budgets",
  schedules: "Schedules",
  bills: "Bills",
  new: "Submit bill",
  analytics: "Analytics",
  notifications: "Notifications",
  settings: "Settings",
  tasks: "Tasks",
  profile: "Profile",
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link to={`/${segments[0]}/dashboard`} className="flex items-center hover:text-foreground" aria-label="Home">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {segments.slice(1).map((seg, i) => {
        const path = "/" + segments.slice(0, i + 2).join("/");
        const isLast = i === segments.length - 2;
        const label = LABELS[seg] ?? seg;
        return (
          <Fragment key={path}>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground">
                {label}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
