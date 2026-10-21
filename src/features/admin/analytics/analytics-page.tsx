import * as React from "react";
import { useNavigate } from "react-router-dom";
import { analyticsService, type ReportBillRow, type ReportStatus } from "@/services/analytics.service";
import { dealershipService } from "@/services/dealership.service";
import { categoryService } from "@/services/category.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatCurrency, formatDate, monthLabel, monthShort } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { ReviewStatusBadge } from "@/components/shared/status-badge";
import { MonthlyExpenditureChart } from "@/components/charts/monthly-expenditure-chart";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { DealershipComparisonChart } from "@/components/charts/dealership-comparison-chart";
import { StatusTrendChart } from "@/components/charts/status-trend-chart";
import { BudgetVsActualChart } from "@/components/charts/budget-vs-actual-chart";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  Submitted: "bg-blue-500",
  "Under review": "bg-amber-500",
  Approved: "bg-emerald-500",
  Rejected: "bg-red-500",
  Resubmitted: "bg-violet-500",
  "Correction requested": "bg-amber-500",
};

const MONTH_OPTIONS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REVIEW_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "APPROVED", label: "Approved" },
  { value: "CORRECTION_REQUESTED", label: "Correction requested" },
  { value: "REJECTED", label: "Rejected" },
];

const REPORT_STATUS_LABEL: Record<string, string> = {
  within_budget: "Within budget",
  exceeded: "Exceeded",
  no_budget: "No budget",
  zero_budget: "Zero budget",
  no_expenditure: "No expenditure",
  pending_only: "Pending review",
};

function reportStatusBadge(status: ReportStatus | string) {
  const variant =
    status === "within_budget"
      ? "success"
      : status === "exceeded"
        ? "destructive"
        : status === "pending_only"
          ? "warning"
          : "outline";
  return <Badge variant={variant as never}>{REPORT_STATUS_LABEL[status] ?? status}</Badge>;
}

function budgetStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: string }> = {
    WITHIN_BUDGET: { label: "Within budget", variant: "success" },
    OVER_BUDGET: { label: "Over budget", variant: "destructive" },
    NO_BUDGET: { label: "No budget", variant: "outline" },
    within_budget: { label: "Within budget", variant: "success" },
    exceeded: { label: "Exceeded", variant: "destructive" },
    no_budget: { label: "No budget", variant: "outline" },
    zero_budget: { label: "Zero budget", variant: "outline" },
    no_expenditure: { label: "No spend", variant: "outline" },
    pending_only: { label: "Pending", variant: "warning" },
  };
  const cfg = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={cfg.variant as never}>{cfg.label}</Badge>;
}

