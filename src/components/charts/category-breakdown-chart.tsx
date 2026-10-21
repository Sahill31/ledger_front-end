import { formatCompact } from "@/lib/format";
import type { NamedValue } from "@/services/analytics.service";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#2563eb", "#0ea5e9", "#6366f1", "#8b5cf6", "#14b8a6", "#f59e0b", "#64748b"];

export function CategoryBreakdownChart({ data }: { data: NamedValue[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">No expenditure recorded for this period.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={62}
          outerRadius={95}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [formatCompact(Number(value)), "Spend"]}
          contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          formatter={(v: string) => <span className="text-xs text-slate-600">{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
