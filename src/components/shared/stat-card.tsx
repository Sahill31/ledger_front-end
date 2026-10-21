import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  hint?: string;
  tone?: "default" | "warning" | "danger" | "success";
  loading?: boolean;
}

const TONES: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  success: "bg-emerald-100 text-emerald-700",
};

export function StatCard({ label, value, icon, hint, tone = "default", loading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="mt-1.5 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          )}
          {hint && !loading && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
