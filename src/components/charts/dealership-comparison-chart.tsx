import { formatCompact } from "@/lib/format";
import type { NamedValue } from "@/services/analytics.service";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function DealershipComparisonChart({ data }: { data: NamedValue[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 56)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickFormatter={(v: number) => formatCompact(v)}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#334155" }}
        />
        <Tooltip
          cursor={{ fill: "rgba(148,163,184,0.12)" }}
          formatter={(value) => [formatCompact(Number(value)), "Expenditure"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="value" fill="#1e3a8a" radius={[0, 5, 5, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}
