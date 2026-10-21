import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Ban, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { scheduleService } from "@/services/schedule.service";
import { categoryService } from "@/services/category.service";
import { dealershipService } from "@/services/dealership.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, monthShort } from "@/lib/format";
import { SCHEDULE_STATUS_LABEL } from "@/lib/constants";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ScheduleStatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import type { Category, Dealership, ScheduledTask, ScheduleStatus } from "@/types";

const STATUS_ORDER: ScheduleStatus[] = ["scheduled", "due_soon", "overdue", "missing", "submitted"];

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const scheduleSchema = z.object({
  dealershipId: z.string().min(1, "Select a dealership"),
  categoryId: z.string().min(1, "Select a category"),
  month: z.string().min(1, "Select a month"),
  year: z.string().min(1, "Select a year"),
  dueDate: z.string().min(1, "Bill due date is required"),
  submissionDeadline: z.string().min(1, "Submission deadline is required"),
  recurring: z.boolean(),
  notes: z.string(),
});
type ScheduleFormValues = z.infer<typeof scheduleSchema>;

function toDateInput(iso: string): string {
  return format(parseISO(iso), "yyyy-MM-dd");
}

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ScheduledTask | null;
  dealerships: Dealership[];
  categories: Category[];
  yearOptions: number[];
  onSaved: () => void;
}

