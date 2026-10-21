import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Loader2,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { Dealership, User } from "@/types";
import { ApiError } from "@/services/api";
import { accountService } from "@/services/account.service";
import { dealershipService } from "@/services/dealership.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong.";
}

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/\d/, "Password must contain at least one number"),
  title: z.string().optional(),
  dealershipIds: z.array(z.string()),
});
type CreateValues = z.infer<typeof createSchema>;

export default function AdminAccountsPage() {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [assignUser, setAssignUser] = React.useState<User | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = React.useState<User | null>(null);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<User | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const { data, loading, error, reload } = useAsyncData(
    () => Promise.all([accountService.listAccountants(), dealershipService.list()]),
    []
  );
  const accountants = data?.[0] ?? [];
  const dealerships = data?.[1] ?? [];

  const dealershipById = React.useMemo(
    () => new Map(dealerships.map((d) => [d.id, d])),
    [dealerships]
  );

  const handleActivate = async (u: User) => {
    try {
      await accountService.setStatus(u.id, "active");
      toast.success(`${u.name} reactivated.`);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const confirmDeactivate = async () => {
    if (!pendingDeactivate) return;
    setStatusBusy(true);
    try {
      await accountService.setStatus(pendingDeactivate.id, "inactive");
      toast.success(`${pendingDeactivate.name} deactivated.`);
      setPendingDeactivate(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setStatusBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await accountService.remove(pendingDelete.id);
      toast.success(`${pendingDelete.name} permanently deleted.`);
      setPendingDelete(null);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<User>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (u) => u.name.toLowerCase(),
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(u.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (u) => <span className="text-muted-foreground">{u.title ?? "—"}</span>,
    },
    {
      key: "dealerships",
      header: "Assigned dealerships",
      cell: (u) =>
        u.dealershipIds.length === 0 ? (
          <span className="text-xs text-muted-foreground">None</span>
        ) : (
          <div className="flex max-w-[280px] flex-wrap gap-1">
            {u.dealershipIds.map((id) => (
              <Badge key={id} variant="secondary">
                {dealershipById.get(id)?.name ?? id}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <Badge variant={u.status === "active" ? "success" : "secondary"}>
          {u.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "created",
      header: "Created",
      sortValue: (u) => u.createdAt,
      cell: (u) => <span className="text-muted-foreground">{formatDate(u.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      cell: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Account actions">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setAssignUser(u)}>
              <Building2 className="h-4 w-4" /> Manage assignments
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {u.status === "active" ? (
              <DropdownMenuItem
                onSelect={() => setPendingDeactivate(u)}
                className="text-red-600 focus:text-red-600"
              >
                <UserX className="h-4 w-4" /> Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => void handleActivate(u)}>
                <UserCheck className="h-4 w-4" /> Activate
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setPendingDelete(u)}
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
        title="Accountant accounts"
        description="Create sign-in accounts and control which dealerships each accountant covers."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> New accountant
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
        data={accountants}
        loading={loading}
        searchFn={(u) => `${u.name} ${u.email} ${u.title ?? ""}`}
        searchPlaceholder="Search accountants…"
        emptyTitle="No accountants"
        emptyDescription="Create an accountant account to delegate dealership bill submissions."
        emptyIcon={<Users className="h-5 w-5" />}
        rowKey={(u) => u.id}
      />

      {createOpen && (
        <CreateAccountantDialog
          dealerships={dealerships}
          onClose={() => setCreateOpen(false)}
          onCreated={reload}
        />
      )}

      <AssignmentsDialog
        user={assignUser}
        dealerships={dealerships}
        onClose={() => setAssignUser(null)}
        onSaved={reload}
      />

      <ConfirmDialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => { if (!open) setPendingDeactivate(null); }}
        title="Deactivate accountant"
        description={
          pendingDeactivate
            ? `${pendingDeactivate.name} will no longer be able to sign in or submit bills. Their assignments are preserved.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        loading={statusBusy}
        onConfirm={confirmDeactivate}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        title="Delete accountant permanently"
        description={
          pendingDelete
            ? `Permanently delete ${pendingDelete.name}? This cannot be undone — accounts with submitted bills or created records cannot be deleted (deactivate instead).`
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

interface CreateAccountantDialogProps {
  dealerships: Dealership[];
  onClose: () => void;
  onCreated: () => void;
}

function CreateAccountantDialog({ dealerships, onClose, onCreated }: CreateAccountantDialogProps) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", email: "", password: "", title: "", dealershipIds: [] },
  });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: CreateValues) => {
    try {
      await accountService.createAccountant({
        name: values.name,
        email: values.email,
        password: values.password,
        title: values.title?.trim() ? values.title.trim() : undefined,
        dealershipIds: values.dealershipIds,
      });
      toast.success("Accountant account created.");
      onCreated();
      onClose();
    } catch (e) {
      const fieldErrors =
        e instanceof ApiError && Array.isArray(e.details)
          ? (e.details as { field?: string; message?: string }[])
          : [];
      const formFields = new Set(["name", "email", "password", "title", "dealershipIds"]);
      let mapped = false;
      for (const d of fieldErrors) {
        const field = d.field?.split(".")[0];
        if (field && formFields.has(field) && d.message) {
          form.setError(field as keyof CreateValues, { type: "server", message: d.message });
          mapped = true;
        }
      }
      const message = errorMessage(e);
      form.setError("root", { message: mapped ? "Please fix the highlighted fields." : message });
      toast.error(mapped ? "Please fix the highlighted fields." : message);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New accountant</DialogTitle>
          <DialogDescription>
            Create a sign-in account and assign dealership coverage.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Priya Sharma" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="accountant@autoledger.com" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Title <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Senior dealership accountant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Temporary password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="At least 8 characters, incl. a letter and a number" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dealershipIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned dealerships</FormLabel>
                  <div className="max-h-44 space-y-2 overflow-y-auto rounded-md border p-3">
                    {dealerships.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No dealerships available.</p>
                    ) : (
                      dealerships.map((d) => (
                        <div key={d.id} className="flex items-center gap-2.5">
                          <Checkbox
                            id={`create-${d.id}`}
                            checked={field.value.includes(d.id)}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                checked === true
                                  ? [...field.value, d.id]
                                  : field.value.filter((id) => id !== d.id)
                              )
                            }
                          />
                          <Label
                            htmlFor={`create-${d.id}`}
                            className="flex min-w-0 flex-1 items-center justify-between gap-2 font-normal"
                          >
                            <span className="truncate">{d.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{d.code}</span>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {form.formState.errors.root.message}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface AssignmentsDialogProps {
  user: User | null;
  dealerships: Dealership[];
  onClose: () => void;
  onSaved: () => void;
}

function AssignmentsDialog({ user, dealerships, onClose, onSaved }: AssignmentsDialogProps) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setSelectedIds(user ? [...user.dealershipIds] : []);
  }, [user]);

  const toggle = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)
    );
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await accountService.setDealerships(user.id, selectedIds);
      toast.success(`Assignments updated for ${user.name}.`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={user !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage assignments</DialogTitle>
          <DialogDescription>
            {user
              ? `Choose the dealerships ${user.name} can submit and manage bills for.`
              : "Choose the dealerships for this account."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-3">
          {dealerships.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dealerships available.</p>
          ) : (
            dealerships.map((d) => (
              <div key={d.id} className="flex items-center gap-2.5">
                <Checkbox
                  id={`assign-${d.id}`}
                  checked={selectedIds.includes(d.id)}
                  onCheckedChange={(checked) => toggle(d.id, checked === true)}
                />
                <Label
                  htmlFor={`assign-${d.id}`}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 font-normal"
                >
                  <span className="truncate">{d.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{d.code}</span>
                </Label>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !user}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              "Save assignments"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
