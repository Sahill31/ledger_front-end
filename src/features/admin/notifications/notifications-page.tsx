import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { notificationService } from "@/services/notification.service";
import { dealershipService } from "@/services/dealership.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { useAuth } from "@/features/auth/auth-context";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationType } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_DOT: Record<NotificationType, string> = {
  missing_bill: "bg-red-500",
  overdue: "bg-red-500",
  rejected: "bg-red-500",
  deadline_approaching: "bg-amber-500",
  budget_alert: "bg-amber-500",
  submitted: "bg-blue-500",
  review_request: "bg-blue-500",
  approved: "bg-emerald-500",
  resubmitted: "bg-violet-500",
  correction_requested: "bg-amber-500",
  system: "bg-slate-400",
};

const TYPE_LABEL: Record<NotificationType, string> = {
  missing_bill: "Missing bill",
  deadline_approaching: "Deadline approaching",
  overdue: "Overdue",
  review_request: "Review request",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  resubmitted: "Resubmitted",
  correction_requested: "Correction requested",
  budget_alert: "Budget alert",
  system: "System",
};

const TYPE_OPTIONS = Object.keys(TYPE_LABEL) as NotificationType[];

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = React.useState<"all" | NotificationType>("all");
  const [markingAll, setMarkingAll] = React.useState(false);

  const notifications = useAsyncData(
    () =>
      user
        ? notificationService.listFor(user)
        : Promise.resolve([] as NotificationItem[]),
    [user]
  );
  const dealerships = useAsyncData(() => dealershipService.list(), []);

  if (!user) return null;

  const items = notifications.data ?? [];
  const unreadCount = items.filter((n) => !n.read).length;
  const dealershipName = (id?: string) =>
    id ? dealerships.data?.find((d) => d.id === id)?.name : undefined;

  const filtered = items.filter(
    (n) =>
      (tab === "all" || !n.read) &&
      (typeFilter === "all" || n.type === typeFilter)
  );

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllRead(user);
      notifications.reload();
      toast.success("All notifications marked as read.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  const openItem = async (n: NotificationItem) => {
    if (!n.read) {
      try {
        await notificationService.markRead(n.id);
      } catch {
        // Non-fatal — the row is still navigable.
      }
    }
    if (n.link) navigate(n.link);
    notifications.reload();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notifications"
        description="Submission, deadline and review activity across all dealerships."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={markAll}
            disabled={markingAll || unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="w-full sm:w-56">
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as "all" | NotificationType)}
          >
            <SelectTrigger aria-label="Filter by type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {notifications.loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BellOff className="h-5 w-5" />}
          title={tab === "unread" ? "No unread notifications" : "No notifications"}
          description={
            typeFilter === "all"
              ? "You're all caught up. New activity will appear here."
              : `No ${TYPE_LABEL[typeFilter as NotificationType].toLowerCase()} notifications right now.`
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {filtered.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => openItem(n)}
              className={cn(
                "flex w-full items-start gap-3 border-b px-5 py-4 text-left transition-colors last:border-0 hover:bg-slate-50",
                !n.read && "bg-blue-50/50"
              )}
            >
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  TYPE_DOT[n.type] ?? "bg-slate-400"
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span
                    className={cn(
                      "text-sm",
                      !n.read ? "font-semibold text-foreground" : "font-medium text-foreground"
                    )}
                  >
                    {n.title}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    {TYPE_LABEL[n.type]}
                  </span>
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{n.message}</span>
                <span className="mt-1 block text-xs text-slate-400">
                  {timeAgo(n.createdAt)}
                  {dealershipName(n.dealershipId) && (
                    <> · {dealershipName(n.dealershipId)}</>
                  )}
                </span>
              </span>
              {!n.read && (
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