function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger" | "warn";
}) {
  const tones = {
    default: "text-slate-900",
    success: "text-emerald-700",
    danger: "text-red-700",
    warn: "text-amber-700",
  };
  return (
    <div className="rounded-lg border bg-white p-3.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-xl font-semibold tabular-nums", tones[tone])}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [yearFilter, setYearFilter] = React.useState<string>(String(currentYear));
  const [dealershipId, setDealershipId] = React.useState("all");
  const [categoryId, setCategoryId] = React.useState("all");
  const [reportMonth, setReportMonth] = React.useState(String(currentMonth));
  const [reviewStatus, setReviewStatus] = React.useState("all");
  const [comparePrevious, setComparePrevious] = React.useState(false);

  const selectedYear = yearFilter === "all" ? undefined : Number(yearFilter);
  const chartYear = selectedYear ?? currentYear;
  const reportYear = chartYear;

  const dealerships = useAsyncData(() => dealershipService.list(), []);
  const categories = useAsyncData(() => categoryService.list(), []);

  const report = useAsyncData(
    () =>
      analyticsService.expenditureReport({
        month: Number(reportMonth),
        year: reportYear,
        dealershipId,
        categoryId,
        reviewStatus,
        comparePrevious,
        pageSize: 50,
      }),
    [reportMonth, reportYear, dealershipId, categoryId, reviewStatus, comparePrevious]
  );

  const breakdown = useAsyncData(
    () => analyticsService.reviewStatusBreakdown({ dealershipId, categoryId }),
    [dealershipId, categoryId]
  );
  const byCategory = useAsyncData(
    () => analyticsService.expenditureByCategory({ year: selectedYear, dealershipId, categoryId }),
    [selectedYear, dealershipId, categoryId]
  );
  const byDealership = useAsyncData(
    () => analyticsService.expenditureByDealership({ year: selectedYear, dealershipId, categoryId }),
    [selectedYear, dealershipId, categoryId]
  );
  const trend = useAsyncData(
    () => analyticsService.statusTrend(6, dealershipId),
    [dealershipId]
  );

  const summary = report.data?.summary;
  const scopeLabel = React.useMemo(() => {
    const d = dealershipId === "all" ? "All dealerships" : dealerships.data?.find((x) => x.id === dealershipId)?.name;
    const c = categoryId === "all" ? "All categories" : categories.data?.find((x) => x.id === categoryId)?.name;
    return `${d ?? "…"} · ${c ?? "…"}`;
  }, [dealershipId, categoryId, dealerships.data, categories.data]);

  // Chart data: per-pair budget vs actual. Label adapts to the active filter.
  const comparisonChartData = React.useMemo(() => {
    return (report.data?.comparisons ?? [])
      .filter((c) => (c.budget ?? 0) > 0 || c.actual > 0)
      .slice(0, 12)
      .map((c) => ({
        name:
          dealershipId !== "all" && categoryId !== "all"
            ? c.categoryName
            : dealershipId !== "all"
              ? c.categoryName
              : categoryId !== "all"
                ? c.dealershipName
                : c.categoryName,
        budget: c.budget ?? 0,
        actual: c.actual,
      }));
  }, [report.data, dealershipId, categoryId]);

  const overBudgetRows = (report.data?.comparisons ?? []).filter((c) => c.status === "exceeded");
  const breakdownTotal = (breakdown.data ?? []).reduce((s, item) => s + item.value, 0);

  const BILL_COLUMNS: DataTableColumn<ReportBillRow>[] = [
    {
      key: "reference",
      header: "Bill",
      cell: (b) => (
        <div className="min-w-0">
          <p className="font-medium tabular-nums">{b.billReference}</p>
          <p className="text-xs text-muted-foreground">{b.submittedByName}</p>
        </div>
      ),
      sortValue: (b) => b.billReference,
    },
    {
      key: "dealership",
      header: "Dealership",
      cell: (b) => (
        <div className="min-w-0">
          <p className="font-medium">{b.dealershipName}</p>
          <p className="text-xs text-muted-foreground">{b.dealershipCode}</p>
        </div>
      ),
      sortValue: (b) => b.dealershipName,
    },
    { key: "category", header: "Category", cell: (b) => b.categoryName, sortValue: (b) => b.categoryName },
    {
      key: "period",
      header: "Period",
      cell: (b) => monthShort(b.billingPeriod.month, b.billingPeriod.year),
      sortValue: (b) => b.billingPeriod.year * 100 + b.billingPeriod.month,
    },
    {
      key: "billDate",
      header: "Bill date",
      cell: (b) => <span className="text-muted-foreground">{formatDate(b.billingDate)}</span>,
      sortValue: (b) => b.billingDate,
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (b) => <span className="text-muted-foreground">{formatDate(b.submittedAt)}</span>,
      sortValue: (b) => b.submittedAt,
    },
    {
      key: "expenditure",
      header: "Expenditure",
      cell: (b) => <span className="font-medium tabular-nums">{formatCurrency(b.expenditureAmount)}</span>,
      sortValue: (b) => b.expenditureAmount,
      className: "text-right",
    },
    {
      key: "payable",
      header: "Total payable",
      cell: (b) => (
        <span className={cn("tabular-nums", b.totalPayable !== b.expenditureAmount && "text-amber-700")}>
          {formatCurrency(b.totalPayable)}
        </span>
      ),
      sortValue: (b) => b.totalPayable,
      className: "text-right",
    },
    {
      key: "status",
      header: "Review",
      cell: (b) => <ReviewStatusBadge status={b.status.toLowerCase() as never} />,
    },
    {
      key: "budget",
      header: "Budget",
      cell: (b) => budgetStatusBadge(b.budgetStatus),
    },
    {
      key: "task",
      header: "Task",
      cell: (b) =>
        b.scheduleId ? (
          <Badge variant="info">Task</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Budget vs actual expenditure, submission reliability and bill drill-down."
      />

      {/* Filter bar */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:flex-wrap">
          <div className="w-full space-y-1.5 sm:w-44">
            <Label htmlFor="report-year">Year</Label>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger id="report-year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={String(currentYear - 1)}>{currentYear - 1}</SelectItem>
                <SelectItem value={String(currentYear)}>{currentYear}</SelectItem>
                <SelectItem value={String(currentYear + 1)}>{currentYear + 1}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full space-y-1.5 sm:w-56">
            <Label htmlFor="analytics-dealership">Dealership</Label>
            <Select value={dealershipId} onValueChange={setDealershipId}>
              <SelectTrigger id="analytics-dealership">
                <SelectValue placeholder="All dealerships" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dealerships</SelectItem>
                {(dealerships.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full space-y-1.5 sm:w-56">
            <Label htmlFor="analytics-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="analytics-category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(categories.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full space-y-1.5 sm:w-44">
            <Label htmlFor="report-month">Billing month</Label>
            <Select value={reportMonth} onValueChange={setReportMonth}>
              <SelectTrigger id="report-month">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((label, i) => (
                  <SelectItem key={label} value={String(i + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pb-1">
            <Switch id="compare-prev" checked={comparePrevious} onCheckedChange={setComparePrevious} />
            <Label htmlFor="compare-prev" className="text-sm font-normal">
              Compare previous month
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* ── Budget vs actual report ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Budget vs. actual — {monthLabel(Number(reportMonth), reportYear)}</CardTitle>
          <CardDescription>
            {scopeLabel} · expenditure uses current-period charges where extracted, otherwise the
            bill's total payable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {report.loading ? (
            <Skeleton className="h-[300px]" />
          ) : !summary ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Could not load the report.</p>
          ) : (
            <>
              {/* Status banner */}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm",
                  summary.status === "within_budget" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-800",
                  summary.status === "exceeded" && "border-red-200 bg-red-50 text-red-800",
                  (summary.status === "pending_only" || summary.status === "no_expenditure") &&
                    "border-amber-200 bg-amber-50 text-amber-800",
                  (summary.status === "no_budget" || summary.status === "zero_budget") &&
                    "border-slate-200 bg-slate-50 text-slate-700"
                )}
              >
                {summary.status === "within_budget" && (
                  <>
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Approved expenditure is within the configured budget for this period.
                  </>
                )}
                {summary.status === "exceeded" && (
                  <>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Budget exceeded by {formatCurrency(summary.exceededAmount ?? 0)}.
                  </>
                )}
                {summary.status === "pending_only" && (
                  <>
                    <Clock className="h-4 w-4 shrink-0" />
                    No approved bills yet — {summary.pendingReview.count + summary.correctionRequested.count} bill(s) still
                    pending review.
                  </>
                )}
                {summary.status === "no_expenditure" && (
                  <>
                    <FileWarning className="h-4 w-4 shrink-0" />
                    No approved expenditure recorded for this period.
                  </>
                )}
                {(summary.status === "no_budget" || summary.status === "zero_budget") && (
                  <>
                    <FileWarning className="h-4 w-4 shrink-0" />
                    No budget is configured for this scope and period — comparison unavailable.
                  </>
                )}
                {report.data?.previousPeriod && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    vs {monthLabel(report.data.previousPeriod.month, report.data.previousPeriod.year)}:{" "}
                    {formatCurrency(report.data.previousPeriod.actualExpenditure)} actual
                    {report.data.previousPeriod.budget !== null &&
                      ` / ${formatCurrency(report.data.previousPeriod.budget)} budget`}
                  </span>
                )}
              </div>

              {/* Stat cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatCard
                  label="Configured budget"
                  value={summary.budget !== null ? formatCurrency(summary.budget) : "—"}
                  hint={summary.budget === null ? "No budget" : `${summary.totalBillCount} bill(s)`}
                />
                <StatCard
                  label="Approved expenditure"
                  value={formatCurrency(summary.actualExpenditure)}
                  hint={`${summary.approvedBillCount} approved bill(s)`}
                />
                {summary.exceededAmount !== null ? (
                  <StatCard
                    label="Amount exceeded"
                    value={formatCurrency(summary.exceededAmount)}
                    tone="danger"
                    hint="Above configured budget"
                  />
                ) : (
                  <StatCard
                    label="Remaining budget"
                    value={summary.remainingBudget !== null ? formatCurrency(summary.remainingBudget) : "—"}
                    tone={summary.remainingBudget !== null ? "success" : "default"}
                  />
                )}
                <StatCard
                  label="Utilization"
                  value={summary.utilizationPercentage !== null ? `${summary.utilizationPercentage}%` : "—"}
                  tone={
                    (summary.utilizationPercentage ?? 0) > 100
                      ? "danger"
                      : summary.utilizationPercentage !== null
                        ? "success"
                        : "default"
                  }
                />
                <StatCard
                  label="Pending review"
                  value={formatCurrency(summary.pendingReview.amount)}
                  hint={`${summary.pendingReview.count} bill(s)`}
                  tone={summary.pendingReview.count > 0 ? "warn" : "default"}
                />
                <StatCard
                  label="Rejected"
                  value={formatCurrency(summary.rejected.amount)}
                  hint={`${summary.rejected.count} bill(s)`}
                />
              </div>

              <BudgetVsActualChart data={comparisonChartData} />

              {/* Per-pair comparison table */}
              {(report.data?.comparisons ?? []).length > 0 && (
                <div className="space-y-2">
                  {overBudgetRows.length > 0 && (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      {overBudgetRows.length} dealership/category combination
                      {overBudgetRows.length === 1 ? "" : "s"} over budget
                    </p>
                  )}
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <th className="px-4 py-2.5">Dealership</th>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5 text-right">Budget</th>
                          <th className="px-4 py-2.5 text-right">Actual</th>
                          <th className="px-4 py-2.5 text-right">Remaining / Exceeded</th>
                          <th className="px-4 py-2.5 text-right">Utilization</th>
                          <th className="px-4 py-2.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(report.data?.comparisons ?? []).map((c) => (
                          <tr key={`${c.dealershipId}:${c.categoryId}`} className="border-b last:border-0">
                            <td className="px-4 py-2.5 font-medium">{c.dealershipName}</td>
                            <td className="px-4 py-2.5">{c.categoryName}</td>
                            <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                              {c.budget !== null ? formatCurrency(c.budget) : "—"}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-2.5 text-right font-medium tabular-nums",
                                c.status === "exceeded" && "text-red-700"
                              )}
                            >
                              {formatCurrency(c.actual)}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {c.exceeded !== null ? (
                                <span className="text-red-700">+{formatCurrency(c.exceeded)}</span>
                              ) : c.remaining !== null ? (
                                <span className="text-emerald-700">{formatCurrency(c.remaining)}</span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right tabular-nums">
                              {c.utilization !== null ? `${c.utilization}%` : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right">{reportStatusBadge(c.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Monthly trend + review status */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly expenditure vs budget</CardTitle>
            <CardDescription>
              Approved + pending spend per billing period, {reportYear} · {scopeLabel}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {report.loading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <MonthlyExpenditureChart data={report.data?.trend ?? []} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Review status</CardTitle>
            <CardDescription>Bill count by review outcome</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdown.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6" />
                ))}
              </div>
            ) : (breakdown.data ?? []).length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No bills match the current filters.
              </p>
            ) : (
              <div className="space-y-1">
                {(breakdown.data ?? []).map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-2 text-sm">
                      <span
                        className={`h-2 w-2 rounded-full ${STATUS_DOT[item.name] ?? "bg-slate-400"}`}
                      />
                      {item.name}
                    </span>
                    <span className="text-sm font-medium tabular-nums">{item.value}</span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between border-t px-2 pt-3 text-sm">
                  <span className="text-muted-foreground">Total bills</span>
                  <span className="font-semibold tabular-nums">{breakdownTotal}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category + dealership breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Expenditure by category</CardTitle>
            <CardDescription>{selectedYear ? `Billing year ${selectedYear}` : `Billing year ${chartYear}`}</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.loading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <CategoryBreakdownChart data={byCategory.data ?? []} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dealership comparison</CardTitle>
            <CardDescription>{selectedYear ? `Billing year ${selectedYear}` : `Billing year ${chartYear}`}</CardDescription>
          </CardHeader>
          <CardContent>
            {byDealership.loading ? (
              <Skeleton className="h-[280px]" />
            ) : (
              <DealershipComparisonChart data={byDealership.data ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission reliability */}
      <Card>
        <CardHeader>
          <CardTitle>Submission reliability</CardTitle>
          <CardDescription>Past 6 months · scheduled bills submitted vs. overdue or missing</CardDescription>
        </CardHeader>
        <CardContent>
          {trend.loading ? (
            <Skeleton className="h-[260px]" />
          ) : (
            <StatusTrendChart data={trend.data ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Bill drill-down */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Bill details — {monthLabel(Number(reportMonth), reportYear)}</CardTitle>
            <CardDescription>
              {summary ? `${summary.totalBillCount} bill(s) in scope` : "Bills for the selected period"} ·
              click a row to open the bill
            </CardDescription>
          </div>
          <Select value={reviewStatus} onValueChange={setReviewStatus}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {REVIEW_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <DataTable<ReportBillRow>
            columns={BILL_COLUMNS}
            data={report.data?.bills.items ?? []}
            loading={report.loading}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`/admin/bills?bill=${b.id}`)}
            searchFn={(b) => `${b.dealershipName} ${b.categoryName} ${b.billReference}`}
            searchPlaceholder="Search dealership, category, reference…"
            emptyTitle="No bills found"
            emptyDescription="No bill records match the current filters."
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
