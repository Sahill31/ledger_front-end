import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { FileText, Loader2, Plus, ReceiptText, RotateCcw } from "lucide-react";

import { useAuth } from "@/features/auth/auth-context";
import {
  billService,
  type BillFilters,
  type BillSubmitInput,
} from "@/services/bill.service";
import { dealershipService } from "@/services/dealership.service";
import { categoryService } from "@/services/category.service";
import { useAsyncData } from "@/hooks/use-async-data";
import {
  fileSize,
  formatCurrency,
  formatDate,
  formatDateTime,
  monthShort,
} from "@/lib/format";
import { REVIEW_STATUS_LABEL } from "@/lib/constants";
import type {
  BillRow,
  ReviewEvent,
  ReviewStatus,
  SessionUser,
} from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { ReviewStatusBadge } from "@/components/shared/status-badge";
import { CategoryIcon } from "@/components/shared/category-icon";
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: format(new Date(2020, i, 1), "MMMM"),
}));

const ACTION_LABEL: Record<ReviewEvent["action"], string> = {
  submitted: "Bill submitted",
  resubmitted: "Bill resubmitted",
  under_review: "Marked under review",
  approved: "Approved",
  rejected: "Rejected",
  correction_requested: "Corrections requested",
};

const resubmitSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => Number(v) > 0, "Amount must be greater than 0"),
  billDate: z.string().min(1, "Bill date is required"),
  referenceNumber: z.string().optional(),
});
type ResubmitValues = z.infer<typeof resubmitSchema>;

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export default function AccountantBillsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dealershipId, setDealershipId] = React.useState("all");
  const [status, setStatus] = React.useState<ReviewStatus | "all">("all");
  const [month, setMonth] = React.useState("all");
  const [selected, setSelected] = React.useState<BillRow | null>(null);
  const [resubmitBill, setResubmitBill] = React.useState<BillRow | null>(null);

  const dealerships = useAsyncData(
    () => (user ? dealershipService.forAccountant(user.id) : Promise.resolve([])),
    [user?.id]
  );
  const categories = useAsyncData(() => categoryService.list(), []);

  const filters = React.useMemo<BillFilters>(
    () => ({
      dealershipId,
      status,
      periodMonth: month === "all" ? undefined : Number(month),
    }),
    [dealershipId, status, month]
  );

  const bills = useAsyncData(
    () => (user ? billService.forAccountant(user, filters) : Promise.resolve([])),
    [user, filters]
  );

  // The list endpoint returns rows without history — fetch the full bill
  // (with audit trail) when a row is opened.
  React.useEffect(() => {
    if (!selected || selected.history.length > 0) return;
    let cancelled = false;
    billService
      .getById(selected.id)
      .then((full) => {
        if (!cancelled && full) setSelected(full);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const openDocument = async (id: string) => {
    try {
      const url = await billService.getDocumentUrl(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the document.");
    }
  };

  const categoryIcons = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories.data ?? []) map.set(c.id, c.icon);
    return map;
  }, [categories.data]);

  const columns: DataTableColumn<BillRow>[] = [
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
            icon={categoryIcons.get(b.categoryId) ?? "receipt"}
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
      cell: (b) => (
        <span className="font-medium tabular-nums">{formatCurrency(b.amount)}</span>
      ),
    },
    {
      key: "billDate",
      header: "Bill date",
      cell: (b) => formatDate(b.billDate),
    },
    {
      key: "submitted",
      header: "Submitted",
      sortValue: (b) => b.submittedAt,
      cell: (b) => formatDate(b.submittedAt),
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => <ReviewStatusBadge status={b.status} />,
    },
  ];

  const toolbar = (
    <>
      <Select value={dealershipId} onValueChange={setDealershipId}>
        <SelectTrigger className="h-9 w-[190px]">
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
      <Select
        value={status}
        onValueChange={(v) => setStatus(v as ReviewStatus | "all")}
      >
        <SelectTrigger className="h-9 w-[160px]">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {(Object.keys(REVIEW_STATUS_LABEL) as ReviewStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {REVIEW_STATUS_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={month} onValueChange={setMonth}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder="All months" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All months</SelectItem>
          {MONTH_OPTIONS.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="My bills"
        description="Utility bills you have submitted across your assigned dealerships."
        actions={
          <Button onClick={() => navigate("/accountant/upload-bill")}>
            <Plus className="h-4 w-4" /> Submit bill
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={bills.data ?? []}
        loading={bills.loading}
        rowKey={(b) => b.id}
        searchFn={(b) =>
          `${b.dealershipName} ${b.dealershipCode} ${b.categoryName} ${b.referenceNumber ?? ""}`
        }
        searchPlaceholder="Search bills…"
        toolbar={toolbar}
        emptyIcon={<ReceiptText className="h-5 w-5" />}
        emptyTitle="No bills found"
        emptyDescription="Bills you submit for review will appear here."
        onRowClick={(b) => setSelected(b)}
      />

      {/* Bill detail dialog */}
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.categoryName} bill —{" "}
                  {monthShort(selected.billingPeriod.month, selected.billingPeriod.year)}
                </DialogTitle>
                <DialogDescription>
                  {selected.dealershipName} ({selected.dealershipCode})
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <InfoItem label="Amount">
                  <span className="font-semibold">{formatCurrency(selected.amount)}</span>
                </InfoItem>
                <InfoItem label="Status">
                  <ReviewStatusBadge status={selected.status} />
                </InfoItem>
                <InfoItem label="Bill date">{formatDate(selected.billDate)}</InfoItem>
                <InfoItem label="Billing period">
                  {monthShort(selected.billingPeriod.month, selected.billingPeriod.year)}
                </InfoItem>
                <InfoItem label="Submitted">{formatDateTime(selected.submittedAt)}</InfoItem>
                <InfoItem label="Reference">{selected.referenceNumber ?? "—"}</InfoItem>
                {selected.consumerNumber && (
                  <InfoItem label="Consumer no.">{selected.consumerNumber}</InfoItem>
                )}
                {selected.budgetStatus && (
                  <InfoItem label="Budget status">
                    {selected.budgetStatus === "within_budget"
                      ? "Within budget"
                      : selected.budgetStatus === "over_budget"
                        ? "Over budget"
                        : "No budget configured"}
                  </InfoItem>
                )}
              </div>

              {/* Attached document */}
              <div className="flex items-center gap-3 rounded-lg border bg-slate-50 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-red-50 text-red-600">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{selected.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.fileType.toUpperCase()} · {fileSize(selected.fileSizeKb)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void openDocument(selected.id)}>
                  View document
                </Button>
              </div>

              {selected.status === "rejected" && selected.rejectionReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                    Rejection reason
                  </p>
                  <p className="mt-1 text-sm text-red-800">{selected.rejectionReason}</p>
                </div>
              )}

              {selected.status === "correction_requested" && selected.adminNotes && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Corrections requested
                  </p>
                  <p className="mt-1 text-sm text-amber-800">{selected.adminNotes}</p>
                </div>
              )}

              {/* Review history */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  History
                </p>
                <div>
                  {selected.history.map((evt, i) => (
                    <div key={evt.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        {i < selected.history.length - 1 && (
                          <span className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{ACTION_LABEL[evt.action]}</p>
                        <p className="text-xs text-muted-foreground">
                          {evt.actorName} · {formatDateTime(evt.at)}
                        </p>
                        {evt.note && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            “{evt.note}”
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(selected.status === "rejected" ||
                selected.status === "correction_requested") && (
                <DialogFooter>
                  <Button onClick={() => setResubmitBill(selected)}>
                    <RotateCcw className="h-4 w-4" /> Resubmit
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resubmit dialog */}
      {resubmitBill && user && (
        <ResubmitDialog
          bill={resubmitBill}
          user={user}
          onClose={() => setResubmitBill(null)}
          onDone={(updated) => {
            setResubmitBill(null);
            setSelected(updated);
            bills.reload();
          }}
        />
      )}
    </div>
  );
}

function ResubmitDialog({
  bill,
  user,
  onClose,
  onDone,
}: {
  bill: BillRow;
  user: SessionUser;
  onClose: () => void;
  onDone: (bill: BillRow) => void;
}) {
  const form = useForm<ResubmitValues>({
    resolver: zodResolver(resubmitSchema),
    defaultValues: {
      amount: String(bill.amount),
      billDate: format(parseISO(bill.billDate), "yyyy-MM-dd"),
      referenceNumber: bill.referenceNumber ?? "",
    },
  });
  const [file, setFile] = React.useState<UploadedFile | null>({
    name: bill.fileName,
    type: bill.fileType,
    sizeKb: bill.fileSizeKb,
  });
  const [fileError, setFileError] = React.useState<string | null>(null);
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: ResubmitValues) => {
    if (!file) {
      setFileError("Attach the corrected bill document.");
      return;
    }
    const input: BillSubmitInput = {
      scheduleId: bill.scheduleId,
      dealershipId: bill.dealershipId,
      categoryId: bill.categoryId,
      amount: Number(values.amount),
      billDate: new Date(values.billDate).toISOString(),
      billingPeriod: bill.billingPeriod,
      referenceNumber: values.referenceNumber?.trim() || undefined,
      fileName: file.name,
      fileType: file.type,
      fileSizeKb: file.sizeKb,
    };
    try {
      const updated = await billService.resubmit(bill.id, input, user);
      toast.success("Bill resubmitted");
      onDone(updated);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resubmission failed.");
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Resubmit bill</DialogTitle>
          <DialogDescription>
            {bill.categoryName} · {bill.dealershipName} ·{" "}
            {monthShort(bill.billingPeriod.month, bill.billingPeriod.year)}. Correct the
            details below and send the bill back for review.
          </DialogDescription>
        </DialogHeader>

        {(bill.rejectionReason || bill.adminNotes) && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
              {bill.status === "correction_requested" ? "Corrections requested" : "Rejection reason"}
            </p>
            <p className="mt-1 text-sm text-red-800">
              {bill.status === "correction_requested" ? bill.adminNotes : bill.rejectionReason}
            </p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Invoice or account reference" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-1.5">
              <Label>Bill document</Label>
              <FileUpload
                value={file}
                onChange={(f) => {
                  setFile(f);
                  if (f) setFileError(null);
                }}
                disabled={submitting}
              />
              {fileError && (
                <p className="text-xs font-medium text-destructive">{fileError}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Resubmitting…
                  </>
                ) : (
                  "Resubmit bill"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
