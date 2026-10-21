import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  FileSearch,
  FileX,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { analyticsService } from "@/services/analytics.service";
import { billService } from "@/services/bill.service";
import { scheduleService } from "@/services/schedule.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatCurrency, formatDate, monthLabel } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { ScheduleStatusBadge, ReviewStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MonthlyExpenditureChart } from "@/components/charts/monthly-expenditure-chart";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { DealershipComparisonChart } from "@/components/charts/dealership-comparison-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const summary = useAsyncData(() => analyticsService.adminSummary(), []);
  const monthly = useAsyncData(() => analyticsService.expenditureByMonth(year), [year]);
  const byCategory = useAsyncData(
    () => analyticsService.expenditureByCategory({ year, month }),
    [year, month]
  );
  const byDealership = useAsyncData(
    () => analyticsService.expenditureByDealership({ year, month }),
    [year, month]
  );
  const deadlines = useAsyncData(
    () => scheduleService.list({ status: "all", dueWithinDays: 14 }),
    []
  );
  const recentBills = useAsyncData(() => billService.list(), []);
  const attention = useAsyncData(
    () => billService.list({ status: "submitted" }),
    []
  );

  const upcoming = (deadlines.data ?? []).filter((t) => t.status !== "submitted").slice(0, 6);
  const recent = (recentBills.data ?? []).slice(0, 6);
  const needsReview = (attention.data ?? []).slice(0, 5);
  const s = summary.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={`Organization-wide utility billing overview for ${monthLabel(month, year)}.`}
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Bills this month"
          value={s?.billsThisMonth ?? 0}
          icon={<ReceiptText className="h-4 w-4" />}
          hint="Submissions received"
          loading={summary.loading}
        />
        <StatCard
          label="Expenditure this month"
          value={formatCurrency(s?.spendThisMonth ?? 0)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          hint="Non-rejected bill totals"
          loading={summary.loading}
        />
        <StatCard
          label="Awaiting review"
          value={s?.awaitingReview ?? 0}
          icon={<FileSearch className="h-4 w-4" />}
          hint="Submitted or under review"
          loading={summary.loading}
        />
        <StatCard
          label="Overdue bills"
          value={(s?.overdueCount ?? 0) + (s?.missingCount ?? 0)}
          icon={<FileX className="h-4 w-4" />}
          hint={`${s?.missingCount ?? 0} missing · ${s?.overdueCount ?? 0} overdue`}
          tone="danger"
          loading={summary.loading}
        />
        <StatCard
          label="Budget exceptions"
          value={s?.budgetExceptions ?? 0}
          icon={<Wallet className="h-4 w-4" />}
          hint="Categories over budget this month"
          tone="warning"
          loading={summary.loading}
        />
        <Card>
          <CardContent className="flex h-full flex-col justify-center gap-2 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Submission completion
              </p>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </div>
            {summary.loading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                <p className="text-2xl font-semibold tracking-tight">{s?.completionRate ?? 0}%</p>
                <Progress value={s?.completionRate ?? 0} className="h-1.5" />
                <p className="text-xs text-muted-foreground">Of past-due scheduled bills submitted</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly expenditure</CardTitle>
            <CardDescription>Recorded bill totals per billing period, {year}</CardDescription>
          </CardHeader>
          <CardContent>
            {monthly.loading ? <Skeleton className="h-[280px]" /> : <MonthlyExpenditureChart data={monthly.data ?? []} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By utility category</CardTitle>
            <CardDescription>{monthLabel(month, year)}</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.loading ? <Skeleton className="h-[280px]" /> : <CategoryBreakdownChart data={byCategory.data ?? []} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Dealership comparison</CardTitle>
            <CardDescription>{monthLabel(month, year)}</CardDescription>
          </CardHeader>
          <CardContent>
            {byDealership.loading ? <Skeleton className="h-[180px]" /> : <DealershipComparisonChart data={byDealership.data ?? []} />}
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Upcoming deadlines</CardTitle>
              <CardDescription>Next 14 days</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/schedules">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {deadlines.loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)
            ) : upcoming.length === 0 ? (
              <EmptyState compact title="No upcoming deadlines" description="Nothing is due in the next two weeks." />
            ) : (
              upcoming.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.categoryName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.dealershipCode} · due {formatDate(t.submissionDeadline)}
                    </p>
                  </div>
                  <ScheduleStatusBadge status={t.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Bills requiring attention */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Requiring attention</CardTitle>
              <CardDescription>Newest unreviewed submissions</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/bills">
                Review <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {attention.loading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)
            ) : needsReview.length === 0 ? (
              <EmptyState
                compact
                icon={<AlertTriangle className="h-5 w-5" />}
                title="Queue is clear"
                description="No submissions are waiting for review."
              />
            ) : (
              needsReview.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {b.categoryName} · {formatCurrency(b.amount)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {b.dealershipName} · {b.submittedByName}
                    </p>
                  </div>
                  <ReviewStatusBadge status={b.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent submissions */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recent bill submissions</CardTitle>
            <CardDescription>Latest activity across all dealerships</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/bills">
              All bills <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">Dealership</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Submitted by</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBills.loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td colSpan={5} className="px-5 py-3">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  : recent.map((b) => (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-3 font-medium">{b.dealershipName}</td>
                        <td className="px-5 py-3 text-muted-foreground">{b.categoryName}</td>
                        <td className="px-5 py-3 text-muted-foreground">{b.submittedByName}</td>
                        <td className="px-5 py-3 font-medium tabular-nums">{formatCurrency(b.amount)}</td>
                        <td className="px-5 py-3">
                          <ReviewStatusBadge status={b.status} />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
