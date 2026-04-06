"use client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CountdownBadge from "@/components/common/CountdownBadge";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import clsx from "clsx";

interface MarketData {
  fearGreed: { value: number; label: string };
  btcDominance: number;
  ethDominance: number;
  phase: "ALCISTA" | "BAJISTA" | "LATERAL";
  marketCapChange: number;
}

async function fetchMarketData(): Promise<MarketData> {
  // Llamadas paralelas a las APIs
  const [fngRes, globalRes] = await Promise.allSettled([
    fetch("https://api.alternative.me/fng/?limit=1").then((r) => r.json()),
    fetch("https://api.coingecko.com/api/v3/global").then((r) => r.json()),
  ]);

  let fngValue = 50;
  let fngLabel = "Neutral";
  if (fngRes.status === "fulfilled") {
    fngValue = parseInt(fngRes.value.data?.[0]?.value || "50");
    if (fngValue <= 20) fngLabel = "Miedo Extremo";
    else if (fngValue <= 40) fngLabel = "Miedo";
    else if (fngValue <= 60) fngLabel = "Neutral";
    else if (fngValue <= 80) fngLabel = "Codicia";
    else fngLabel = "Codicia Extrema";
  }

  let btcDom = 52, ethDom = 17, mcChange = 0;
  if (globalRes.status === "fulfilled") {
    const d = globalRes.value.data;
    btcDom = d?.market_cap_percentage?.btc || 52;
    ethDom = d?.market_cap_percentage?.eth || 17;
    mcChange = d?.market_cap_change_percentage_24h_usd || 0;
  }

  let phase: "ALCISTA" | "BAJISTA" | "LATERAL" = "LATERAL";
  if (btcDom < 45 && fngValue > 60) phase = "ALCISTA";
  else if (btcDom > 55 && fngValue < 30) phase = "BAJISTA";

  return {
    fearGreed: { value: fngValue, label: fngLabel },
    btcDominance: Math.round(btcDom * 100) / 100,
    ethDominance: Math.round(ethDom * 100) / 100,
    phase,
    marketCapChange: Math.round(mcChange * 100) / 100,
  };
}

// Gauge visual del Fear & Greed
function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const color =
    value <= 20 ? "#ff4757" :
    value <= 40 ? "#ff6b81" :
    value <= 60 ? "#f59e0b" :
    value <= 80 ? "#00d4aa" : "#00ff88";

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-10 h-10">
        <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke="#374151" strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${value}, 100`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
          {value}
        </span>
      </div>
      <div>
        <div className="text-[10px] text-text-muted uppercase tracking-wide">Fear & Greed</div>
        <div className="text-xs font-semibold" style={{ color }}>{label}</div>
      </div>
    </div>
  );
}

// Badge de fase de mercado
function PhaseBadge({ phase }: { phase: "ALCISTA" | "BAJISTA" | "LATERAL" }) {
  const config = {
    ALCISTA: { icon: TrendingUp, bg: "bg-accent-green/15", border: "border-accent-green/30", text: "text-accent-green" },
    BAJISTA: { icon: TrendingDown, bg: "bg-accent-red/15", border: "border-accent-red/30", text: "text-accent-red" },
    LATERAL: { icon: Minus, bg: "bg-accent-yellow/15", border: "border-accent-yellow/30", text: "text-accent-yellow" },
  }[phase];
  const Icon = config.icon;

  return (
    <div className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl border", config.bg, config.border)}>
      <Icon size={18} className={config.text} />
      <div>
        <div className="text-[10px] text-text-muted uppercase tracking-wide">Fase del Mercado</div>
        <div className={clsx("text-sm font-bold", config.text)}>{phase}</div>
      </div>
    </div>
  );
}

export default function MarketBar() {
  const { data, countdown, loading, refresh } = useAutoRefresh(fetchMarketData, 60);

  if (!data) {
    return (
      <div className="bg-bg-card border border-gray-800 rounded-xl p-3 animate-pulse">
        <div className="h-10 bg-gray-700/50 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl px-5 py-3">
      <div className="flex items-center justify-between gap-6 flex-wrap">
        {/* Fear & Greed */}
        <FearGreedGauge value={data.fearGreed.value} label={data.fearGreed.label} />

        {/* Dominancia */}
        <div className="flex items-center gap-4">
          <div>
            <div className="text-[10px] text-text-muted uppercase tracking-wide">BTC Dom.</div>
            <div className="text-sm font-bold text-accent-yellow font-mono">{data.btcDominance}%</div>
          </div>
          <div>
            <div className="text-[10px] text-text-muted uppercase tracking-wide">ETH Dom.</div>
            <div className="text-sm font-bold text-accent-blue font-mono">{data.ethDominance}%</div>
          </div>
        </div>

        {/* Cambio market cap 24h */}
        <div>
          <div className="text-[10px] text-text-muted uppercase tracking-wide">Market Cap 24h</div>
          <div className={clsx("text-sm font-bold font-mono", data.marketCapChange >= 0 ? "text-accent-green" : "text-accent-red")}>
            {data.marketCapChange >= 0 ? "+" : ""}{data.marketCapChange}%
          </div>
        </div>

        {/* Fase de mercado */}
        <PhaseBadge phase={data.phase} />

        {/* Countdown */}
        <CountdownBadge countdown={countdown} loading={loading} onRefresh={refresh} />
      </div>
    </div>
  );
}
