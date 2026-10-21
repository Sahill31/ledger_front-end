import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Building2, Loader2, Mail, MapPin, Users } from "lucide-react";
import { accountService } from "@/services/account.service";
import { dealershipService } from "@/services/dealership.service";
import { useAuth } from "@/features/auth/auth-context";
import { useAsyncData } from "@/hooks/use-async-data";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  title: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

interface AdminPrefs {
  emailOnSubmission: boolean;
  weeklyDigest: boolean;
  compactTables: boolean;
}

const PREFS_KEY = "autoledger.admin.prefs";
const DEFAULT_PREFS: AdminPrefs = {
  emailOnSubmission: true,
  weeklyDigest: false,
  compactTables: false,
};

function loadPrefs(): AdminPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<AdminPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [prefs, setPrefs] = React.useState<AdminPrefs>(loadPrefs);

  const dealerships = useAsyncData(() => dealershipService.list(), []);
  const accountants = useAsyncData(() => accountService.listAccountants(), []);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: "",
      title: user?.title ?? "",
    },
  });
  const saving = form.formState.isSubmitting;

  if (!user) return null;

  const onSubmit = async (values: ProfileValues) => {
    try {
      await accountService.updateProfile(user.id, {
        name: values.name.trim(),
        phone: values.phone?.trim() || undefined,
        title: values.title?.trim() || undefined,
      });
      toast.success("Profile updated.");
      refreshUser();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update profile.");
    }
  };

  const savePrefs = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    toast.success("Preferences saved");
  };

  const prefRow = (
    key: keyof AdminPrefs,
    title: string,
    description: string
  ) => (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={prefs[key]}
        onCheckedChange={(checked) => setPrefs((p) => ({ ...p, [key]: checked }))}
        aria-label={title}
      />
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Manage your profile, organization details and workspace preferences."
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your administrator account details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-base">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-base font-semibold">{user.name}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="info" className="capitalize">{user.role}</Badge>
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </div>
                </div>
              </div>

              <Separator />

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" {...field} />
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
                          <Input type="tel" autoComplete="tel" placeholder="(555) 010-2030" {...field} />
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
                          <Input placeholder="Finance Director" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <Label>Email address</Label>
                    <Input value={user.email} disabled readOnly />
                    <p className="text-xs text-muted-foreground">
                      Email and role are managed by the organization.
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      Save changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization */}
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Summary of the AutoLedger workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <div className="flex items-center justify-between py-3.5">
                  <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" /> Organization name
                  </dt>
                  <dd className="text-sm font-medium">AutoLedger Group</dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" /> Dealerships
                  </dt>
                  <dd className="text-sm font-medium">
                    {dealerships.loading ? (
                      <Skeleton className="h-4 w-8" />
                    ) : (
                      `${dealerships.data?.length ?? 0} rooftops`
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> Accountants
                  </dt>
                  <dd className="text-sm font-medium">
                    {accountants.loading ? (
                      <Skeleton className="h-4 w-8" />
                    ) : (
                      `${accountants.data?.length ?? 0} active seats`
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" /> Billing contact
                  </dt>
                  <dd className="text-sm font-medium">finance@autoledger.com</dd>
                </div>
                <div className="flex items-center justify-between py-3.5">
                  <dt className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" /> Headquarters
                  </dt>
                  <dd className="text-sm font-medium">1200 Riverside Drive, Portland OR</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>
                Notification and display preferences for this workspace. Stored locally.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {prefRow(
                  "emailOnSubmission",
                  "Email notifications for new submissions",
                  "Receive an email each time an accountant submits a bill for review."
                )}
                {prefRow(
                  "weeklyDigest",
                  "Weekly digest",
                  "A Monday-morning summary of spend, overdue bills and budget exceptions."
                )}
                {prefRow(
                  "compactTables",
                  "Compact tables",
                  "Reduce row padding in data tables to show more records per page."
                )}
              </div>
              <div className="mt-4">
                <Button onClick={savePrefs}>Save preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
