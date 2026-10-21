import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ExternalLink,
  FilePlus2,
  Loader2,
  RefreshCw,
  ScanLine,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/features/auth/auth-context";
import { billService, type BillSubmitInput } from "@/services/bill.service";
import { documentService } from "@/services/document.service";
import { scheduleService } from "@/services/schedule.service";
import { dealershipService } from "@/services/dealership.service";
import { categoryService } from "@/services/category.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatCurrency, formatDate, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { BillScan, ScheduledTask } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { ScheduleStatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { FileUpload, type UploadedFile } from "@/components/shared/file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const OTHER = "other";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: format(new Date(2020, i, 1), "MMMM"),
}));

const detailsSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => Number(v) > 0, "Amount must be greater than 0"),
  billDate: z.string().min(1, "Bill date is required"),
  referenceNumber: z.string().optional(),
  consumerNumber: z.string().optional(),
  meterNumber: z.string().optional(),
  unitsKwh: z.string().optional(),
  currentPeriodAmount: z.string().optional(),
  previousBillAmount: z.string().optional(),
});
type DetailsValues = z.infer<typeof detailsSchema>;

type ScanField =
  | "amount"
  | "billDate"
  | "referenceNumber"
  | "consumerNumber"
  | "meterNumber"
  | "unitsKwh"
  | "currentPeriodAmount"
  | "previousBillAmount";

