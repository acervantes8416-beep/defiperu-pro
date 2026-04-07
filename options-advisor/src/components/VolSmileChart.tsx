import { useMarketStore } from "@/store/marketStore";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { calcVolSmile } from "@/lib/maxPain";

const COLORS = ["#3b82f6", "#00d4aa", "#f59e0b"];

export default function VolSmileChart() {
  const { options, spot, expiries, maxPain } = useMarketStore();

  // Build smile data for up to 3 nearest expiries
  const nearExpiries = expiries.slice(0, 3);
  const smiles = nearExpiries.map((exp) => calcVolSmile(options, exp, spot));

  // Merge into unified dataset by strike
  const allStrikes = new Set<number>();
  smiles.forEach((s) => s.smileData.forEach((d) => allStrikes.add(d.strike)));
  const strikes = [...allStrikes].sort((a, b) => a - b);

  // Filter to reasonable range around spot
  const filtered = strikes.filter((k) => k >= spot * 0.7 && k <= spot * 1.3);

  const chartData = filtered.map((strike) => {
    const row: any = { strike };
    smiles.forEach((s, i) => {
      const pt = s.smileData.find((d) => d.strike === strike);
      row[`iv${i}`] = pt?.callIV || pt?.putIV || null;
    });
    return row;
  });

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Volatility Smile</h3>
        <div className="flex gap-3 text-xs">
          {nearExpiries.map((exp, i) => (
            <span key={exp} className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ background: COLORS[i] }} />
              <span className="text-text-muted">{exp}</span>
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="strike" stroke="#6b7280" fontSize={10}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <YAxis stroke="#6b7280" fontSize={10} tickFormatter={(v) => `${v.toFixed(0)}%`} />
          <Tooltip
            contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => [`${v?.toFixed(1)}%`, "IV"]}
            labelFormatter={(v) => `Strike $${Number(v).toLocaleString()}`}
          />
          {spot > 0 && <ReferenceLine x={spot} stroke="#e5e7eb" strokeDasharray="4 4" label={{ value: "Spot", fill: "#9ca3af", fontSize: 10 }} />}
          {maxPain.maxPainStrike > 0 && <ReferenceLine x={maxPain.maxPainStrike} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "MaxPain", fill: "#f59e0b", fontSize: 10 }} />}
          {nearExpiries.map((_, i) => (
            <Line key={i} type="monotone" dataKey={`iv${i}`} stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
