import { Badge } from "@/components/ui/badge";
import { REVIEW_STATUS_LABEL, SCHEDULE_STATUS_LABEL } from "@/lib/constants";
import type { ReviewStatus, ScheduleStatus } from "@/types";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileSearch,
  FileX,
  Send,
  Timer,
  XCircle,
} from "lucide-react";

const SCHEDULE_VARIANT: Record<ScheduleStatus, { variant: "secondary" | "warning" | "destructive" | "info" | "success" | "outline"; icon: React.ReactNode }> = {
  scheduled: { variant: "secondary", icon: <Calendar className="h-3 w-3" /> },
  due_soon: { variant: "warning", icon: <Timer className="h-3 w-3" /> },
  overdue: { variant: "destructive", icon: <Clock className="h-3 w-3" /> },
  missing: { variant: "destructive", icon: <FileX className="h-3 w-3" /> },
  submitted: { variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  completed: { variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { variant: "outline", icon: <XCircle className="h-3 w-3" /> },
};

const REVIEW_VARIANT: Record<ReviewStatus, { variant: "info" | "warning" | "success" | "destructive" | "purple"; icon: React.ReactNode }> = {
  submitted: { variant: "info", icon: <Send className="h-3 w-3" /> },
  under_review: { variant: "warning", icon: <FileSearch className="h-3 w-3" /> },
  approved: { variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { variant: "destructive", icon: <XCircle className="h-3 w-3" /> },
  correction_requested: { variant: "warning", icon: <FileSearch className="h-3 w-3" /> },
  resubmitted: { variant: "purple", icon: <Send className="h-3 w-3" /> },
};

export function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  const cfg = SCHEDULE_VARIANT[status];
  return (
    <Badge variant={cfg.variant}>
      {cfg.icon}
      {SCHEDULE_STATUS_LABEL[status]}
    </Badge>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const cfg = REVIEW_VARIANT[status];
  return (
    <Badge variant={cfg.variant}>
      {cfg.icon}
      {REVIEW_STATUS_LABEL[status]}
    </Badge>
  );
}