function ScheduleDialog({
  open,
  onOpenChange,
  task,
  dealerships,
  categories,
  yearOptions,
  onSaved,
}: ScheduleDialogProps) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const now = new Date();

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      dealershipId: "",
      categoryId: "",
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      dueDate: "",
      submissionDeadline: "",
      recurring: false,
      notes: "",
    },
  });
  const submitting = form.formState.isSubmitting;

  React.useEffect(() => {
    if (open) {
      form.reset({
        dealershipId: task?.dealershipId ?? "",
        categoryId: task?.categoryId ?? "",
        month: String(task?.billingPeriod.month ?? now.getMonth() + 1),
        year: String(task?.billingPeriod.year ?? now.getFullYear()),
        dueDate: task ? toDateInput(task.dueDate) : "",
        submissionDeadline: task ? toDateInput(task.submissionDeadline) : "",
        recurring: task?.recurring ?? false,
        notes: task?.notes ?? "",
      });
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const onSubmit = async (values: ScheduleFormValues) => {
    setSubmitError(null);
    try {
      await scheduleService.upsert({
        id: task?.id,
        dealershipId: values.dealershipId,
        categoryId: values.categoryId,
        billingPeriod: { month: Number(values.month), year: Number(values.year) },
        dueDate: new Date(values.dueDate).toISOString(),
        submissionDeadline: new Date(values.submissionDeadline).toISOString(),
        recurring: values.recurring,
        notes: values.notes.trim() ? values.notes.trim() : undefined,
      });
      toast.success(task ? "Schedule updated" : "Schedule created");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to save schedule.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit schedule" : "New schedule"}</DialogTitle>
          <DialogDescription>
            {task
              ? `Update the ${monthShort(task.billingPeriod.month, task.billingPeriod.year)} schedule for ${task.categoryName} at ${task.dealershipName}.`
              : "Schedule an expected utility bill for a dealership and billing period."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="dealershipId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dealership</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a dealership" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dealerships.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing month</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTH_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing year</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bill due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="submissionDeadline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submission deadline</FormLabel>
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
              name="recurring"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                  <div>
                    <FormLabel className="text-sm">Recurring monthly</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      This bill is expected every billing period.
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Vendor account details, meter notes…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {submitError && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {submitError}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : task ? (
                  "Save schedule"
                ) : (
                  "Create schedule"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSchedulesPage() {
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const [dealershipId, setDealershipId] = React.useState("all");
  const [categoryId, setCategoryId] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<ScheduleStatus | "all">("all");
  const [month, setMonth] = React.useState("all");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ScheduledTask | null>(null);
  const [deleting, setDeleting] = React.useState<ScheduledTask | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [cancelling, setCancelling] = React.useState<ScheduledTask | null>(null);
  const [cancelLoading, setCancelLoading] = React.useState(false);

  const tasksQuery = useAsyncData(
    () =>
      scheduleService.list({
        dealershipId,
        categoryId,
        month: month === "all" ? undefined : Number(month),
      }),
    [dealershipId, categoryId, month]
  );
  const dealerships = useAsyncData(() => dealershipService.list(), []);
  const categories = useAsyncData(() => categoryService.list(), []);

  const tasks = tasksQuery.data ?? [];
  const categoryIconById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories.data ?? []) map.set(c.id, c.icon);
    return map;
  }, [categories.data]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<ScheduleStatus, number> = {
      scheduled: 0,
      due_soon: 0,
      overdue: 0,
      missing: 0,
      submitted: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const t of tasks) counts[t.status] += 1;
    return counts;
  }, [tasks]);

  const visibleTasks = React.useMemo(
    () => (statusFilter === "all" ? tasks : tasks.filter((t) => t.status === statusFilter)),
    [tasks, statusFilter]
  );

  const openEdit = (task: ScheduledTask) => {
    setEditing(task);
    setDialogOpen(true);
  };
  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await scheduleService.remove(deleting.id);
      toast.success("Schedule deleted");
      setDeleting(null);
      tasksQuery.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete schedule.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelling) return;
    setCancelLoading(true);
    try {
      await scheduleService.cancel(cancelling.id);
      toast.success("Schedule cancelled");
      setCancelling(null);
      tasksQuery.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to cancel schedule.");
    } finally {
      setCancelLoading(false);
    }
  };

  const columns: DataTableColumn<ScheduledTask>[] = [
    {
      key: "dealership",
      header: "Dealership",
      sortValue: (t) => t.dealershipName,
      cell: (t) => (
        <div>
          <p className="font-medium">{t.dealershipName}</p>
          <p className="text-xs text-muted-foreground">{t.dealershipCode}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (t) => t.categoryName,
      cell: (t) => (
        <div className="flex items-center gap-2.5">
          <CategoryIcon icon={categoryIconById.get(t.categoryId) ?? "receipt"} />
          <span>{t.categoryName}</span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Billing period",
      sortValue: (t) => t.billingPeriod.year * 100 + t.billingPeriod.month,
      cell: (t) => (
        <span className="text-muted-foreground">
          {monthShort(t.billingPeriod.month, t.billingPeriod.year)}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Bill due date",
      sortValue: (t) => t.dueDate,
      cell: (t) => <span className="tabular-nums">{formatDate(t.dueDate)}</span>,
    },
    {
      key: "deadline",
      header: "Submission deadline",
      sortValue: (t) => t.submissionDeadline,
      cell: (t) => <span className="tabular-nums font-medium">{formatDate(t.submissionDeadline)}</span>,
    },
    {
      key: "recurring",
      header: "Recurring",
      cell: (t) =>
        t.recurring ? <Badge variant="info">Monthly</Badge> : <Badge variant="outline">One-off</Badge>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (t) => t.status,
      cell: (t) => <ScheduleStatusBadge status={t.status} />,
    },
    {
      key: "bill",
      header: "Submitted bill",
      sortValue: (t) => t.bill?.amount ?? -1,
      cell: (t) =>
        t.bill ? (
          <span className="tabular-nums font-medium">{formatCurrency(t.bill.amount)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[120px]",
      cell: (t) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEdit(t)}
            aria-label={`Edit schedule for ${t.dealershipName}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-amber-600"
            onClick={() => setCancelling(t)}
            aria-label={`Cancel schedule for ${t.dealershipName}`}
            disabled={t.status === "cancelled"}
          >
            <Ban className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500 hover:text-red-600"
            onClick={() => setDeleting(t)}
            aria-label={`Delete schedule for ${t.dealershipName}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bill schedules"
        description="Expected utility bills per dealership, category and billing period."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New schedule
          </Button>
        }
      />

      {/* Status summary chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            statusFilter === "all"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          )}
        >
          All · {tasks.length}
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter((cur) => (cur === s ? "all" : s))}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              statusFilter === s
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {SCHEDULE_STATUS_LABEL[s]} · {statusCounts[s]}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={visibleTasks}
        loading={tasksQuery.loading}
        rowKey={(t) => t.id}
        searchFn={(t) => `${t.dealershipName} ${t.dealershipCode} ${t.categoryName}`}
        searchPlaceholder="Search schedules…"
        emptyTitle="No schedules found"
        emptyDescription="No bill schedules match the current filters."
        toolbar={
          <>
            <Select value={dealershipId} onValueChange={setDealershipId}>
              <SelectTrigger className="w-[170px]">
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
              <SelectTrigger className="w-[150px]">
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
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ScheduleStatus | "all")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SCHEDULE_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[130px]">
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
        }
      />

      <ScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        dealerships={dealerships.data ?? []}
        categories={categories.data ?? []}
        yearOptions={yearOptions}
        onSaved={tasksQuery.reload}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete schedule permanently?"
        description={
          deleting
            ? `This will permanently remove the ${monthShort(deleting.billingPeriod.month, deleting.billingPeriod.year)} ${deleting.categoryName} schedule for ${deleting.dealershipName}. Schedules with submitted bills cannot be deleted — cancel them instead.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
        title="Cancel schedule?"
        description={
          cancelling
            ? `Cancel the ${monthShort(cancelling.billingPeriod.month, cancelling.billingPeriod.year)} ${cancelling.categoryName} schedule for ${cancelling.dealershipName}? The schedule stays on record as cancelled.`
            : undefined
        }
        confirmLabel="Cancel schedule"
        destructive
        loading={cancelLoading}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
