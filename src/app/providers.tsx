import { AuthProvider } from "@/features/auth/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        {children}
        <Toaster richColors closeButton />
      </AuthProvider>
    </TooltipProvider>
  );
}
