import { api, toQuery, type Paginated } from "./api";
import type {
  BillRow,
  BillingPeriod,
  ReviewEvent,
  ReviewStatus,
  SessionUser,
} from "@/types";

export interface BillFilters {
  dealershipId?: string;
  categoryId?: string;
  status?: ReviewStatus | "all";
  periodMonth?: number;
  periodYear?: number;
  search?: string;
  submittedFrom?: string;
  submittedTo?: string;
}

export interface BillSubmitInput {
  scheduleId?: string;
  dealershipId: string;
  categoryId: string;
  amount: number;
  billDate: string;
  billingPeriod: BillingPeriod;
  referenceNumber?: string;
  notes?: string;
  /** The actual document — required for new submissions, optional on resubmit. */
  file?: File;
  fileName: string;
  fileType: "pdf" | "jpg" | "png";
  fileSizeKb: number;

  // Scan workflow — when set, the backend takes the document from the scan
  // and no `file` is required.
  scanId?: string;
  consumerNumber?: string;
  meterNumber?: string;
  unitsKwh?: number;
  currentPeriodAmount?: number;
  previousBillAmount?: number;
}

interface ReviewEventDTO {
  id: string;
  action: string;
  actorId: string;
  actorName: string;
  note?: string;
  at: string;
}

function toReviewEvent(dto: ReviewEventDTO): ReviewEvent {
  return { ...dto, action: dto.action as ReviewEvent["action"] };
}

function buildFormData(input: BillSubmitInput, includeFile: boolean): FormData {
  const form = new FormData();
  form.append(
    "data",
    JSON.stringify({
      dealershipId: input.dealershipId,
      categoryId: input.categoryId,
      scheduleId: input.scheduleId,
      billingPeriod: input.billingPeriod,
      billingDate: input.billDate,
      amount: input.amount,
      referenceNumber: input.referenceNumber,
      accountantNotes: input.notes,
      scanId: input.scanId,
      consumerNumber: input.consumerNumber,
      meterNumber: input.meterNumber,
      unitsKwh: input.unitsKwh,
      currentPeriodAmount: input.currentPeriodAmount,
      previousBillAmount: input.previousBillAmount,
    })
  );
  if (includeFile && input.file) form.append("document", input.file, input.file.name);
  return form;
}

function buildQuery(filters: BillFilters): string {
  return toQuery({
    pageSize: 100,
    dealershipId: filters.dealershipId,
    categoryId: filters.categoryId,
    status: filters.status,
    month: filters.periodMonth,
    year: filters.periodYear,
    search: filters.search,
    submittedFrom: filters.submittedFrom,
    submittedTo: filters.submittedTo,
  });
}

export const billService = {
  /** Admin: all bills. Accountant: backend-scoped to assigned dealerships. */
  async list(filters: BillFilters = {}): Promise<BillRow[]> {
    const res = await api.get<Paginated<BillRow>>(`/bills${buildQuery(filters)}`);
    return res.items;
  },

  async forAccountant(_user: SessionUser, filters: BillFilters = {}): Promise<BillRow[]> {
    return this.list(filters);
  },

  /** Bill detail including the review/audit history. */
  async getById(id: string): Promise<BillRow | undefined> {
    const [bill, history] = await Promise.all([
      api.get<BillRow>(`/bills/${id}`),
      api.get<ReviewEventDTO[]>(`/bills/${id}/history`),
    ]);
    return { ...bill, history: history.map(toReviewEvent) };
  },

  /** Short-lived signed URL for the private document (authorized users only). */
  async getDocumentUrl(id: string): Promise<string> {
    const res = await api.get<{ url: string; expiresInSeconds: number }>(
      `/bills/${id}/document-url`
    );
    return res.url;
  },

  async submit(input: BillSubmitInput, _user: SessionUser): Promise<BillRow> {
    if (!input.file && !input.scanId) {
      throw new Error("Attach the bill document (or scan it) before submitting.");
    }
    return api.postForm<BillRow>("/bills", buildFormData(input, true));
  },

  /** Status-only for accountants; admin gets full figures. */
  budgetPreview(input: {
    dealershipId: string;
    categoryId: string;
    billingPeriod: BillingPeriod;
    amount: number;
    currentPeriodAmount?: number;
  }): Promise<{
    status: "within_budget" | "over_budget" | "no_budget";
    comparisonAmount?: number;
    budgetAmount?: number | null;
    varianceAmount?: number | null;
    utilizationPercentage?: number | null;
  }> {
    return api.post("/bills/budget-preview", input);
  },

  /** The matched previous-period bill for the same consumer, if any. */
  previous(id: string): Promise<BillRow | null> {
    return api.get<BillRow | null>(`/bills/${id}/previous`);
  },

  /** ADMIN only — full budget comparison for a submitted bill. */
  budgetComparison(id: string): Promise<{
    status: string | null;
    comparisonAmount: number | null;
    budgetAmount: number | null;
    varianceAmount: number | null;
    utilizationPercentage: number | null;
  }> {
    return api.get(`/bills/${id}/budget-comparison`);
  },

  async resubmit(id: string, input: BillSubmitInput, _user: SessionUser): Promise<BillRow> {
    // A replacement document is optional — omitting it keeps the stored file.
    return api.postForm<BillRow>(`/bills/${id}/resubmit`, buildFormData(input, true));
  },

  async approve(id: string, _admin: SessionUser, note?: string): Promise<BillRow> {
    return api.post<BillRow>(`/bills/${id}/review`, { decision: "APPROVED", notes: note });
  },

  async reject(id: string, reason: string, _admin: SessionUser): Promise<BillRow> {
    return api.post<BillRow>(`/bills/${id}/review`, { decision: "REJECTED", reason });
  },
};
