import type { ReviewStatus, ScheduleStatus } from "@/types";

export const SCHEDULE_STATUS_LABEL: Record<ScheduleStatus, string> = {
  scheduled: "Scheduled",
  due_soon: "Due soon",
  overdue: "Overdue",
  missing: "Missing",
  submitted: "Submitted",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  correction_requested: "Correction requested",
  resubmitted: "Resubmitted",
};

export const MAX_FILE_SIZE_KB = 5 * 1024;
export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const ACCEPTED_FILE_EXTENSIONS = ".pdf,.jpg,.jpeg,.png";
