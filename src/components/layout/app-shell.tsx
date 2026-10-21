import * as React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Building2, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Breadcrumbs } from "./breadcrumbs";
import { NotificationsMenu } from "./notifications-menu";
import { UserMenu } from "./user-menu";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
}

interface AppShellProps {
  user: SessionUser;
  navItems: NavItem[];
  /** dark = admin (navy sidebar), light = accountant */
  variant: "dark" | "light";
  profilePath: string;
  notificationsPath: string;
  brandCaption: string;
}

export function AppShell({ user, navItems, variant, profilePath, notificationsPath, brandCaption }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const dark = variant === "dark";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-14 items-center gap-2.5 border-b px-4", dark ? "border-white/10" : "border-border")}>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white", dark ? "bg-blue-600" : "bg-primary")}>
          <Building2 className="h-[18px] w-[18px]" />
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className={cn("block truncate text-sm font-semibold", dark ? "text-white" : "text-foreground")}>
              AutoLedger
            </span>
            <span className={cn("block text-[11px]", dark ? "text-slate-400" : "text-muted-foreground")}>
              {brandCaption}
            </span>
          </span>
        )}
        <button
          className={cn("ml-auto lg:hidden", dark ? "text-slate-300" : "text-muted-foreground")}
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2.5 py-3 scrollbar-thin" aria-label="Main navigation">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
            const link = (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    dark
                      ? isActive
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                      : isActive
                        ? "bg-primary/10 text-primary"
                        : "text-slate-600 hover:bg-slate-100 hover:text-foreground",
                    collapsed && "justify-center px-0"
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
            if (!collapsed) return <React.Fragment key={item.to}>{link}</React.Fragment>;
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </nav>

      <div className={cn("border-t p-2.5", dark ? "border-white/10" : "border-border")}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "hidden w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium lg:flex",
            dark ? "text-slate-300 hover:bg-white/10" : "text-slate-600 hover:bg-slate-100",
            collapsed && "justify-center px-0"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r transition-[width] duration-200 lg:block",
          collapsed ? "w-[68px]" : "w-60",
          dark ? "border-transparent bg-slate-900" : "border-border bg-white"
        )}
      >
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setMobileOpen(false)} />
          <aside className={cn("absolute inset-y-0 left-0 w-64 shadow-xl", dark ? "bg-slate-900" : "bg-white")}>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={cn("flex min-w-0 flex-1 flex-col transition-[margin] duration-200", collapsed ? "lg:ml-[68px]" : "lg:ml-60")}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-white px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationsMenu user={user} allPath={notificationsPath} />
            <UserMenu user={user} profilePath={profilePath} />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
