import { useEffect, useCallback, useRef } from "react";
import { useMarketStore } from "@/store/marketStore";
import { useDeribit } from "@/hooks/useDeribit";
import AssetSelector from "@/components/AssetSelector";
import MetricsGrid from "@/components/MetricsGrid";
import VolSmileChart from "@/components/VolSmileChart";
import GreeksTable from "@/components/GreeksTable";
import RecommendationCard from "@/components/RecommendationCard";

export default function App() {
  const store = useMarketStore();
  const lastRsiRef = useRef<number | null>(null);

  const onSpotUpdate = useCallback((price: number) => {
    useMarketStore.getState().setSpot(price);
  }, []);

  const { connected, error: wsError } = useDeribit(store.asset, onSpotUpdate);

  // Sync connection state
  useEffect(() => { store.setConnected(connected); }, [connected]);

  // Initial data fetch
  useEffect(() => { store.fetchData(); }, [store.asset]);

  // Refetch options every 5 min
  useEffect(() => {
    const interval = setInterval(() => store.fetchData(), 300000);
    return () => clearInterval(interval);
  }, [store.asset]);

  // Re-run engine every 30s or when RSI changes significantly
  useEffect(() => {
    const interval = setInterval(() => {
      const s = useMarketStore.getState();
      if (lastRsiRef.current === null || s.rsi14 === null ||
          Math.abs((s.rsi14 || 0) - (lastRsiRef.current || 0)) > 2) {
        s.runSignals();
        lastRsiRef.current = s.rsi14;
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-bg-card border-b border-gray-800 px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">
            Options Advisor
          </h1>
          <AssetSelector />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-text-muted text-xs">Capital (USDT)</label>
            <input
              type="number" value={store.capital}
              onChange={(e) => store.setCapital(parseFloat(e.target.value) || 0)}
              className="bg-bg border border-gray-700 rounded-lg px-3 py-1.5 text-white font-mono text-sm w-28"
            />
          </div>
        </div>
      </header>

      {/* WS Error Banner */}
      {wsError && !connected && (
        <div className="bg-accent-yellow/10 border-b border-accent-yellow/30 px-6 py-2 text-accent-yellow text-xs text-center">
          {wsError} — Reconnecting...
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Row 1: Metrics Grid */}
        <MetricsGrid />

        {/* Row 2: Chart + Greeks */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <VolSmileChart />
          </div>
          <div className="lg:col-span-2">
            <GreeksTable />
          </div>
        </div>

        {/* Row 3: Recommendations */}
        {store.signals.length > 0 && (
          <div>
            <h2 className="text-white font-semibold mb-4">Señales de Trading</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {store.signals.map((sig, i) => (
                <RecommendationCard key={`${sig.instrument}-${i}`} signal={sig} />
              ))}
            </div>
          </div>
        )}

        {store.signals.length === 0 && !store.loading && (
          <div className="bg-bg-card border border-gray-800 rounded-xl p-8 text-center text-text-muted">
            {store.options.length === 0
              ? "Cargando datos de opciones desde Deribit..."
              : "Analizando mercado... Las señales aparecerán cuando haya oportunidades."
            }
          </div>
        )}

        {store.loading && (
          <div className="bg-bg-card border border-gray-800 rounded-xl p-8 text-center text-text-muted animate-pulse">
            Obteniendo datos de Deribit...
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-bg-card border-t border-gray-800 px-6 py-2 flex items-center justify-between text-xs text-text-muted">
        <span>
          {store.lastUpdated
            ? `Último update: ${store.lastUpdated.toLocaleTimeString()}`
            : "Sin datos aún"
          }
        </span>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-accent-green live-dot" : "bg-accent-red"}`} />
          <span>WS {connected ? "Connected" : "Disconnected"}</span>
          <span className="ml-4">{store.options.length} contracts loaded</span>
        </div>
      </footer>
    </div>
  );
}
