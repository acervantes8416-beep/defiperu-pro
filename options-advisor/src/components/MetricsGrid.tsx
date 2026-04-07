import { useMarketStore } from "@/store/marketStore";
import clsx from "clsx";

function Chip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg-surface border border-gray-800 rounded-xl p-3.5">
      <div className="text-text-muted text-[10px] uppercase tracking-wider mb-1 font-display">{label}</div>
      <div className={clsx("text-base font-bold font-mono", color || "text-white")}>{value}</div>
    </div>
  );
}

export default function MetricsGrid() {
  const { spot, rsi14, trend, pcr, maxPain, smile, asset } = useMarketStore();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
      <Chip label={`${asset} Spot`} value={spot > 0 ? `$${spot.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} />
      <Chip label="RSI (14)" value={rsi14 != null ? rsi14.toFixed(1) : "—"}
        color={rsi14 != null ? (rsi14 > 70 ? "text-accent-red" : rsi14 < 30 ? "text-accent-green" : "text-accent-yellow") : undefined} />
      <Chip label="EMA Trend" value={trend}
        color={trend === "BULLISH" ? "text-accent-green" : trend === "BEARISH" ? "text-accent-red" : "text-accent-yellow"} />
      <Chip label="PCR (OI)" value={pcr.pcrOI > 0 ? pcr.pcrOI.toFixed(2) : "—"}
        color={pcr.pcrOI > 1.2 ? "text-accent-red" : pcr.pcrOI > 0 && pcr.pcrOI < 0.7 ? "text-accent-green" : undefined} />
      <Chip label="Max Pain" value={maxPain.maxPainStrike > 0 ? `$${maxPain.maxPainStrike.toLocaleString()}` : "—"} />
      <Chip label="Pain Δ%" value={maxPain.distancePct !== 0 ? `${maxPain.distancePct > 0 ? "+" : ""}${maxPain.distancePct}%` : "—"}
        color={maxPain.distancePct > 0 ? "text-accent-green" : maxPain.distancePct < 0 ? "text-accent-red" : undefined} />
      <Chip label="ATM IV%" value={smile.atmIV > 0 ? `${smile.atmIV}%` : "—"} color="text-accent-yellow" />
      <Chip label="IV Skew" value={smile.skew !== 0 ? `${smile.skew > 0 ? "+" : ""}${smile.skew}` : "—"}
        color={smile.skew > 5 ? "text-accent-red" : smile.skew < -5 ? "text-accent-green" : undefined} />
    </div>
  );
}
