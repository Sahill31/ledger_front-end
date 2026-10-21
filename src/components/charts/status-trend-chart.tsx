import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  label: string;
  submitted: number;
  overdueOrMissing: number;
}

export function StatusTrendChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} allowDecimals={false} />
        <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs text-slate-600">{v}</span>} />
        <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#2563eb" fill="#2563eb" fillOpacity={0.12} strokeWidth={2} />
        <Area type="monotone" dataKey="overdueOrMissing" name="Overdue / missing" stroke="#dc2626" fill="#dc2626" fillOpacity={0.1} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
