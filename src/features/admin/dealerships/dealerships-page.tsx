import * as React from "react";
import { Building2, Loader2, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Dealership, User } from "@/types";
import { accountService } from "@/services/account.service";
import { dealershipService } from "@/services/dealership.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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

const dealershipSchema = z.object({
  name: z.string().trim().min(2, "Dealership name is required"),
  code: z
    .string()
    .trim()
    .min(2, "A short code is required")
    .max(24)
    .regex(/^[A-Za-z0-9-]+$/, "Letters, digits and hyphens only"),
  address: z.string().trim().min(3, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().max(120),
  phone: z.string().trim().max(32),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")),
});
type DealershipFormValues = z.infer<typeof dealershipSchema>;

export default function AdminDealershipsPage() {
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Dealership | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Dealership | null>(null);

  const { data, loading, error, reload } = useAsyncData(
    () => Promise.all([dealershipService.list(), accountService.listAccountants()]),
    []
  );
  const dealerships = data?.[0] ?? [];
  const accountants = data?.[1] ?? [];

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dealerships;
    return dealerships.filter((d) =>
      `${d.name} ${d.code} ${d.city}`.toLowerCase().includes(q)
    );
  }, [dealerships, query]);

  const accountantCount = (d: Dealership) =>
    accountants.filter((a) => a.dealershipIds.includes(d.id)).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dealerships"
        description="Rooftop profiles and accountant coverage across the organization."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> New dealership
          </Button>
        }
      />

      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, code or city???"
          className="pl-8"
          aria-label="Search dealerships"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title={dealerships.length === 0 ? "No dealerships" : "No matching dealerships"}
          description={
            dealerships.length === 0
              ? "Dealerships will appear here once they are added."
              : "Try a different name, code or city."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <Card key={d.id}>
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                <div className="min-w-0 space-y-1.5">
                  <CardTitle className="truncate text-base">{d.name}</CardTitle>
                  <Badge variant="secondary">{d.code}</Badge>
                </div>
                <Badge variant={d.status === "active" ? "success" : "destructive"}>
                  {d.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    {d.address}
                    <br />
                    {d.city}, {d.state}
                  </span>
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0" />
                  {d.phone}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 shrink-0" />
                  {accountantCount(d)} assigned {accountantCount(d) === 1 ? "accountant" : "accountants"}
                </p>
                <div className="mt-1 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelected(d)}
                  >
                    View details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditing(d);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <DealershipDetailsDialog
          dealership={selected}
          accountants={accountants}
          onClose={() => setSelected(null)}
          onChanged={reload}
          onEdit={(d) => {
            setEditing(d);
            setFormOpen(true);
          }}
        />
      )}

      <DealershipFormDialog
        open={formOpen}
        dealership={editing}
        onOpenChange={setFormOpen}
        onSaved={() => {
          setFormOpen(false);
          setEditing(null);
          reload();
        }}
      />
    </div>
  );
}

interface DetailsDialogProps {
  dealership: Dealership;
  accountants: User[];
  onClose: () => void;
  onChanged: () => void;
  onEdit: (d: Dealership) => void;
}

