import { format, formatDistanceToNow, parseISO } from "date-fns";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return currency.format(amount);
}

export function formatCurrencyPrecise(amount: number): string {
  return currencyPrecise.format(amount);
}

export function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1000) {
    return "₹" + new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(amount);
  }
  return currency.format(amount);
}

export function formatDate(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(iso: string | Date): string {
  const d = typeof iso === "string" ? parseISO(iso) : iso;
  return format(d, "MMM d, yyyy · h:mm a");
}

export function timeAgo(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

export function monthLabel(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function monthShort(month: number, year: number): string {
  return format(new Date(year, month - 1, 1), "MMM yyyy");
}

export function fileSize(kb: number): string {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${Math.round(kb)} KB`;
}
