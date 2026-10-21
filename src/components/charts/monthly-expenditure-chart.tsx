import { formatCompact } from "@/lib/format";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TrendPoint {
  month: number;
  label: string;
  /** null when no budget is configured for that month — not a zero budget. */
  budget?: number | null;
  /** Approved expenditure (dashboard passes `total` instead). */
  actual?: number;
  total?: number;
  pending?: number;
}

/**
 * Monthly expenditure trend — approved + pending stacked bars, with the
 * configured budget overlaid as a line where it exists.
 */
export function MonthlyExpenditureChart({ data }: { data: TrendPoint[] }) {
  const normalized = data.map((d) => ({ ...d, actual: d.actual ?? d.total ?? 0 }));
  const hasBudget = normalized.some((d) => (d.budget ?? 0) > 0);
  const hasPending = normalized.some((d) => (d.pending ?? 0) > 0);
  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={normalized} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickFormatter={(v: number) => formatCompact(v)}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.12)" }}
          formatter={(value, name) => [
            formatCompact(Number(value)),
            name === "actual" ? "Approved" : name === "pending" ? "Pending review" : "Budget",
          ]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        {(hasBudget || hasPending) && (
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v: string) => (
              <span className="text-xs text-slate-600">
                {v === "actual" ? "Approved" : v === "pending" ? "Pending review" : "Budget"}
              </span>
            )}
          />
        )}
        <Bar dataKey="actual" stackId="spend" fill="#2563eb" radius={[5, 5, 0, 0]} maxBarSize={36} name="actual" />
        {hasPending && (
          <Bar dataKey="pending" stackId="spend" fill="#f59e0b" radius={[5, 5, 0, 0]} maxBarSize={36} name="pending" />
        )}
        {hasBudget && (
          <Line
            type="monotone"
            dataKey="budget"
            stroke="#64748b"
            strokeDasharray="6 4"
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls={false}
            name="budget"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
