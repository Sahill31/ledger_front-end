import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  CircleDollarSign,
  Loader2,
  Pencil,
  PiggyBank,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { budgetService } from "@/services/budget.service";
import { categoryService } from "@/services/category.service";
import { dealershipService } from "@/services/dealership.service";
import { useAuth } from "@/features/auth/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, monthLabel } from "@/lib/format";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
import type { BudgetRow, Category, Dealership } from "@/types";

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

const budgetSchema = z.object({
  dealershipId: z.string().min(1, "Select a dealership"),
  categoryId: z.string().min(1, "Select a category"),
  month: z.string().min(1, "Select a month"),
  year: z.string().min(1, "Select a year"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => Number.isFinite(Number(v)) && Number(v) > 0, "Enter a positive amount"),
});
type BudgetFormValues = z.infer<typeof budgetSchema>;

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetRow | null;
  dealerships: Dealership[];
  categories: Category[];
  yearOptions: number[];
  onSaved: () => void;
}

function BudgetDialog({
  open,
  onOpenChange,
  budget,
  dealerships,
  categories,
  yearOptions,
  onSaved,
}: BudgetDialogProps) {
  const { user } = useAuth();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const now = new Date();

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      dealershipId: "",
      categoryId: "",
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      amount: "",
    },
  });
  const submitting = form.formState.isSubmitting;

  React.useEffect(() => {
    if (open) {
      form.reset({
        dealershipId: budget?.dealershipId ?? "",
        categoryId: budget?.categoryId ?? "",
        month: String(budget?.month ?? now.getMonth() + 1),
        year: String(budget?.year ?? now.getFullYear()),
        amount: budget ? String(budget.amount) : "",
      });
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, budget]);

  const onSubmit = async (values: BudgetFormValues) => {
    if (!user) {
      setSubmitError("You must be signed in to manage budgets.");
      return;
    }
    setSubmitError(null);
    try {
      await budgetService.upsert(
        {
          dealershipId: values.dealershipId,
          categoryId: values.categoryId,
          month: Number(values.month),
          year: Number(values.year),
          amount: Number(values.amount),
        },
        user
      );
      toast.success("Budget saved");
      onOpenChange(false);
      onSaved();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to save budget.");
    }
  };

  const history = budget ? [...budget.history].reverse() : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{budget ? "Edit budget" : "Set budget"}</DialogTitle>
          <DialogDescription>
            {budget
              ? `Update the ${monthLabel(budget.month, budget.year)} budget for ${budget.categoryName} at ${budget.dealershipName}.`
              : "Set a monthly utility budget for a dealership and category."}
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
                    <FormLabel>Month</FormLabel>
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
                    <FormLabel>Year</FormLabel>
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
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budget amount</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {history.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Previous amounts
                </p>
                <ul className="space-y-1.5">
                  {history.map((h, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrency(h.amount)}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(h.changedAt)} · {h.changedBy}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
                ) : (
                  "Save budget"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBudgetsPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  const [dealershipId, setDealershipId] = React.useState("all");
  const [categoryId, setCategoryId] = React.useState("all");
  const [month, setMonth] = React.useState(String(now.getMonth() + 1));
  const [year, setYear] = React.useState(String(currentYear));
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BudgetRow | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<BudgetRow | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const budgets = useAsyncData(
    () =>
      budgetService.list({
        dealershipId,
        categoryId,
        month: month === "all" ? undefined : Number(month),
        year: year === "all" ? undefined : Number(year),
      }),
    [dealershipId, categoryId, month, year]
  );
  const dealerships = useAsyncData(() => dealershipService.list(), []);
  const categories = useAsyncData(() => categoryService.list(), []);

  const rows = budgets.data ?? [];
  const categoryIconById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories.data ?? []) map.set(c.id, c.icon);
    return map;
  }, [categories.data]);

  const totalBudgeted = rows.reduce((s, r) => s + r.amount, 0);
  const totalActual = rows.reduce((s, r) => s + r.actual, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);
  const overBudgetCount = rows.filter((r) => r.remaining < 0).length;

  const openEdit = (row: BudgetRow) => {
    setEditing(row);
    setDialogOpen(true);
  };
  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await budgetService.remove(pendingDelete.id);
      toast.success(`Budget for ${pendingDelete.dealershipName} deleted.`);
      setPendingDelete(null);
      budgets.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<BudgetRow>[] = [
    {
      key: "dealership",
      header: "Dealership",
      sortValue: (r) => r.dealershipName,
      cell: (r) => <span className="font-medium">{r.dealershipName}</span>,
    },
    {
      key: "category",
      header: "Category",
      sortValue: (r) => r.categoryName,
      cell: (r) => (
        <div className="flex items-center gap-2.5">
          <CategoryIcon icon={categoryIconById.get(r.categoryId) ?? "receipt"} />
          <span>{r.categoryName}</span>
        </div>
      ),
    },
    {
      key: "period",
      header: "Period",
      sortValue: (r) => r.year * 100 + r.month,
      cell: (r) => <span className="text-muted-foreground">{monthLabel(r.month, r.year)}</span>,
    },
    {
      key: "budget",
      header: "Budget",
      sortValue: (r) => r.amount,
      cell: (r) => <span className="font-medium tabular-nums">{formatCurrency(r.amount)}</span>,
    },
    {
      key: "actual",
      header: "Actual",
      sortValue: (r) => r.actual,
      cell: (r) => <span className="tabular-nums">{formatCurrency(r.actual)}</span>,
    },
    {
      key: "remaining",
      header: "Remaining",
      sortValue: (r) => r.remaining,
      cell: (r) => (
        <span className={cn("tabular-nums", r.remaining < 0 && "font-medium text-red-600")}>
          {formatCurrency(r.remaining)}
        </span>
      ),
    },
    {
      key: "utilization",
      header: "Utilization",
      sortValue: (r) => r.utilization,
      cell: (r) => (
        <div className="flex min-w-[180px] items-center gap-2">
          <Progress
            value={Math.min(100, r.utilization)}
            className="h-1.5 w-16"
            indicatorClassName={
              r.utilization > 100 ? "bg-red-500" : r.utilization >= 80 ? "bg-amber-500" : undefined
            }
          />
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(r.utilization)}%
          </span>
          {r.utilization > 100 && <Badge variant="destructive">Over budget</Badge>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[92px]",
      cell: (r) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEdit(r)}
            aria-label={`Edit budget for ${r.dealershipName}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => setPendingDelete(r)}
            aria-label={`Delete budget for ${r.dealershipName}`}
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
        title="Budgets"
        description="Set and monitor monthly utility budgets across dealerships and categories."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Set budget
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total budgeted"
          value={formatCurrency(totalBudgeted)}
          icon={<Wallet className="h-4 w-4" />}
          hint={`${rows.length} budget ${rows.length === 1 ? "line" : "lines"}`}
          loading={budgets.loading}
        />
        <StatCard
          label="Actual spend"
          value={formatCurrency(totalActual)}
          icon={<CircleDollarSign className="h-4 w-4" />}
          hint="Non-rejected bill totals"
          loading={budgets.loading}
        />
        <StatCard
          label="Remaining"
          value={formatCurrency(totalRemaining)}
          icon={<PiggyBank className="h-4 w-4" />}
          hint="Budget minus actuals"
          tone={totalRemaining < 0 ? "danger" : "default"}
          loading={budgets.loading}
        />
        <StatCard
          label="Over-budget items"
          value={overBudgetCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          hint="Lines where spend exceeds budget"
          tone={overBudgetCount > 0 ? "danger" : "default"}
          loading={budgets.loading}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={budgets.loading}
        rowKey={(r) => r.id}
        searchFn={(r) => `${r.dealershipName} ${r.categoryName}`}
        searchPlaceholder="Search budgets…"
        emptyTitle="No budgets found"
        emptyDescription="No budgets match the current filters. Set a budget to get started."
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
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Month" />
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
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All years</SelectItem>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
      />

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={editing}
        dealerships={dealerships.data ?? []}
        categories={categories.data ?? []}
        yearOptions={yearOptions}
        onSaved={budgets.reload}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete budget permanently"
        description={
          pendingDelete
            ? `Permanently delete the ${monthLabel(pendingDelete.month, pendingDelete.year)} budget for ${pendingDelete.dealershipName}? Its change history is removed too — this cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