function StepIndicator({ step }: { step: 1 | 2 }) {
  const items = ["Select bill", "Details & review"];
  return (
    <ol className="flex items-center gap-2">
      {items.map((label, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span className="px-1 text-muted-foreground">·</span>}
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
              )}
            >
              {done ? <Check className="h-3 w-3" /> : n}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/** Confidence dot on a label — shown only for fields filled by the scanner. */
function AutoFilledMark({
  filled,
  dirty,
  confidence,
}: {
  filled: boolean;
  dirty: boolean;
  confidence?: number;
}) {
  if (!filled) return null;
  if (dirty) {
    return (
      <Badge variant="outline" className="ml-1 border-amber-300 px-1 py-0 text-[10px] text-amber-700">
        edited
      </Badge>
    );
  }
  const low = confidence !== undefined && confidence < 0.6;
  return (
    <Badge
      variant="outline"
      className={cn(
        "ml-1 px-1 py-0 text-[10px]",
        low ? "border-amber-300 text-amber-700" : "border-emerald-300 text-emerald-700"
      )}
      title={confidence !== undefined ? `Scan confidence ${Math.round(confidence * 100)}%` : "Filled from scan"}
    >
      <Sparkles className="mr-0.5 h-2.5 w-2.5" /> {low ? "check" : "scan"}
    </Badge>
  );
}

const BUDGET_BADGE: Record<string, { label: string; className: string }> = {
  within_budget: { label: "Within budget", className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  over_budget: { label: "Over budget — admin will review", className: "bg-red-100 text-red-800 border-red-200" },
  no_budget: { label: "No budget configured", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

export default function NewBillPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const presetScheduleId =
    (location.state as { scheduleId?: string } | null)?.scheduleId ?? undefined;

  const today = new Date();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [dealershipId, setDealershipId] = React.useState("");
  const [selection, setSelection] = React.useState("");
  const [adHocCategoryId, setAdHocCategoryId] = React.useState("");
  const [adHocMonth, setAdHocMonth] = React.useState(String(today.getMonth() + 1));
  const [adHocYear, setAdHocYear] = React.useState(String(today.getFullYear()));
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<UploadedFile | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);

  // Scanning state
  const [scan, setScan] = React.useState<BillScan | null>(null);
  const [scanning, setScanning] = React.useState(false);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [autofilled, setAutofilled] = React.useState<Set<ScanField>>(new Set());
  const [budgetStatus, setBudgetStatus] = React.useState<string | null>(null);

  const dealerships = useAsyncData(
    () => (user ? dealershipService.forAccountant(user.id) : Promise.resolve([])),
    [user?.id]
  );
  const tasks = useAsyncData(
    () => (user ? scheduleService.forAccountant(user.id) : Promise.resolve([])),
    [user?.id]
  );
  const categories = useAsyncData(() => categoryService.list(), []);

  // Preselect the schedule the user arrived with (from the Tasks page).
  const presetApplied = React.useRef(false);
  React.useEffect(() => {
    if (presetApplied.current || !presetScheduleId || tasks.loading) return;
    const task = (tasks.data ?? []).find((t) => t.id === presetScheduleId);
    if (task) {
      setDealershipId(task.dealershipId);
      setSelection(task.id);
    }
    presetApplied.current = true;
  }, [presetScheduleId, tasks.loading, tasks.data]);

  const openTasks = React.useMemo(
    () =>
      (tasks.data ?? []).filter(
        (t) => t.dealershipId === dealershipId && t.status !== "submitted"
      ),
    [tasks.data, dealershipId]
  );

  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      amount: "",
      billDate: "",
      referenceNumber: "",
      consumerNumber: "",
      meterNumber: "",
      unitsKwh: "",
      currentPeriodAmount: "",
      previousBillAmount: "",
    },
  });
  const submitting = form.formState.isSubmitting;
  const dirty = form.formState.dirtyFields;

  const selectedTask: ScheduledTask | undefined =
    selection && selection !== OTHER
      ? (tasks.data ?? []).find((t) => t.id === selection)
      : undefined;
  const dealership = (dealerships.data ?? []).find((d) => d.id === dealershipId);
  const categoryId = selectedTask?.categoryId ?? adHocCategoryId;
  const category = (categories.data ?? []).find((c) => c.id === categoryId);
  const period = selectedTask
    ? selectedTask.billingPeriod
    : { month: Number(adHocMonth), year: Number(adHocYear) };

  const watchedAmount = form.watch("amount");
  const watchedBillDate = form.watch("billDate");
  const watchedReference = form.watch("referenceNumber");
  const watchedCurrentAmount = form.watch("currentPeriodAmount");
  const watchedPrevAmount = form.watch("previousBillAmount");
  const watchedConsumer = form.watch("consumerNumber");
  const watchedUnits = form.watch("unitsKwh");

  const yearOptions = [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1];

  // Live budget status check — accountant sees the label only.
  React.useEffect(() => {
    const amount = Number(watchedAmount);
    if (!dealershipId || !categoryId || !Number.isFinite(amount) || amount <= 0) {
      setBudgetStatus(null);
      return;
    }
    const timer = setTimeout(() => {
      billService
        .budgetPreview({
          dealershipId,
          categoryId,
          billingPeriod: period,
          amount,
          currentPeriodAmount: watchedCurrentAmount ? Number(watchedCurrentAmount) : undefined,
        })
        .then((r) => setBudgetStatus(r.status))
        .catch(() => setBudgetStatus(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [watchedAmount, watchedCurrentAmount, dealershipId, categoryId, period.month, period.year]);

  const applyScan = (s: BillScan) => {
    const f = s.fields;
    if (!f) return;
    const filled = new Set<ScanField>();
    const put = (name: ScanField, value: string | number | null | undefined) => {
      if (value === null || value === undefined || value === "") return;
      form.setValue(name, String(value), { shouldValidate: true });
      filled.add(name);
    };
    put("amount", f.totalAmountPayable ?? f.currentAmount);
    put("billDate", f.issueDate);
    put("referenceNumber", f.billNumber);
    put("consumerNumber", f.consumerNumber);
    put("meterNumber", f.meterNumber);
    put("unitsKwh", f.unitsKwh);
    put("currentPeriodAmount", f.currentAmount);
    put("previousBillAmount", f.previousBillAmount ?? f.previousOutstanding);
    setAutofilled(filled);
    // For unscheduled bills the extracted billing month overrides the picks.
    if (selection === OTHER && f.billingMonth && f.billingYear) {
      setAdHocMonth(String(f.billingMonth));
      setAdHocYear(String(f.billingYear));
    }
  };

  const runScan = async (uploaded: UploadedFile) => {
    if (!uploaded.file) return;
    setScanning(true);
    setScanError(null);
    try {
      const result = await documentService.scan(uploaded.file, {
        dealershipId: dealershipId || undefined,
        categoryId: categoryId || undefined,
        scheduleId: selectedTask?.id,
      });
      setScan(result);
      if (result.status === "failed") {
        setScanError(
          result.warnings[0] ??
            "Could not read this document — you can still enter the details manually."
        );
      } else {
        applyScan(result);
        if (result.status === "partial") {
          toast.warning("Some fields could not be read — check the highlighted inputs.");
        } else {
          toast.success("Bill scanned — review the extracted values below.");
        }
      }
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Scanning failed. Try again.");
    } finally {
      setScanning(false);
    }
  };

  const onFile = (f: UploadedFile | null) => {
    setFile(f);
    if (!f) {
      setScan(null);
      setScanError(null);
      setAutofilled(new Set());
      return;
    }
    setFileError(null);
    void runScan(f);
  };

  const previewDocument = async () => {
    try {
      const url = scan
        ? await documentService.documentUrl(scan.id)
        : file?.previewUrl;
      if (url) window.open(url, "_blank", "noopener");
    } catch {
      toast.error("Could not open the document preview.");
    }
  };

  const goToDetails = () => {
    if (!dealershipId) {
      setStepError("Select a dealership first.");
      return;
    }
    if (!selection) {
      setStepError("Select a scheduled bill, or choose “Other / unscheduled bill”.");
      return;
    }
    if (selection === OTHER && !adHocCategoryId) {
      setStepError("Select a category for this unscheduled bill.");
      return;
    }
    setStepError(null);
    setStep(2);
  };

  const onSubmit = async (values: DetailsValues) => {
    if (!user) return;
    if (!file && !scan) {
      setFileError("Attach the bill document before submitting.");
      return;
    }
    const input: BillSubmitInput = {
      scheduleId: selectedTask?.id,
      dealershipId,
      categoryId,
      amount: Number(values.amount),
      billDate: new Date(values.billDate).toISOString(),
      billingPeriod: period,
      referenceNumber: values.referenceNumber?.trim() || undefined,
      file: file?.file,
      fileName: file?.name ?? scan?.fileName ?? "",
      fileType: file?.type ?? scan?.fileType ?? "pdf",
      fileSizeKb: file?.sizeKb ?? scan?.fileSizeKb ?? 0,
      scanId: scan?.id,
      consumerNumber: values.consumerNumber?.trim() || undefined,
      meterNumber: values.meterNumber?.trim() || undefined,
      unitsKwh: values.unitsKwh ? Number(values.unitsKwh) : undefined,
      currentPeriodAmount: values.currentPeriodAmount ? Number(values.currentPeriodAmount) : undefined,
      previousBillAmount: values.previousBillAmount ? Number(values.previousBillAmount) : undefined,
    };
    try {
      const created = await billService.submit(input, user);
      toast.success(`Bill submitted for review (${created.billReference ?? "uploaded"}).`);
      navigate("/accountant/submissions");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit the bill.");
    }
  };

  const autoMark = (name: ScanField) => (
    <AutoFilledMark
      filled={autofilled.has(name)}
      dirty={dirty[name] === true || dirty[name] !== undefined}
      confidence={undefined}
    />
  );

  const taskCardClass = (active: boolean) =>
    cn(
      "flex w-full items-center justify-between gap-3 rounded-lg border bg-white p-3 text-left transition-colors",
      active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:border-slate-400"
    );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Submit a bill"
        description="Scan a bill to auto-fill the details, or enter them manually."
      />

      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>New bill submission</CardTitle>
              <CardDescription>
                {step === 1
                  ? "Choose the scheduled bill you are submitting for."
                  : "Scan the document, review the extracted values, then submit."}
              </CardDescription>
            </div>
            <StepIndicator step={step} />
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Dealership</Label>
                <Select
                  value={dealershipId}
                  onValueChange={(v) => {
                    setDealershipId(v);
                    setSelection("");
                    setStepError(null);
                  }}
                  disabled={dealerships.loading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={dealerships.loading ? "Loading…" : "Select a dealership"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(dealerships.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} · {d.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {dealershipId && (
                <div className="space-y-1.5">
                  <Label>Scheduled bill</Label>
                  {tasks.loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-14" />
                      <Skeleton className="h-14" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {openTasks.length === 0 && (
                        <EmptyState
                          compact
                          title="Nothing scheduled"
                          description="There are no unsubmitted scheduled bills for this dealership."
                        />
                      )}
                      {openTasks.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setSelection(t.id);
                            setStepError(null);
                          }}
                          className={taskCardClass(selection === t.id)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {t.categoryName} —{" "}
                              {monthLabel(t.billingPeriod.month, t.billingPeriod.year)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              due {formatDate(t.submissionDeadline)}
                            </p>
                          </div>
                          <ScheduleStatusBadge status={t.status} />
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelection(OTHER);
                          setStepError(null);
                        }}
                        className={taskCardClass(selection === OTHER)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <FilePlus2 className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-medium">Other / unscheduled bill</p>
                            <p className="text-xs text-muted-foreground">
                              Submit a bill that is not on the schedule.
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selection === OTHER && (
                <div className="grid gap-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={adHocCategoryId} onValueChange={setAdHocCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {(categories.data ?? [])
                          .filter((c) => c.active)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Billing month</Label>
                    <Select value={adHocMonth} onValueChange={setAdHocMonth}>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTH_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Billing year</Label>
                    <Select value={adHocYear} onValueChange={setAdHocYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {stepError && (
                <p className="text-xs font-medium text-destructive">{stepError}</p>
              )}

              <Button onClick={goToDetails} className="w-full">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                {/* ---- Scan & attach ---- */}
                <div className="space-y-1.5">
                  <Label>
                    Bill document
                    {scan && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        scanned via{" "}
                        {scan.extractionMethod === "pdf_text"
                          ? "PDF text"
                          : scan.extractionMethod?.includes("ocr")
                            ? "OCR"
                            : "upload"}
                      </span>
                    )}
                  </Label>
                  <FileUpload
                    value={file}
                    onChange={onFile}
                    disabled={submitting || scanning}
                  />
                  {scanning && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Scanning the document — extracting bill fields…
                    </p>
                  )}
                  {fileError && (
                    <p className="text-xs font-medium text-destructive">{fileError}</p>
                  )}
                </div>

                {/* ---- Scan result banner ---- */}
                {scan && !scanning && (
                  <div
                    className={cn(
                      "space-y-2 rounded-lg border p-3 text-sm",
                      scan.status === "failed"
                        ? "border-red-200 bg-red-50"
                        : scan.status === "partial"
                          ? "border-amber-200 bg-amber-50"
                          : "border-emerald-200 bg-emerald-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-2 font-medium">
                        <ScanLine className="h-4 w-4" />
                        {scan.status === "failed"
                          ? "Scan failed — enter the bill manually or try another file"
                          : scan.status === "partial"
                            ? "Scan needs review — some fields are missing"
                            : "Bill scanned — values auto-filled below"}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={previewDocument}
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => file && void runScan(file)}
                          disabled={scanning}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Rescan
                        </Button>
                      </div>
                    </div>
                    {(scan.warnings.length > 0 || scanError) && (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {scanError && (
                          <li className="flex items-start gap-1.5 text-red-700">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {scanError}
                          </li>
                        )}
                        {scan.warnings.map((w, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" /> {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {scanError && !scan && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {scanError}
                  </div>
                )}

                {/* ---- Amounts ---- */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Total payable amount {autoMark("amount")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currentPeriodAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Current period charges (excl. arrears) {autoMark("currentPeriodAmount")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="previousBillAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Previous bill amount {autoMark("previousBillAmount")}
                        </FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="Optional" {...field} />
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
                        <FormLabel>Bill issue date {autoMark("billDate")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* ---- Identity / consumption ---- */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="consumerNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consumer / K-number {autoMark("consumerNumber")}</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 123456789012" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bill / reference no. {autoMark("referenceNumber")}</FormLabel>
                        <FormControl>
                          <Input placeholder="Invoice or bill number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="meterNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meter number {autoMark("meterNumber")}</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unitsKwh"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Units consumed (kWh) {autoMark("unitsKwh")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" min="0" placeholder="Optional" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Review panel */}
                <div className="rounded-lg border bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Review submission
                    </p>
                    {budgetStatus && (
                      <Badge variant="outline" className={BUDGET_BADGE[budgetStatus]?.className}>
                        {BUDGET_BADGE[budgetStatus]?.label ?? budgetStatus}
                      </Badge>
                    )}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <SummaryRow label="Dealership" value={dealership?.name ?? "—"} />
                    <SummaryRow label="Category" value={category?.name ?? "—"} />
                    <SummaryRow
                      label="Billing period"
                      value={monthLabel(period.month, period.year)}
                    />
                    <SummaryRow
                      label="Amount payable"
                      value={watchedAmount ? formatCurrency(Number(watchedAmount)) : "—"}
                    />
                    <SummaryRow
                      label="Current period"
                      value={
                        watchedCurrentAmount ? formatCurrency(Number(watchedCurrentAmount)) : "—"
                      }
                    />
                    <SummaryRow
                      label="Previous bill"
                      value={watchedPrevAmount ? formatCurrency(Number(watchedPrevAmount)) : "—"}
                    />
                    <SummaryRow label="Consumer no." value={watchedConsumer || "—"} />
                    <SummaryRow
                      label="Units"
                      value={watchedUnits ? `${watchedUnits} kWh` : "—"}
                    />
                    <SummaryRow
                      label="Bill date"
                      value={watchedBillDate ? formatDate(watchedBillDate) : "—"}
                    />
                    <SummaryRow label="Reference" value={watchedReference || "—"} />
                    <div className="col-span-2">
                      <SummaryRow label="Document" value={file?.name ?? scan?.fileName ?? "—"} />
                    </div>
                  </dl>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={submitting}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button type="submit" disabled={submitting || scanning}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      "Submit bill"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
