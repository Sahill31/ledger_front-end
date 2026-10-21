import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { billService, type BillFilters } from "@/services/bill.service";
import { dealershipService } from "@/services/dealership.service";
import { categoryService } from "@/services/category.service";
import { useAuth } from "@/features/auth/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { fileSize, formatCurrency, formatDate, formatDateTime, monthShort } from "@/lib/format";
import { REVIEW_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { BillRow, ReviewStatus } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { ReviewStatusBadge } from "@/components/shared/status-badge";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const REVIEW_STATUSES: ReviewStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "correction_requested",
  "resubmitted",
];

/** Statuses an admin can still act on. */
const ACTIONABLE_STATUSES: ReviewStatus[] = ["submitted", "under_review", "resubmitted"];

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-0.5 truncate text-sm">{children}</div>
    </div>
  );
}

export default function AdminBillsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const focusBillId = searchParams.get("bill");

  const [dealershipId, setDealershipId] = React.useState("all");
  const [categoryId, setCategoryId] = React.useState("all");
  const [status, setStatus] = React.useState<ReviewStatus | "all">("all");
  const [periodMonth, setPeriodMonth] = React.useState("all");

  const dealerships = useAsyncData(() => dealershipService.list(), []);
  const categories = useAsyncData(() => categoryService.list(), []);
  const bills = useAsyncData(() => {
    const filters: BillFilters = {
      dealershipId,
      categoryId,
      status,
      periodMonth: periodMonth === "all" ? undefined : Number(periodMonth),
    };
    return billService.list(filters);
  }, [dealershipId, categoryId, status, periodMonth]);

  const iconByCategory = React.useMemo(() => {
    const map = new Map<string, string>();
    (categories.data ?? []).forEach((c) => map.set(c.id, c.icon));
    return map;
  }, [categories.data]);

  const [selected, setSelected] = React.useState<BillRow | null>(null);
  const [approveOpen, setApproveOpen] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [reasonTouched, setReasonTouched] = React.useState(false);
  const [acting, setActing] = React.useState(false);
  const [prevBill, setPrevBill] = React.useState<BillRow | null>(null);

  const canReview = selected !== null && ACTIONABLE_STATUSES.includes(selected.status);

  // Deep link (?bill=<id>) — used by report drill-down to open a bill directly.
  React.useEffect(() => {
    if (!focusBillId || selected?.id === focusBillId) return;
    let cancelled = false;
    billService
      .getById(focusBillId)
      .then((full) => {
        if (!cancelled && full) setSelected(full);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusBillId]);

  // List rows carry no history — fetch the full bill + audit trail on open.
  React.useEffect(() => {
    if (!selected) return;
    setPrevBill(null);
    if (selected.previousBillId) {
      billService.previous(selected.id).then(setPrevBill).catch(() => undefined);
    }
    if (selected.history.length > 0) return;
    let cancelled = false;
    billService
      .getById(selected.id)
      .then((full) => {
        if (!cancelled && full) {
          setSelected(full);
          if (full.previousBillId && !prevBill) {
            billService.previous(full.id).then(setPrevBill).catch(() => undefined);
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  const openDocument = async (id: string) => {
    try {
      const url = await billService.getDocumentUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the document.");
    }
  };

  const columns = React.useMemo<DataTableColumn<BillRow>[]>(
    () => [
      {
        key: "dealership",
        header: "Dealership",
        sortValue: (b) => b.dealershipName,
        cell: (b) => (
          <div>
            <p className="font-medium">{b.dealershipName}</p>
            <p className="text-xs text-muted-foreground">{b.dealershipCode}</p>
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        cell: (b) => (
          <div className="flex items-center gap-2">
            <CategoryIcon
              icon={iconByCategory.get(b.categoryId) ?? "receipt"}
              className="h-7 w-7"
            />
            <span>{b.categoryName}</span>
          </div>
        ),
      },
      {
        key: "period",
        header: "Billing period",
        sortValue: (b) => b.billingPeriod.year * 100 + b.billingPeriod.month,
        cell: (b) => monthShort(b.billingPeriod.month, b.billingPeriod.year),
      },
      {
        key: "amount",
        header: "Amount",
        className: "text-right",
        sortValue: (b) => b.amount,
        cell: (b) => <span className="font-medium tabular-nums">{formatCurrency(b.amount)}</span>,
      },
      {
        key: "billDate",
        header: "Bill date",
        sortValue: (b) => b.billDate,
        cell: (b) => formatDate(b.billDate),
      },
      {
        key: "submitted",
        header: "Submitted",
        sortValue: (b) => b.submittedAt,
        cell: (b) => formatDate(b.submittedAt),
      },
      {
        key: "submittedBy",
        header: "Submitted by",
        cell: (b) => b.submittedByName,
      },
      {
        key: "status",
        header: "Status",
        cell: (b) => <ReviewStatusBadge status={b.status} />,
      },
    ],
    [iconByCategory]
  );

  const openReject = () => {
    setReason("");
    setReasonTouched(false);
    setRejectOpen(true);
  };

  const handleApprove = async () => {
    if (!selected || !user) return;
    setActing(true);
    try {
      await billService.approve(selected.id, user);
      toast.success("Bill approved.");
      bills.reload();
      setApproveOpen(false);
      setSelected(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to approve the bill.");
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!selected || !user) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonTouched(true);
      return;
    }
    setActing(true);
    try {
      await billService.reject(selected.id, trimmed, user);
      toast.success("Bill rejected.");
      bills.reload();
      setRejectOpen(false);
      setSelected(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to reject the bill.");
    } finally {
      setActing(false);
    }
  };

  const toolbar = (
    <>
      <Select value={dealershipId} onValueChange={setDealershipId}>
        <SelectTrigger className="h-9 w-[170px]">
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

      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger className="h-9 w-[150px]">
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

      <Select value={status} onValueChange={(v) => setStatus(v as ReviewStatus | "all")}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {REVIEW_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {REVIEW_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={periodMonth} onValueChange={setPeriodMonth}>
        <SelectTrigger className="h-9 w-[140px]">
          <SelectValue placeholder="All periods" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All periods</SelectItem>
          {MONTH_NAMES.map((name, i) => (
            <SelectItem key={name} value={String(i + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bill submissions"
        description="Review utility bill submissions across all dealerships and approve or reject them."
      />

      <DataTable
        columns={columns}
        data={bills.data ?? []}
        loading={bills.loading}
        rowKey={(b) => b.id}
        onRowClick={setSelected}
        searchFn={(b) =>
          `${b.dealershipName} ${b.dealershipCode} ${b.categoryName} ${b.referenceNumber ?? ""} ${b.submittedByName}`
        }
        searchPlaceholder="Search bills…"
        toolbar={toolbar}
        emptyTitle="No bills found"
        emptyDescription="No bill submissions match the current filters."
      />

      {/* Bill detail dialog */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Bill submission</DialogTitle>
                <DialogDescription>
                  {selected.dealershipName} ·{" "}
                  {monthShort(selected.billingPeriod.month, selected.billingPeriod.year)} ·{" "}
                  {formatCurrency(selected.amount)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                <DetailItem label="Dealership">
                  {selected.dealershipName} ({selected.dealershipCode})
                </DetailItem>
                <DetailItem label="Category">{selected.categoryName}</DetailItem>
                <DetailItem label="Billing period">
                  {monthShort(selected.billingPeriod.month, selected.billingPeriod.year)}
                </DetailItem>
                <DetailItem label="Amount">{formatCurrency(selected.amount)}</DetailItem>
                <DetailItem label="Bill date">{formatDate(selected.billDate)}</DetailItem>
                <DetailItem label="Reference no.">
                  {selected.referenceNumber ?? "—"}
                </DetailItem>
                <DetailItem label="Submitted by">{selected.submittedByName}</DetailItem>
                <DetailItem label="Submitted at">{formatDateTime(selected.submittedAt)}</DetailItem>
                <DetailItem label="Status">
                  <ReviewStatusBadge status={selected.status} />
                </DetailItem>
              </div>

              <Separator />

              {/* Submitted document */}
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{selected.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {selected.fileType.toUpperCase()} · {fileSize(selected.fileSizeKb)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => void openDocument(selected.id)}
                >
                  View document
                </Button>
              </div>

              {/* Scanned / extracted bill information */}
              {(selected.scanId || selected.consumerNumber) && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-3 text-sm font-medium">Extracted bill information</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                      <DetailItem label="Consumer / K-no.">
                        {selected.consumerNumber ?? "—"}
                      </DetailItem>
                      <DetailItem label="Meter number">
                        {selected.meterNumber ?? "—"}
                      </DetailItem>
                      <DetailItem label="Units consumed">
                        {selected.unitsKwh !== undefined ? `${selected.unitsKwh} kWh` : "—"}
                      </DetailItem>
                      <DetailItem label="Current period charges">
                        {selected.currentPeriodAmount !== undefined
                          ? formatCurrency(selected.currentPeriodAmount)
                          : "—"}
                      </DetailItem>
                      <DetailItem label="Previous bill amount">
                        {selected.previousBillAmount !== undefined
                          ? formatCurrency(selected.previousBillAmount)
                          : "—"}
                      </DetailItem>
                      <DetailItem label="Previous bill">
                        {prevBill
                          ? `${prevBill.billReference ?? prevBill.id.slice(0, 8)} · ${monthShort(prevBill.billingPeriod.month, prevBill.billingPeriod.year)}`
                          : selected.previousBillId
                            ? "Loading…"
                            : "None matched"}
                      </DetailItem>
                    </div>
                    {selected.extractionWarnings && selected.extractionWarnings.length > 0 && (
                      <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        {selected.extractionWarnings.map((w, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}

              {/* Budget comparison — admin sees the full figures */}
              {selected.budgetComparison && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-3 text-sm font-medium">Budget comparison</p>
                    <div
                      className={cn(
                        "rounded-lg border p-3",
                        selected.budgetComparison.status === "over_budget"
                          ? "border-red-200 bg-red-50"
                          : selected.budgetComparison.status === "within_budget"
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-slate-200 bg-slate-50"
                      )}
                    >
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                        <DetailItem label="Status">
                          {selected.budgetComparison.status === "within_budget"
                            ? "Within budget"
                            : selected.budgetComparison.status === "over_budget"
                              ? "Over budget"
                              : "No budget configured"}
                        </DetailItem>
                        <DetailItem label="Compared amount">
                          {formatCurrency(selected.budgetComparison.comparisonAmount)}
                        </DetailItem>
                        <DetailItem label="Monthly budget">
                          {selected.budgetComparison.budgetAmount !== null
                            ? formatCurrency(selected.budgetComparison.budgetAmount)
                            : "—"}
                        </DetailItem>
                        <DetailItem label="Variance">
                          {selected.budgetComparison.varianceAmount !== null
                            ? `${selected.budgetComparison.varianceAmount > 0 ? "+" : ""}${formatCurrency(selected.budgetComparison.varianceAmount)}`
                            : "—"}
                        </DetailItem>
                        <DetailItem label="Utilization">
                          {selected.budgetComparison.utilizationPercentage !== null
                            ? `${selected.budgetComparison.utilizationPercentage}%`
                            : "—"}
                        </DetailItem>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Compared against the current-period charge (arrears excluded) for the
                        budget of {monthShort(selected.billingPeriod.month, selected.billingPeriod.year)}.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Rejection reason callout */}
              {selected.status === "rejected" && selected.rejectionReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                    Rejection reason
                  </p>
                  <p className="mt-1 text-sm text-red-700">{selected.rejectionReason}</p>
                </div>
              )}

              {/* Review history timeline */}
              <div>
                <p className="mb-3 text-sm font-medium">Review history</p>
                <ul>
                  {[...selected.history].reverse().map((evt, i, arr) => (
                    <li key={evt.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < arr.length - 1 && (
                        <span
                          aria-hidden
                          className="absolute bottom-0 left-[3.5px] top-3 w-px bg-border"
                        />
                      )}
                      <span
                        aria-hidden
                        className="relative z-10 mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          {REVIEW_STATUS_LABEL[evt.action]}{" "}
                          <span className="font-normal text-muted-foreground">
                            by {evt.actorName}
                          </span>
                        </p>
                        {evt.note && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            &ldquo;{evt.note}&rdquo;
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(evt.at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {canReview && (
                <DialogFooter>
                  <Button
                    variant="destructive"
                    onClick={openReject}
                    disabled={acting}
                  >
                    Reject
                  </Button>
                  <Button onClick={() => setApproveOpen(true)} disabled={acting}>
                    {acting ? "Working…" : "Approve"}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve confirmation */}
      <ConfirmDialog
        open={approveOpen}
        onOpenChange={(open) => {
          if (!acting) setApproveOpen(open);
        }}
        title="Approve this bill submission?"
        description={
          selected
            ? `The ${selected.categoryName} bill of ${formatCurrency(selected.amount)} for ${selected.dealershipName} will be marked as approved and the accountant notified.`
            : undefined
        }
        confirmLabel="Approve"
        loading={acting}
        onConfirm={handleApprove}
      />

      {/* Reject dialog */}
      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (acting) return;
          setRejectOpen(open);
          if (!open) {
            setReason("");
            setReasonTouched(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject bill submission</DialogTitle>
            <DialogDescription>
              The accountant will be notified and can resubmit a corrected bill.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection reason</Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setReasonTouched(true)}
              placeholder="Explain what needs to be corrected…"
              disabled={acting}
            />
            {reasonTouched && !reason.trim() ? (
              <p className="text-xs text-red-600">A rejection reason is required.</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                A rejection reason is required to reject this bill.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={acting || !reason.trim()}
            >
              {acting ? "Working…" : "Reject bill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
