import { useMarketStore } from "@/store/marketStore";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { calcVolSmile } from "@/lib/maxPain";

const COLORS = ["#00d4ff", "#00ff88", "#ffcc00"];

export default function VolSmileChart() {
  const { options, spot, nearExpiries, maxPain } = useMarketStore();
  const exps = nearExpiries.slice(0, 3);
  const smiles = exps.map((e) => calcVolSmile(options, e, spot));

  const allStrikes = new Set<number>();
  smiles.forEach((s) => s.smileData.forEach((d) => allStrikes.add(d.strike)));
  const filtered = [...allStrikes].sort((a, b) => a - b).filter((k) => k >= spot * 0.7 && k <= spot * 1.3);

  const data = filtered.map((strike) => {
    const row: any = { strike };
    smiles.forEach((s, i) => {
      const pt = s.smileData.find((d) => d.strike === strike);
      row[`iv${i}`] = pt?.callIV || pt?.putIV || null;
    });
    return row;
  });

  // Display labels from expiryRaw
  const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const displayLabel = (raw: string) => {
    const d = raw.slice(6, 8);
    const m = MONTHS[parseInt(raw.slice(4, 6)) - 1] || "?";
    return `${d}${m}`;
  };

  return (
    <div className="bg-bg-surface border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-display font-bold text-sm">VOLATILITY SMILE</h3>
        <div className="flex gap-3 text-[10px] font-mono">
          {exps.map((e, i) => (
            <span key={e} className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 rounded-full inline-block" style={{ background: COLORS[i] }} />
              <span className="text-text-muted">{displayLabel(e)}</span>
            </span>
          ))}
        </div>
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" />
            <XAxis dataKey="strike" stroke="#6b7280" fontSize={9} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <YAxis stroke="#6b7280" fontSize={9} tickFormatter={(v) => `${v?.toFixed(0)}%`} />
            <Tooltip
              contentStyle={{ background: "#0f1623", border: "1px solid #374151", borderRadius: 8, fontSize: 11, fontFamily: "JetBrains Mono" }}
              formatter={(v: number) => [`${v?.toFixed(1)}%`, "IV"]}
              labelFormatter={(v) => `Strike $${Number(v).toLocaleString()}`} />
            {spot > 0 && <ReferenceLine x={spot} stroke="#e5e7eb" strokeDasharray="4 4" />}
            {maxPain.maxPainStrike > 0 && <ReferenceLine x={maxPain.maxPainStrike} stroke="#ffcc00" strokeDasharray="4 4" />}
            {exps.map((_, i) => (
              <Line key={i} type="monotone" dataKey={`iv${i}`} stroke={COLORS[i]} strokeWidth={2} dot={false} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-text-muted text-sm">Cargando smile...</div>
      )}
    </div>
  );
}
