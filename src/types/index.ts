export type Role = "admin" | "accountant";
export type UserStatus = "active" | "inactive";

export interface User {
  id: string;
  name: string;
  email: string;
  /** Never returned by the API — only used when creating accounts. */
  password?: string;
  role: Role;
  phone?: string;
  title?: string;
  status: UserStatus;
  /** Dealerships an accountant is assigned to. Empty for admins. */
  dealershipIds: string[];
  createdAt: string;
  lastLoginAt?: string;
}

export interface Dealership {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state?: string;
  phone?: string;
  email?: string;
  status: "active" | "inactive";
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
  createdAt: string;
}

export interface BudgetHistoryEntry {
  amount: number;
  changedAt: string;
  changedBy: string;
}

export interface Budget {
  id: string;
  dealershipId: string;
  categoryId: string;
  month: number; // 1-12
  year: number;
  amount: number;
  updatedAt: string;
  updatedBy: string;
  history: BudgetHistoryEntry[];
}

export interface BillingPeriod {
  month: number; // 1-12
  year: number;
}

export interface BillSchedule {
  id: string;
  dealershipId: string;
  categoryId: string;
  billingPeriod: BillingPeriod;
  periodStart: string;
  periodEnd: string;
  /** Vendor due date printed on the bill. */
  dueDate: string;
  /** Internal deadline for the accountant to submit the bill. */
  submissionDeadline: string;
  recurring: boolean;
  notes?: string;
}

export type ReviewStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "correction_requested"
  | "resubmitted";

export type ScheduleStatus =
  | "scheduled"
  | "due_soon"
  | "overdue"
  | "missing"
  | "submitted"
  | "completed"
  | "cancelled";

export interface ReviewEvent {
  id: string;
  action:
    | "submitted"
    | "resubmitted"
    | "approved"
    | "rejected"
    | "under_review"
    | "correction_requested";
  actorId: string;
  actorName: string;
  note?: string;
  at: string;
}

export type BudgetStatus = "within_budget" | "over_budget" | "no_budget";

export interface Bill {
  id: string;
  billReference?: string;
  scheduleId?: string;
  dealershipId: string;
  categoryId: string;
  submittedById: string;
  submittedByName: string;
  amount: number;
  billDate: string;
  billingPeriod: BillingPeriod;
  referenceNumber?: string;
  fileName: string;
  fileType: "pdf" | "jpg" | "png";
  fileSizeKb: number;
  status: ReviewStatus;
  rejectionReason?: string;
  accountantNotes?: string;
  adminNotes?: string;
  submittedAt: string;
  resubmissionCount: number;
  history: ReviewEvent[];

  // --- Extraction / scan workflow ---
  consumerNumber?: string;
  meterNumber?: string;
  unitsKwh?: number;
  currentPeriodAmount?: number;
  previousBillAmount?: number;
  previousBillId?: string;
  scanId?: string;
  extractionWarnings?: string[];
  /** Status label only — never carries budget figures to accountants. */
  budgetStatus?: BudgetStatus;
  /** Present ONLY in admin responses. */
  budgetComparison?: {
    status: BudgetStatus;
    comparisonAmount: number;
    budgetAmount: number | null;
    varianceAmount: number | null;
    utilizationPercentage: number | null;
  };
}

/** Structured extraction from a scanned bill document (JVVNL). */
export interface ExtractedBillFields {
  utilityProvider: string | null;
  documentType: "electricity_bill" | "unknown" | null;
  consumerNumber: string | null;
  billNumber: string | null;
  consumerName: string | null;
  serviceAddress: string | null;
  meterNumber: string | null;
  billingMonth: number | null;
  billingYear: number | null;
  previousReadingDate: string | null;
  currentReadingDate: string | null;
  issueDate: string | null;
  dueDate: string | null;
  previousBillAmount: number | null;
  previousOutstanding: number | null;
  paymentsReceived: number | null;
  energyCharges: number | null;
  fixedCharges: number | null;
  surcharges: number | null;
  taxesDuties: number | null;
  lateFees: number | null;
  currentAmount: number | null;
  totalAmountPayable: number | null;
  totalOutstanding: number | null;
  previousReading: number | null;
  currentReading: number | null;
  unitsKwh: number | null;
  sanctionedLoadKw: number | null;
  tariffCategory: string | null;
}

export interface BillScan {
  id: string;
  status: "processing" | "extracted" | "partial" | "failed";
  fileName: string;
  fileType: "pdf" | "jpg" | "png";
  fileSizeKb: number;
  extractionMethod: string | null;
  pageCount: number | null;
  dealershipId: string | null;
  categoryId: string | null;
  scheduleId: string | null;
  fields: ExtractedBillFields | null;
  confidence: Partial<Record<keyof ExtractedBillFields, number>> | null;
  warnings: string[];
  expiresAt: string;
  createdAt: string;
}

export type NotificationType =
  | "missing_bill"
  | "deadline_approaching"
  | "overdue"
  | "submitted"
  | "review_request"
  | "approved"
  | "rejected"
  | "resubmitted"
  | "correction_requested"
  | "budget_alert"
  | "system";

export interface NotificationItem {
  id: string;
  audience: "admin" | "accountant";
  userId?: string;
  dealershipId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

/** A schedule row enriched for list/task views. */
export interface ScheduledTask extends BillSchedule {
  dealershipName: string;
  dealershipCode: string;
  categoryName: string;
  status: ScheduleStatus;
  /** Minimal info about the active (non-rejected) bill linked to this schedule. */
  bill?: { id: string; status: ReviewStatus; amount: number };
}

/** A bill row enriched for list views. */
export interface BillRow extends Bill {
  dealershipName: string;
  dealershipCode: string;
  categoryName: string;
}

/** Budget row enriched with actuals — ADMIN ONLY, never expose to accountants. */
export interface BudgetRow extends Budget {
  dealershipName: string;
  categoryName: string;
  actual: number;
  remaining: number;
  utilization: number;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string;
  status: UserStatus;
  dealershipIds: string[];
}
