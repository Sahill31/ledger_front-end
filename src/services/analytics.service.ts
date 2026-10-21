import { api, toQuery } from "./api";
import type { ReviewStatus, SessionUser } from "@/types";

/**
 * Analytics endpoints.
 *
 * `accountantSummary` is the ONLY method callable by accountants — it hits a
 * role-restricted endpoint returning workflow metrics only. Everything else
 * is admin-gated on the backend and must only be imported by admin pages.
 */

export interface AnalyticsFilters {
  dealershipId?: string;
  categoryId?: string;
  year?: number;
}

export interface MonthlyPoint {
  month: number;
  label: string;
  total: number;
  count: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface AdminSummary {
  billsThisMonth: number;
  spendThisMonth: number;
  awaitingReview: number;
  overdueCount: number;
  missingCount: number;
  budgetExceptions: number;
  completionRate: number;
  activeDealerships: number;
  activeAccountants: number;
}

export interface AccountantSummary {
  dueSoon: number;
  overdue: number;
  awaitingSubmission: number;
  awaitingReview: number;
  approved: number;
  rejected: number;
  assignedDealerships: number;
}

interface MonthlySpendingPoint extends MonthlyPoint {
  approved: number;
  pending: number;
}

interface SubmissionCompletion {
  trend: { label: string; submitted: number; overdueOrMissing: number }[];
  breakdown: NamedValue[];
}

// ---- Expenditure report (ADMIN only) --------------------------------------

export type ReportStatus =
  | "within_budget"
  | "exceeded"
  | "no_budget"
  | "zero_budget"
  | "no_expenditure"
  | "pending_only";

export interface ReportComparison {
  dealershipId: string;
  dealershipName: string;
  categoryId: string;
  categoryName: string;
  budget: number | null;
  actual: number;
  remaining: number | null;
  exceeded: number | null;
  utilization: number | null;
  status: ReportStatus;
}

export interface ReportBillRow {
  id: string;
  billReference: string;
  scheduleId: string | null;
  dealershipId: string;
  dealershipName: string;
  dealershipCode: string;
  categoryId: string;
  categoryName: string;
  billingPeriod: { month: number; year: number };
  billingDate: string;
  submittedAt: string;
  submittedByName: string;
  expenditureAmount: number;
  totalPayable: number;
  /** Uppercase backend enum — map with .toLowerCase() for badges. */
  status: ReviewStatus | string;
  budgetStatus: string;
}

export interface ExpenditureReport {
  filters: {
    dealershipId: string | null;
    categoryId: string | null;
    month: number;
    year: number;
    reviewStatus: string | null;
  };
  summary: {
    status: string;
    budget: number | null;
    actualExpenditure: number;
    approvedTotalPayable: number;
    approvedBillCount: number;
    remainingBudget: number | null;
    exceededAmount: number | null;
    utilizationPercentage: number | null;
    projectedExpenditure: number;
    pendingReview: { amount: number; count: number };
    correctionRequested: { amount: number; count: number };
    rejected: { amount: number; count: number };
    totalBillCount: number;
  };
  comparisons: ReportComparison[];
  trend: { month: number; label: string; budget: number | null; actual: number; pending: number }[];
  previousPeriod: {
    month: number;
    year: number;
    budget: number | null;
    actualExpenditure: number;
    status: string;
  } | null;
  bills: { items: ReportBillRow[]; page: number; pageSize: number; total: number };
}

export const analyticsService = {
  /** ADMIN only. */
  async expenditureByMonth(year: number, filters: AnalyticsFilters = {}): Promise<MonthlyPoint[]> {
    const data = await api.get<MonthlySpendingPoint[]>(
      `/analytics/monthly-spending${toQuery({
        year,
        dealershipId: filters.dealershipId,
        categoryId: filters.categoryId,
      })}`
    );
    return data.map(({ month, label, total, count }) => ({ month, label, total, count }));
  },

  /** ADMIN only. */
  async expenditureByCategory(
    filters: AnalyticsFilters & { month?: number } = {}
  ): Promise<NamedValue[]> {
    return api.get<NamedValue[]>(
      `/analytics/category-breakdown${toQuery({
        month: filters.month,
        year: filters.year,
        dealershipId: filters.dealershipId,
        categoryId: filters.categoryId,
      })}`
    );
  },

  /** ADMIN only. */
  async expenditureByDealership(
    filters: AnalyticsFilters & { month?: number } = {}
  ): Promise<NamedValue[]> {
    return api.get<NamedValue[]>(
      `/analytics/dealership-comparison${toQuery({
        month: filters.month,
        year: filters.year,
        dealershipId: filters.dealershipId,
        categoryId: filters.categoryId,
      })}`
    );
  },

  /** ADMIN only — schedule outcome counts per month for the past N months. */
  async statusTrend(
    months = 6,
    dealershipId?: string
  ): Promise<{ label: string; submitted: number; overdueOrMissing: number }[]> {
    const res = await api.get<SubmissionCompletion>(
      `/analytics/submission-completion${toQuery({ months, dealershipId })}`
    );
    return res.trend;
  },

  /** ADMIN only — bill counts by review status. */
  async reviewStatusBreakdown(filters: AnalyticsFilters = {}): Promise<NamedValue[]> {
    const res = await api.get<SubmissionCompletion>(
      `/analytics/submission-completion${toQuery({
        dealershipId: filters.dealershipId,
        categoryId: filters.categoryId,
      })}`
    );
    return res.breakdown;
  },

  /** ADMIN only — organization-wide KPI summary. */
  async adminSummary(): Promise<AdminSummary> {
    return api.get<AdminSummary>("/analytics/overview");
  },

  /** ADMIN only — budget vs actual expenditure report for one billing period. */
  async expenditureReport(filters: {
    month: number;
    year: number;
    dealershipId?: string;
    categoryId?: string;
    reviewStatus?: string;
    comparePrevious?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<ExpenditureReport> {
    return api.get<ExpenditureReport>(
      `/analytics/expenditure-report${toQuery({
        month: filters.month,
        year: filters.year,
        dealershipId: filters.dealershipId !== "all" ? filters.dealershipId : undefined,
        categoryId: filters.categoryId !== "all" ? filters.categoryId : undefined,
        reviewStatus: filters.reviewStatus !== "all" ? filters.reviewStatus : undefined,
        comparePrevious: filters.comparePrevious,
        page: filters.page,
        pageSize: filters.pageSize,
      })}`
    );
  },

  /** Accountant dashboard — workflow metrics only, no budget data. */
  async accountantSummary(_user: SessionUser): Promise<AccountantSummary> {
    return api.get<AccountantSummary>("/analytics/my-dashboard");
  },
};
