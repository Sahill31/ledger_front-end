import { formatCompact } from "@/lib/format";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  name: string;
  budget: number;
  actual: number;
}

export function BudgetVsActualChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No budget data for the selected period.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickFormatter={(v: number) => formatCompact(v)}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.12)" }}
          formatter={(value, name) => [formatCompact(Number(value)), name === "budget" ? "Budget" : "Actual"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs text-slate-600">{v === "budget" ? "Budget" : "Actual"}</span>} />
        <Bar dataKey="budget" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="actual" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