function DealershipDetailsDialog({ dealership, accountants, onClose, onChanged, onEdit }: DetailsDialogProps) {
  const [assigneeId, setAssigneeId] = React.useState("");
  const [assigning, setAssigning] = React.useState(false);
  const [pendingUnassign, setPendingUnassign] = React.useState<User | null>(null);
  const [unassigning, setUnassigning] = React.useState(false);
  const [statusBusy, setStatusBusy] = React.useState(false);
  const [current, setCurrent] = React.useState(dealership);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await dealershipService.remove(current.id);
      toast.success(`${current.name} permanently deleted.`);
      setDeleteConfirm(false);
      onChanged();
      onClose();
    } catch (e) {
      setDeleteConfirm(false);
      toast.error(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async () => {
    const next = current.status === "active" ? "inactive" : "active";
    setStatusBusy(true);
    try {
      const updated = await dealershipService.setStatus(current.id, next);
      setCurrent(updated);
      toast.success(`${current.name} ${next === "active" ? "activated" : "deactivated"}.`);
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setStatusBusy(false);
    }
  };

  const assigned = accountants.filter((a) => a.dealershipIds.includes(dealership.id));
  const assignable = accountants.filter(
    (a) => a.status === "active" && !a.dealershipIds.includes(dealership.id)
  );

  const handleAssign = async () => {
    if (!assigneeId) return;
    setAssigning(true);
    try {
      await dealershipService.assignAccountant(dealership.id, assigneeId);
      toast.success("Accountant assigned.");
      setAssigneeId("");
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassign = async () => {
    if (!pendingUnassign) return;
    setUnassigning(true);
    try {
      await dealershipService.unassignAccountant(dealership.id, pendingUnassign.id);
      toast.success(`${pendingUnassign.name} unassigned from ${current.name}.`);
      setPendingUnassign(null);
      onChanged();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUnassigning(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>{current.name}</DialogTitle>
            <Badge variant="secondary">{current.code}</Badge>
            <Badge variant={current.status === "active" ? "success" : "destructive"}>
              {current.status === "active" ? "Active" : "Inactive"}
            </Badge>
          </div>
          <DialogDescription>Dealership profile and accountant coverage.</DialogDescription>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onEdit(current)}>
              <Pencil className="h-3.5 w-3.5" /> Edit details
            </Button>
            <Button
              variant={current.status === "active" ? "outline" : "default"}
              size="sm"
              onClick={toggleStatus}
              disabled={statusBusy}
            >
              {current.status === "active" ? "Deactivate" : "Activate"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </DialogHeader>

        <div className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Address</p>
            <p className="mt-0.5 flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {current.address}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">City / State</p>
            <p className="mt-0.5">
              {current.city}
              {current.state ? `, ${current.state}` : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
            <p className="mt-0.5 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {current.phone ?? "???"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate">
              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {current.email ?? "???"}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Assigned accountants</h3>
          {assigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accountants are assigned to this dealership.
            </p>
          ) : (
            <ul className="space-y-3">
              {assigned.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{initials(a.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={a.status === "active" ? "success" : "secondary"}>
                      {a.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setPendingUnassign(a)}
                    >
                      Unassign
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Assign accountant</h3>
          {assignable.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All active accountants are already assigned to this dealership.
            </p>
          ) : (
            <div className="flex gap-2">
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select an accountant" />
                </SelectTrigger>
                <SelectContent>
                  {assignable.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ??? {a.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssign} disabled={!assigneeId || assigning}>
                {assigning ? "Assigning???" : "Assign"}
              </Button>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={deleteConfirm}
          onOpenChange={(open) => { if (!open) setDeleteConfirm(false); }}
          title="Delete dealership permanently"
          description={`Permanently delete ${current.name}? This cannot be undone — dealerships with bills, schedules or budgets cannot be deleted (deactivate instead).`}
          confirmLabel="Delete"
          destructive
          loading={deleting}
          onConfirm={confirmDelete}
        />

        <ConfirmDialog
          open={pendingUnassign !== null}
          onOpenChange={(open) => { if (!open) setPendingUnassign(null); }}
          title="Unassign accountant"
          description={
            pendingUnassign
              ? `Remove ${pendingUnassign.name} from ${dealership.name}? They will lose access to this dealership's bills and schedules.`
              : undefined
          }
          confirmLabel="Unassign"
          destructive
          loading={unassigning}
          onConfirm={handleUnassign}
        />
      </DialogContent>
    </Dialog>
  );
}


interface FormDialogProps {
  open: boolean;
  dealership: Dealership | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function DealershipFormDialog({ open, dealership, onOpenChange, onSaved }: FormDialogProps) {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const form = useForm<DealershipFormValues>({
    resolver: zodResolver(dealershipSchema),
    defaultValues: { name: "", code: "", address: "", city: "", state: "", phone: "", email: "" },
  });
  const submitting = form.formState.isSubmitting;

  React.useEffect(() => {
    if (open) {
      form.reset(
        dealership
          ? {
              name: dealership.name,
              code: dealership.code,
              address: dealership.address,
              city: dealership.city,
              state: dealership.state ?? "",
              phone: dealership.phone ?? "",
              email: dealership.email ?? "",
            }
          : { name: "", code: "", address: "", city: "", state: "", phone: "", email: "" }
      );
      setSubmitError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dealership]);

  const onSubmit = async (values: DealershipFormValues) => {
    setSubmitError(null);
    try {
      if (dealership) {
        await dealershipService.update(dealership.id, values);
        toast.success("Dealership updated.");
      } else {
        await dealershipService.create(values);
        toast.success("Dealership created.");
      }
      onSaved();
    } catch (e) {
      setSubmitError(errorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dealership ? "Edit dealership" : "New dealership"}</DialogTitle>
          <DialogDescription>
            {dealership
              ? `Update the profile for ${dealership.name}.`
              : "Add a rooftop to the organization. Accountants can then be assigned to it."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Dealership name</FormLabel>
                    <FormControl><Input placeholder="Riverside Motors" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl><Input placeholder="RVM" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input placeholder="Mumbai" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl><Input placeholder="Street address" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State (optional)</FormLabel>
                    <FormControl><Input placeholder="Maharashtra" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl><Input placeholder="+91 22 1234 5678" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Contact email (optional)</FormLabel>
                    <FormControl><Input type="email" placeholder="office@dealership.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {submitError && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {submitError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : dealership ? (
                  "Save changes"
                ) : (
                  "Create dealership"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
