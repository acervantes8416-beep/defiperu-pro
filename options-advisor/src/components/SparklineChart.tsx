import { useMarketStore } from "@/store/marketStore";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export default function SparklineChart() {
  const { closes } = useMarketStore();
  const last48 = closes.slice(-48);
  if (last48.length < 2) return null;

  const data = last48.map((v, i) => ({ i, v }));
  const first = last48[0];
  const last = last48[last48.length - 1];
  const changePct = first > 0 ? ((last - first) / first * 100) : 0;
  const color = changePct >= 0 ? "#00ff88" : "#ff3366";

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span className="text-xs font-mono" style={{ color }}>
        {changePct >= 0 ? "+" : ""}{changePct.toFixed(1)}% 14d
      </span>
    </div>
  );
}
