"use client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CountdownBadge from "@/components/common/CountdownBadge";
import { ArrowRight, TrendingUp, TrendingDown, AlertTriangle, Zap } from "lucide-react";
import clsx from "clsx";

type CyclePhase = "panic" | "btc_accumulation" | "eth_rotation" | "altseason" | "exit";

interface DominanceData {
  btcDom: number;
  ethDom: number;
  othersDom: number;
  usdtDom: number;
  btcChange7d: number;
  ethChange7d: number;
  cyclePhase: CyclePhase;
  interpretation: string;
  recommendation: string;
}

const cycleConfig: Record<CyclePhase, { label: string; color: string; icon: typeof TrendingUp; step: number }> = {
  panic:             { label: "Pánico", color: "text-accent-red", icon: AlertTriangle, step: 0 },
  btc_accumulation:  { label: "Fase 1: Acumulación BTC", color: "text-accent-yellow", icon: TrendingUp, step: 1 },
  eth_rotation:      { label: "Fase 2: Rotación a ETH", color: "text-accent-blue", icon: ArrowRight, step: 2 },
  altseason:         { label: "Fase 3: Altseason", color: "text-accent-purple", icon: Zap, step: 3 },
  exit:              { label: "Salida del mercado", color: "text-accent-red", icon: TrendingDown, step: 4 },
};

async function fetchDominance(): Promise<DominanceData> {
  const [globalRes, btcRes, ethRes] = await Promise.allSettled([
    fetch("https://api.coingecko.com/api/v3/global").then((r) => r.json()),
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_7d_change=true").then((r) => r.json()),
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_7d_change=true").then((r) => r.json()),
  ]);

  let btcDom = 52, ethDom = 17;
  if (globalRes.status === "fulfilled") {
    const d = globalRes.value.data;
    btcDom = d?.market_cap_percentage?.btc || 52;
    ethDom = d?.market_cap_percentage?.eth || 17;
  }
  const othersDom = Math.max(0, 100 - btcDom - ethDom - 5); // ~5% stablecoins
  const usdtDom = 5;

  let btcChange7d = 0, ethChange7d = 0;
  if (btcRes.status === "fulfilled") btcChange7d = btcRes.value?.bitcoin?.usd_7d_change || 0;
  if (ethRes.status === "fulfilled") ethChange7d = ethRes.value?.ethereum?.usd_7d_change || 0;

  const btcDomUp = btcDom > 50;
  const btcPriceDown = btcChange7d < -3;
  const btcPriceUp = btcChange7d > 3;
  const ethUp = ethChange7d > 5;
  const btcDomDown = btcDom < 48;

  let cyclePhase: CyclePhase = "btc_accumulation";
  let interpretation = "";
  let recommendation = "";

  if (btcDomUp && btcPriceDown) {
    cyclePhase = "panic";
    interpretation = "El capital busca refugio en Bitcoin mientras los precios bajan. Los inversores están en modo pánico y venden altcoins.";
    recommendation = "Esperar. No comprar aún. Observar si BTC encuentra soporte.";
  } else if (btcDomUp && btcPriceUp) {
    cyclePhase = "btc_accumulation";
    interpretation = "Bitcoin lidera la subida. Es la primera fase del ciclo alcista. El dinero entra al mercado vía BTC.";
    recommendation = "Acumular BTC. Es el momento más seguro del ciclo para entrar.";
  } else if (btcDomDown && ethUp) {
    cyclePhase = "eth_rotation";
    interpretation = "El capital rota de BTC hacia ETH. Ethereum está ganando fuerza. Se acerca la fase de altcoins.";
    recommendation = "Rotar parte de BTC a ETH. Preparar posiciones en altcoins sólidas.";
  } else if (btcDomDown && !ethUp) {
    cyclePhase = "altseason";
    interpretation = "Las altcoins están subiendo más que BTC y ETH. Es la fase de máxima euforia del mercado. Alto riesgo de corrección.";
    recommendation = "Tomar ganancias parciales. No perseguir subidas. Preparar plan de salida.";
  }

  if (usdtDom > 8) {
    cyclePhase = "exit";
    interpretation = "La dominancia de stablecoins está alta. Los inversores están saliendo del mercado y refugiándose en dólares.";
    recommendation = "Máxima precaución. Aumentar reserva USDT. Solo comprar en soportes fuertes con DCA.";
  }

  return {
    btcDom: Math.round(btcDom * 10) / 10,
    ethDom: Math.round(ethDom * 10) / 10,
    othersDom: Math.round(othersDom * 10) / 10,
    usdtDom: Math.round(usdtDom * 10) / 10,
    btcChange7d: Math.round(btcChange7d * 10) / 10,
    ethChange7d: Math.round(ethChange7d * 10) / 10,
    cyclePhase,
    interpretation,
    recommendation,
  };
}

export default function DominanceAnalysis() {
  const { data, countdown, loading, refresh } = useAutoRefresh(fetchDominance, 60);

  if (!data) return <div className="bg-bg-card border border-gray-800 rounded-xl p-5 animate-pulse"><div className="h-40 bg-gray-700/30 rounded" /></div>;

  const phase = cycleConfig[data.cyclePhase];
  const Icon = phase.icon;

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold">Análisis de Dominancia y Ciclo</h3>
        <CountdownBadge countdown={countdown} loading={loading} onRefresh={refresh} />
      </div>

      {/* Barra de dominancia */}
      <div>
        <div className="flex rounded-full h-4 overflow-hidden">
          <div className="bg-accent-yellow" style={{ width: `${data.btcDom}%` }} title={`BTC ${data.btcDom}%`} />
          <div className="bg-accent-blue" style={{ width: `${data.ethDom}%` }} title={`ETH ${data.ethDom}%`} />
          <div className="bg-accent-purple" style={{ width: `${data.othersDom}%` }} title={`Otros ${data.othersDom}%`} />
          <div className="bg-accent-green" style={{ width: `${data.usdtDom}%` }} title={`USDT ${data.usdtDom}%`} />
        </div>
        <div className="flex justify-between mt-1.5 text-xs">
          <span className="text-accent-yellow">BTC {data.btcDom}%</span>
          <span className="text-accent-blue">ETH {data.ethDom}%</span>
          <span className="text-accent-purple">Otros {data.othersDom}%</span>
          <span className="text-accent-green">USDT {data.usdtDom}%</span>
        </div>
      </div>

      {/* Fase del ciclo */}
      <div className={clsx("p-4 rounded-xl border", data.cyclePhase === "panic" || data.cyclePhase === "exit" ? "border-accent-red/30 bg-accent-red/5" : "border-gray-700 bg-bg/30")}>
        <div className="flex items-center gap-2 mb-2">
          <Icon size={18} className={phase.color} />
          <span className={clsx("font-bold text-sm", phase.color)}>{phase.label}</span>
        </div>
        <p className="text-text-secondary text-sm leading-relaxed mb-2">{data.interpretation}</p>

        {/* Progress de ciclo */}
        <div className="flex items-center gap-1 mb-3">
          {[0, 1, 2, 3, 4].map((s) => (
            <div key={s} className={clsx("h-1.5 flex-1 rounded-full", s <= phase.step ? "bg-accent-blue" : "bg-gray-700")} />
          ))}
        </div>

        <div className="bg-bg/50 rounded-lg p-3">
          <div className="text-accent-blue text-xs font-bold mb-1">Recomendación del sistema:</div>
          <div className="text-white text-sm">{data.recommendation}</div>
        </div>
      </div>
    </div>
  );
}
