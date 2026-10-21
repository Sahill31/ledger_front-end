import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { dealershipService } from "@/services/dealership.service";
import { notificationService } from "@/services/notification.service";
import { useAuth } from "@/features/auth/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NotificationItem, NotificationType } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_DOT: Record<NotificationType, string> = {
  missing_bill: "bg-red-500",
  deadline_approaching: "bg-amber-500",
  overdue: "bg-red-500",
  submitted: "bg-blue-500",
  review_request: "bg-blue-500",
  approved: "bg-emerald-500",
  rejected: "bg-red-500",
  resubmitted: "bg-violet-500",
  correction_requested: "bg-amber-500",
  budget_alert: "bg-slate-400", // never emitted to the accountant audience
  system: "bg-slate-400",
};

const TYPE_OPTIONS: { value: NotificationType | "all"; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "deadline_approaching", label: "Deadline approaching" },
  { value: "overdue", label: "Overdue" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "resubmitted", label: "Resubmitted" },
  { value: "correction_requested", label: "Correction requested" },
  { value: "submitted", label: "Submitted" },
  { value: "system", label: "System" },
];

export default function AccountantNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");

  const notifications = useAsyncData(
    () => (user ? notificationService.listFor(user) : Promise.resolve([])),
    [user]
  );
  const dealerships = useAsyncData(
    () => (user ? dealershipService.forAccountant(user.id) : Promise.resolve([])),
    [user]
  );

  const all = notifications.data ?? [];
  const unread = all.filter((n) => !n.read).length;

  const items = all.filter((n) => {
    if (tab === "unread" && n.read) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  const dealershipName = (id?: string) =>
    id ? dealerships.data?.find((d) => d.id === id)?.name : undefined;

  const markAllRead = async () => {
    if (!user) return;
    try {
      await notificationService.markAllRead(user);
      notifications.reload();
      toast.success("All notifications marked as read.");
    } catch {
      toast.error("Could not mark notifications as read.");
    }
  };

  const open = async (n: NotificationItem) => {
    if (!n.read) {
      await notificationService.markRead(n.id);
      notifications.reload();
    }
    if (n.link) navigate(n.link);
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Deadline reminders and review updates for your bill submissions."
        actions={
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">
              Unread{unread > 0 ? ` (${unread})` : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as NotificationType | "all")}
        >
          <SelectTrigger className="h-9 w-[190px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="divide-y rounded-xl border bg-white shadow-sm">
        {notifications.loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-4">
              <Skeleton className="mt-1.5 h-2.5 w-2.5 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <EmptyState
            icon={<BellOff className="h-5 w-5" />}
            title="No notifications"
            description={
              tab === "unread"
                ? "You're all caught up — nothing unread."
                : "Nothing matches the current filters."
            }
          />
        ) : (
          items.map((n) => {
            const dealer = dealershipName(n.dealershipId);
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => void open(n)}
                className={cn(
                  "flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40",
                  !n.read && "bg-blue-50/50"
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    TYPE_DOT[n.type]
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p
                      className={cn(
                        "truncate text-sm",
                        n.read ? "font-medium text-foreground" : "font-semibold text-foreground"
                      )}
                    >
                      {n.title}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                  {dealer && (
                    <p className="mt-1 text-xs font-medium text-muted-foreground">{dealer}</p>
                  )}
                </div>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
