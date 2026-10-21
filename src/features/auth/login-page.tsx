import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { authService } from "@/services/auth.service";
import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage({ admin = false }: { admin?: boolean }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = React.useState(false);
  const [forgotOpen, setForgotOpen] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}.`);
      navigate(authService.homePathFor(user.role), { replace: true });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Sign in failed.");
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <aside className="hidden w-[46%] flex-col justify-between bg-slate-900 p-10 text-slate-300 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold text-white">AutoLedger</span>
        </div>
        <div className="space-y-4">
          <h2 className="max-w-md text-3xl font-semibold leading-snug text-white">
            Utility bill management for automobile dealerships.
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            Track electricity, water, gas and service invoices across every rooftop.
            Scheduled submissions, streamlined review, and full expenditure visibility
            for your finance team.
          </p>
          <div className="flex items-center gap-2 pt-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            Role-based access for administrators and dealership accountants
          </div>
        </div>
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} AutoLedger. All rights reserved.</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Building2 className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold">AutoLedger</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {admin ? "Admin sign in" : "Sign in"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {admin
              ? "Sign in with an administrator account to open the admin console."
              : "Enter your credentials to access your accountant workspace."}
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="you@dealership.com" {...field} />
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <button
                        type="button"
                        onClick={() => setForgotOpen(true)}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="pr-10"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submitError && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    <LockKeyhole className="h-4 w-4" /> Sign in
                  </>
                )}
              </Button>
            </form>
          </Form>

        </div>
      </main>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              Password resets are handled by your organization's administrator.
              Contact <span className="font-medium">admin@autoledger.com</span> to receive a
              new temporary password.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" onClick={() => setForgotOpen(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
