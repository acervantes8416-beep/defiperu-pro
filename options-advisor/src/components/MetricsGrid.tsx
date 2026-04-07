import { useMarketStore } from "@/store/marketStore";
import clsx from "clsx";

function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl p-4">
      <div className="text-text-muted text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className={clsx("text-lg font-bold font-mono", color || "text-white")}>{value}</div>
    </div>
  );
}

export default function MetricsGrid() {
  const { spot, rsi14, trend, pcr, maxPain, smile, asset } = useMarketStore();

  const rsiColor = rsi14 === null ? undefined : rsi14 > 70 ? "text-accent-red" : rsi14 < 30 ? "text-accent-green" : "text-accent-yellow";
  const trendColor = trend === "BULLISH" ? "text-accent-green" : trend === "BEARISH" ? "text-accent-red" : "text-accent-yellow";
  const pcrColor = pcr.pcrOI > 1.2 ? "text-accent-red" : pcr.pcrOI < 0.7 ? "text-accent-green" : "text-text-primary";
  const skewColor = smile.skew > 5 ? "text-accent-red" : smile.skew < -5 ? "text-accent-green" : "text-text-primary";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      <Chip label={`${asset} Spot`} value={spot > 0 ? `$${spot.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} />
      <Chip label="RSI (14)" value={rsi14 !== null ? rsi14.toFixed(1) : "—"} color={rsiColor} />
      <Chip label="Trend EMA" value={trend} color={trendColor} />
      <Chip label="Put/Call OI" value={pcr.pcrOI > 0 ? pcr.pcrOI.toFixed(2) : "—"} color={pcrColor} />
      <Chip label="Max Pain" value={maxPain.maxPainStrike > 0 ? `$${maxPain.maxPainStrike.toLocaleString()}` : "—"} />
      <Chip label="Max Pain Δ%" value={maxPain.distancePct !== 0 ? `${maxPain.distancePct > 0 ? "+" : ""}${maxPain.distancePct}%` : "—"} color={maxPain.distancePct > 0 ? "text-accent-green" : "text-accent-red"} />
      <Chip label="ATM IV%" value={smile.atmIV > 0 ? `${smile.atmIV}%` : "—"} />
      <Chip label="IV Skew" value={smile.skew !== 0 ? `${smile.skew > 0 ? "+" : ""}${smile.skew}` : "—"} color={skewColor} />
    </div>
  );
}
