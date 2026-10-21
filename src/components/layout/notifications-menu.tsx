import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { notificationService } from "@/services/notification.service";
import { timeAgo } from "@/lib/format";
import type { NotificationItem, SessionUser } from "@/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TYPE_DOT: Record<string, string> = {
  missing_bill: "bg-red-500",
  overdue: "bg-red-500",
  deadline_approaching: "bg-amber-500",
  submitted: "bg-blue-500",
  review_request: "bg-blue-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  resubmitted: "bg-violet-500",
  correction_requested: "bg-amber-500",
  budget_alert: "bg-amber-500",
  system: "bg-slate-400",
};

export function NotificationsMenu({ user, allPath }: { user: SessionUser; allPath: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<NotificationItem[]>([]);

  const load = React.useCallback(() => {
    notificationService.listFor(user).then(setItems).catch(() => undefined);
  }, [user]);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const unread = items.filter((n) => !n.read).length;

  const openItem = async (n: NotificationItem) => {
    await notificationService.markRead(n.id);
    setOpen(false);
    load();
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await notificationService.markAllRead(user);
    load();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              onClick={markAll}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">You're all caught up.</p>
          ) : (
            items.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => openItem(n)}
                className={cn(
                  "flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-slate-50",
                  !n.read && "bg-blue-50/50"
                )}
              >
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TYPE_DOT[n.type] ?? "bg-slate-400")} />
                <span className="min-w-0">
                  <span className={cn("block truncate text-sm", !n.read ? "font-semibold" : "font-medium")}>
                    {n.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.message}</span>
                  <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}
        </div>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              setOpen(false);
              navigate(allPath);
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
