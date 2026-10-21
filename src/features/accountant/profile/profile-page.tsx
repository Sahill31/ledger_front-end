import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, CalendarDays, Loader2, Mail, Save } from "lucide-react";

import { useAuth } from "@/features/auth/auth-context";
import { accountService } from "@/services/account.service";
import { dealershipService } from "@/services/dealership.service";
import { useAsyncData } from "@/hooks/use-async-data";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  title: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

export default function AccountantProfilePage() {
  const { user, refreshUser } = useAuth();

  const account = useAsyncData(
    () => (user ? accountService.me() : Promise.resolve(null)),
    [user?.id]
  );
  const dealerships = useAsyncData(
    () => (user ? dealershipService.forAccountant(user.id) : Promise.resolve([])),
    [user?.id]
  );

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: "",
      title: user?.title ?? "",
    },
  });
  const submitting = form.formState.isSubmitting;

  // Populate phone/title once the full account record resolves.
  React.useEffect(() => {
    if (account.data) {
      form.reset({
        name: account.data.name,
        phone: account.data.phone ?? "",
        title: account.data.title ?? "",
      });
    }
  }, [account.data, form]);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const onSubmit = async (values: ProfileValues) => {
    try {
      await accountService.updateProfile(user.id, {
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        title: values.title?.trim() || undefined,
      });
      toast.success("Profile updated.");
      refreshUser();
      account.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update profile.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="My profile"
        description="Your account details and dealership assignments."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Identity card */}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{user.name}</p>
              {account.data?.title && (
                <p className="text-sm text-muted-foreground">{account.data.title}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info">{roleLabel}</Badge>
              <Badge variant={user.status === "active" ? "success" : "secondary"}>
                {user.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </div>
            <Separator className="my-1 w-full" />
            <div className="w-full space-y-2 text-left text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>
                  Member since {account.data ? formatDate(account.data.createdAt) : "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>
              Update your display name and contact information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="(555) 555-0100" {...field} />
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
                        <FormLabel>Job title</FormLabel>
                        <FormControl>
                          <Input placeholder="Dealership Accountant" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-1.5">
                    <Label>Email address</Label>
                    <Input value={user.email} disabled readOnly />
                    <p className="text-xs text-muted-foreground">
                      Your email and role are managed by an administrator.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      {/* Assigned dealerships */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned dealerships</CardTitle>
          <CardDescription>
            You can submit utility bills for these rooftops.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dealerships.loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (dealerships.data ?? []).length === 0 ? (
            <EmptyState
              compact
              icon={<Building2 className="h-5 w-5" />}
              title="No dealerships assigned"
              description="Contact your administrator to get assigned to a dealership."
            />
          ) : (
            <ul className="divide-y">
              {(dealerships.data ?? []).map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {d.address}, {d.city}, {d.state}
                    </p>
                  </div>
                  <Badge variant="outline">{d.code}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
