import {
  Droplets,
  Flame,
  Phone,
  Receipt,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  droplets: Droplets,
  wifi: Wifi,
  phone: Phone,
  flame: Flame,
  wrench: Wrench,
  receipt: Receipt,
};

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Receipt;
  return (
    <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary", className)}>
      <Icon className="h-4 w-4" />
    </span>
  );
}
