"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface Props {
  data: number[];
  title?: string;
  height?: number;
}

export default function EquityCurve({ data, title = "Equity Curve", height = 300 }: Props) {
  const chartData = data.map((value, i) => ({ index: i, value }));
  const isProfit = data.length > 1 && data[data.length - 1] >= data[0];
  const color = isProfit ? "#00d4aa" : "#ff4757";

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="index" hide />
          <YAxis
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
            stroke="#6b7280"
            fontSize={12}
          />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px" }}
            labelStyle={{ color: "#9ca3af" }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Equity"]}
          />
          <Area type="monotone" dataKey="value" stroke={color} fill="url(#equityGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
