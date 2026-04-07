import { useMarketStore } from "@/store/marketStore";
import { useGateIO } from "@/hooks/useGateIO";
import AssetSelector from "@/components/AssetSelector";
import SparklineChart from "@/components/SparklineChart";
import MetricsGrid from "@/components/MetricsGrid";
import VolSmileChart from "@/components/VolSmileChart";
import GreeksTable from "@/components/GreeksTable";
import RecommendationCard from "@/components/RecommendationCard";
import type { DTERange } from "@/lib/decisionEngine";
import clsx from "clsx";

const DTE_OPTS: { label: string; value: DTERange }[] = [
  { label: "1d", value: "1d" },
  { label: "3d", value: "3d" },
  { label: "5d", value: "5d" },
  { label: "7d", value: "7d" },
  { label: "14d", value: "14d" },
  { label: "30d", value: "30d" },
  { label: "Auto", value: "auto" },
];

export default function App() {
  useGateIO();
  const store = useMarketStore();
  const riskPerOp = Math.round(store.capital * 0.02);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ── */}
      <header className="bg-bg-surface border-b border-gray-800 px-4 py-2.5 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto flex items-center gap-4 flex-wrap">
          {/* Logo */}
          <div className="flex items-center gap-2 mr-2">
            <span className="text-accent-blue text-xl font-display font-extrabold">Ω</span>
            <span className="text-white font-display font-bold text-sm hidden sm:inline">OPTIONS ADVISOR</span>
          </div>

          {/* Gate.io badge */}
          <span className="text-[9px] font-mono bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/30 px-1.5 py-0.5 rounded">
            Gate.io
          </span>

          {/* REST polling indicator */}
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green live-dot" />
            <span className="text-[9px] font-mono text-accent-green">REST · 3s</span>
          </span>

          {/* Sparkline */}
          <SparklineChart />

          {/* DTE selector */}
          <div className="flex gap-0.5 bg-bg rounded-lg p-0.5 border border-gray-800">
            {DTE_OPTS.map((d) => (
              <button key={d.value} onClick={() => store.setDteRange(d.value)}
                className={clsx("px-2 py-1 rounded text-[10px] font-mono transition-colors",
                  store.dteRange === d.value ? "bg-accent-blue text-black font-bold" : "text-text-muted hover:text-white"
                )}>{d.label}</button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Capital input */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-text-muted text-[10px] font-mono">CAPITAL</label>
              <input
                type="number" value={store.capital}
                onChange={(e) => store.setCapital(parseFloat(e.target.value) || 0)}
                className="bg-bg border border-gray-700 rounded-lg px-2.5 py-1 text-white font-mono text-xs w-24 focus:border-accent-blue focus:outline-none"
              />
            </div>
            <span className="text-[9px] text-text-muted font-mono">Riesgo/op: ${riskPerOp} (2%)</span>
          </div>

          {/* Asset selector */}
          <AssetSelector />
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-4 space-y-4 max-w-[1600px] mx-auto w-full">
        <MetricsGrid />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><VolSmileChart /></div>
          <div className="lg:col-span-2"><GreeksTable /></div>
        </div>

        {store.signals.length > 0 && (
          <div>
            <h2 className="text-white font-display font-bold text-sm mb-3">SEÑALES DE TRADING</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {store.signals.map((sig, i) => (
                <RecommendationCard key={`${sig.instrument}-${i}`} signal={sig} />
              ))}
            </div>
          </div>
        )}

        {store.signals.length === 0 && !store.loading && store.options.length > 0 && (
          <div className="bg-bg-surface border border-gray-800 rounded-xl p-8 text-center text-text-muted text-sm">
            Analizando mercado... Las señales aparecerán cuando se detecten oportunidades.
          </div>
        )}

        {store.loading && (
          <div className="bg-bg-surface border border-gray-800 rounded-xl p-8 text-center text-text-muted text-sm animate-pulse">
            Obteniendo datos de Gate.io...
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-bg-surface border-t border-gray-800 px-4 py-2 flex items-center justify-between text-[10px] text-text-muted font-mono max-w-[1600px] mx-auto w-full">
        <span>v2.1 · Gate.io REST API v4 · Polling cada 3s · Sin API keys</span>
        <div className="flex items-center gap-3">
          {store.lastUpdated && <span>Updated {store.lastUpdated.toLocaleTimeString()}</span>}
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            REST
          </span>
          <span>{store.options.length} contracts</span>
        </div>
      </footer>

      <div className="bg-bg px-4 py-1 text-center text-[9px] text-text-muted">
        Disclaimer: Educational purposes only. Not financial advice. Options trading involves significant risk of loss.
      </div>
    </div>
  );
}
