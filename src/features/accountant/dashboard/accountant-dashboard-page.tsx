import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  FileX,
  Timer,
  XCircle,
} from "lucide-react";
import { analyticsService } from "@/services/analytics.service";
import { billService } from "@/services/bill.service";
import { dealershipService } from "@/services/dealership.service";
import { scheduleService } from "@/services/schedule.service";
import { useAuth } from "@/features/auth/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ScheduleStatusBadge, ReviewStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AccountantDashboardPage() {
  const { user } = useAuth();

  // accountantSummary returns task/review counts only — no budget or expenditure data.
  const summary = useAsyncData(
    () => (user ? analyticsService.accountantSummary(user) : Promise.resolve(null)),
    [user]
  );
  const dealerships = useAsyncData(
    () => (user ? dealershipService.forAccountant(user.id) : Promise.resolve([])),
    [user]
  );
  const deadlines = useAsyncData(
    () =>
      user
        ? scheduleService.forAccountant(user.id, { dueWithinDays: 14 })
        : Promise.resolve([]),
    [user]
  );
  const recentBills = useAsyncData(
    () => (user ? billService.forAccountant(user) : Promise.resolve([])),
    [user]
  );

  const s = summary.data;
  const assigned = dealerships.data ?? [];
  const upcoming = (deadlines.data ?? []).filter((t) => t.status !== "submitted").slice(0, 6);
  const recent = (recentBills.data ?? []).slice(0, 6);

  return (
    <div className="space-y-5">
      <PageHeader
        title="My dashboard"
        description="Deadlines, submissions and review activity across your assigned dealerships."
      />

      {/* Overdue callout */}
      {s && s.overdue > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              You have <span className="font-semibold">{s.overdue}</span> overdue bill
              submission{s.overdue === 1 ? "" : "s"}.
            </span>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-red-200 bg-white text-red-700 hover:bg-red-100 hover:text-red-800"
          >
            <Link to="/accountant/tasks">
              View tasks <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Bills due soon"
          value={s?.dueSoon ?? 0}
          icon={<Timer className="h-4 w-4" />}
          hint="Deadline within 7 days"
          tone="warning"
          loading={summary.loading}
        />
        <StatCard
          label="Overdue"
          value={s?.overdue ?? 0}
          icon={<FileX className="h-4 w-4" />}
          hint="Past submission deadline"
          tone="danger"
          loading={summary.loading}
        />
        <StatCard
          label="Awaiting submission"
          value={s?.awaitingSubmission ?? 0}
          icon={<ClipboardList className="h-4 w-4" />}
          hint="Scheduled bills not yet submitted"
          loading={summary.loading}
        />
        <StatCard
          label="Awaiting review"
          value={s?.awaitingReview ?? 0}
          icon={<FileSearch className="h-4 w-4" />}
          hint="Submitted or resubmitted bills"
          loading={summary.loading}
        />
        <StatCard
          label="Approved"
          value={s?.approved ?? 0}
          icon={<CheckCircle2 className="h-4 w-4" />}
          hint="Bills approved by admin"
          tone="success"
          loading={summary.loading}
        />
        <StatCard
          label="Rejected"
          value={s?.rejected ?? 0}
          icon={<XCircle className="h-4 w-4" />}
          hint="Need correction and resubmission"
          tone="danger"
          loading={summary.loading}
        />
      </div>

      {/* Assigned dealerships strip */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned dealerships</CardTitle>
          <CardDescription>You submit utility bills for these locations</CardDescription>
        </CardHeader>
        <CardContent>
          {dealerships.loading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-44" />
              ))}
            </div>
          ) : assigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No dealerships are assigned to your account yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assigned.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2.5 rounded-lg border bg-white px-3 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.code}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-column row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Upcoming deadlines */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Upcoming deadlines</CardTitle>
              <CardDescription>Next 14 days</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/accountant/tasks">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlines.loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)
            ) : upcoming.length === 0 ? (
              <EmptyState
                compact
                title="No upcoming deadlines"
                description="Nothing is due in the next two weeks."
              />
            ) : (
              upcoming.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.categoryName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.dealershipName} · due {formatDate(t.submissionDeadline)}
                    </p>
                  </div>
                  <ScheduleStatusBadge status={t.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Your latest bill submissions</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/accountant/submissions">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBills.loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)
            ) : recent.length === 0 ? (
              <EmptyState
                compact
                title="No submissions yet"
                description="Bills you submit will appear here."
              />
            ) : (
              recent.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {b.categoryName} · {formatCurrency(b.amount)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.dealershipName} · {formatDate(b.submittedAt)}
                    </p>
                  </div>
                  <ReviewStatusBadge status={b.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
