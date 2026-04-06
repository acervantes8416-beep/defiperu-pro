"use client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import clsx from "clsx";

interface PhaseData {
  phase: "ALCISTA" | "BAJISTA" | "LATERAL";
  description: string;
  strategy: string;
  fearGreed: number;
  btcDominance: number;
}

async function fetchPhase(): Promise<PhaseData> {
  const [fngRes, globalRes] = await Promise.allSettled([
    fetch("https://api.alternative.me/fng/?limit=1").then((r) => r.json()),
    fetch("https://api.coingecko.com/api/v3/global").then((r) => r.json()),
  ]);

  let fng = 50, btcDom = 52;
  if (fngRes.status === "fulfilled") fng = parseInt(fngRes.value.data?.[0]?.value || "50");
  if (globalRes.status === "fulfilled") btcDom = globalRes.value.data?.market_cap_percentage?.btc || 52;

  let phase: "ALCISTA" | "BAJISTA" | "LATERAL" = "LATERAL";
  let description = "";
  let strategy = "";

  if (btcDom < 45 && fng > 60) {
    phase = "ALCISTA";
    description = "El mercado muestra señales alcistas. La dominancia de Bitcoin es baja, indicando que el capital fluye hacia altcoins. El sentimiento general es de codicia — buen momento para mantener posiciones.";
    strategy = "Trend Following activo — buscando oportunidades de compra en activos con momentum positivo.";
  } else if (btcDom > 55 && fng < 30) {
    phase = "BAJISTA";
    description = "El mercado muestra señales bajistas. Los inversores buscan refugio en Bitcoin y el miedo domina. Momento de cautela y protección de capital.";
    strategy = "Protección activada — reduciendo altcoins y aumentando reserva USDT según tu perfil.";
  } else {
    phase = "LATERAL";
    description = "El mercado no tiene una tendencia clara. Los indicadores muestran señales mixtas. El sistema espera confirmación antes de tomar posiciones grandes.";
    strategy = "Mean Reversion activo — aprovechando rangos de precio con operaciones conservadoras.";
  }

  return { phase, description, strategy, fearGreed: fng, btcDominance: Math.round(btcDom * 100) / 100 };
}

export default function MarketPhaseCard() {
  const { data } = useAutoRefresh(fetchPhase, 60);

  if (!data) {
    return (
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5 animate-pulse">
        <div className="h-20 bg-gray-700/50 rounded" />
      </div>
    );
  }

  const config = {
    ALCISTA: { icon: TrendingUp, bg: "bg-accent-green/5", border: "border-accent-green/30", text: "text-accent-green", glow: "glow-green" },
    BAJISTA: { icon: TrendingDown, bg: "bg-accent-red/5", border: "border-accent-red/30", text: "text-accent-red", glow: "glow-red" },
    LATERAL: { icon: Minus, bg: "bg-accent-yellow/5", border: "border-accent-yellow/30", text: "text-accent-yellow", glow: "" },
  }[data.phase];
  const Icon = config.icon;

  return (
    <div className={clsx("border rounded-xl p-5", config.bg, config.border, config.glow)}>
      <div className="flex items-start gap-4">
        <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", config.bg, "border", config.border)}>
          <Icon size={24} className={config.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className={clsx("text-xl font-bold", config.text)}>
              Mercado {data.phase}
            </h3>
            <span className="text-xs text-text-muted bg-bg/50 px-2 py-0.5 rounded-full">
              F&G: {data.fearGreed} · BTC Dom: {data.btcDominance}%
            </span>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed mb-2">{data.description}</p>
          <div className="flex items-center gap-2 text-xs">
            <Zap size={12} className={config.text} />
            <span className={config.text + " font-medium"}>{data.strategy}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
