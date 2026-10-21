import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleOff,
  CircleCheck,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Category } from "@/types";
import { categoryService } from "@/services/category.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { CategoryIcon } from "@/components/shared/category-icon";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong.";
}

const ICON_OPTIONS = [
  { value: "zap", label: "Zap / Electricity" },
  { value: "droplets", label: "Droplets / Water" },
  { value: "wifi", label: "Wifi / Internet" },
  { value: "phone", label: "Phone / Telephony" },
  { value: "flame", label: "Flame / Gas" },
  { value: "wrench", label: "Wrench / Maintenance" },
  { value: "receipt", label: "Receipt / General" },
] as const;

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  icon: z.string().min(1, "Select an icon"),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

export default function AdminCategoriesPage() {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<Category | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const { data, loading, error, reload } = useAsyncData(() => categoryService.list(), []);
  const categories = data ?? [];

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: Category) => {
    setEditing(c);
    setFormOpen(true);
  };

  const toggleActive = async (c: Category) => {
    try {
      await categoryService.update(c.id, { active: !c.active });
      toast.success(c.active ? `${c.name} deactivated.` : `${c.name} activated.`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await categoryService.remove(pendingDelete.id);
      toast.success(`${pendingDelete.name} permanently deleted.`);
      setPendingDelete(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<Category>[] = [
    {
      key: "name",
      header: "Category",
      sortValue: (c) => c.name.toLowerCase(),
      cell: (c) => (
        <div className="flex items-center gap-3">
          <CategoryIcon icon={c.icon} />
          <span className="font-medium">{c.name}</span>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      cell: (c) => (
        <span className="line-clamp-2 max-w-md text-muted-foreground">{c.description}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <Badge variant={c.active ? "success" : "secondary"}>
          {c.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "created",
      header: "Created",
      sortValue: (c) => c.createdAt,
      cell: (c) => <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      cell: (c) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Category actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => openEdit(c)}>
              <Pencil className="h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {c.active ? (
              <DropdownMenuItem
                onSelect={() => void toggleActive(c)}
                className="text-red-600 focus:text-red-600"
              >
                <CircleOff className="h-4 w-4" /> Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => void toggleActive(c)}>
                <CircleCheck className="h-4 w-4" /> Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setPendingDelete(c)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4" /> Delete permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bill categories"
        description="Utility categories used to classify scheduled and submitted bills."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New category
          </Button>
        }
      />

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={categories}
        loading={loading}
        searchFn={(c) => `${c.name} ${c.description}`}
        searchPlaceholder="Search categories…"
        emptyTitle="No categories"
        emptyDescription="Create a bill category to start scheduling utility bills."
        emptyIcon={<Receipt className="h-5 w-5" />}
        rowKey={(c) => c.id}
      />

      {formOpen && (
        <CategoryFormDialog
          category={editing}
          onClose={() => setFormOpen(false)}
          onSaved={reload}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete category permanently"
        description={
          pendingDelete
            ? `Permanently delete ${pendingDelete.name}? This cannot be undone — categories referenced by bills, schedules or budgets cannot be deleted (deactivate instead).`
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

interface CategoryFormDialogProps {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}

function CategoryFormDialog({ category, onClose, onSaved }: CategoryFormDialogProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      description: category?.description ?? "",
      icon: category?.icon ?? "receipt",
    },
  });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      if (category) {
        await categoryService.update(category.id, values);
        toast.success("Category updated.");
      } else {
        await categoryService.create(values);
        toast.success("Category created.");
      }
      onSaved();
      onClose();
    } catch (e) {
      const message = errorMessage(e);
      form.setError("name", { message });
      toast.error(message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>
            {category
              ? "Update the category name, description or icon."
              : "Add a utility category for bill classification."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Electricity" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What does this category cover?"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an icon" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ICON_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : category ? (
                  "Save changes"
                ) : (
                  "Create category"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
