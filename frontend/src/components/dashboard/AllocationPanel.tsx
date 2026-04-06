"use client";
import { useStore } from "@/store";
import type { RiskProfileType, RebalanceOrder } from "@/types";
import { ArrowUpCircle, ArrowDownCircle, MinusCircle, DollarSign } from "lucide-react";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CountdownBadge from "@/components/common/CountdownBadge";
import clsx from "clsx";

// ── Datos demo por perfil ──────────────────────────────────

const profileData: Record<RiskProfileType, { holdings: RebalanceOrder[]; totalValue: number }> = {
  conservador: {
    totalValue: 10000,
    holdings: [
      { symbol: "BTC/USDT", category: "major", action: "comprar", target_pct: 50, current_pct: 30, delta_pct: 20, target_value_usd: 5000, current_value_usd: 3000, delta_usd: 2000, quantity: 0.02032, price: 98450 },
      { symbol: "ETH/USDT", category: "major", action: "comprar", target_pct: 30, current_pct: 20, delta_pct: 10, target_value_usd: 3000, current_value_usd: 2000, delta_usd: 1000, quantity: 0.2924, price: 3420 },
      { symbol: "USDT", category: "stablecoin", action: "invertir", target_pct: 20, current_pct: 50, delta_pct: -30, target_value_usd: 2000, current_value_usd: 5000, delta_usd: -3000, quantity: 0, price: 1 },
    ],
  },
  moderado: {
    totalValue: 10000,
    holdings: [
      { symbol: "BTC/USDT", category: "major", action: "comprar", target_pct: 35, current_pct: 30, delta_pct: 5, target_value_usd: 3500, current_value_usd: 3000, delta_usd: 500, quantity: 0.00508, price: 98450 },
      { symbol: "ETH/USDT", category: "major", action: "comprar", target_pct: 25, current_pct: 20, delta_pct: 5, target_value_usd: 2500, current_value_usd: 2000, delta_usd: 500, quantity: 0.1462, price: 3420 },
      { symbol: "SOL/USDT", category: "large_cap", action: "comprar", target_pct: 20, current_pct: 5, delta_pct: 15, target_value_usd: 2000, current_value_usd: 500, delta_usd: 1500, quantity: 8.0906, price: 185.4 },
      { symbol: "BNB/USDT", category: "large_cap", action: "comprar", target_pct: 10, current_pct: 0, delta_pct: 10, target_value_usd: 1000, current_value_usd: 0, delta_usd: 1000, quantity: 1.634, price: 612 },
      { symbol: "USDT", category: "stablecoin", action: "invertir", target_pct: 10, current_pct: 45, delta_pct: -35, target_value_usd: 1000, current_value_usd: 4500, delta_usd: -3500, quantity: 0, price: 1 },
    ],
  },
  agresivo: {
    totalValue: 10000,
    holdings: [
      { symbol: "BTC/USDT", category: "major", action: "mantener", target_pct: 25, current_pct: 30, delta_pct: -5, target_value_usd: 2500, current_value_usd: 3000, delta_usd: -500, quantity: 0.00508, price: 98450 },
      { symbol: "ETH/USDT", category: "major", action: "mantener", target_pct: 20, current_pct: 20, delta_pct: 0, target_value_usd: 2000, current_value_usd: 2000, delta_usd: 0, quantity: 0, price: 3420 },
      { symbol: "SOL/USDT", category: "large_cap", action: "comprar", target_pct: 20, current_pct: 5, delta_pct: 15, target_value_usd: 2000, current_value_usd: 500, delta_usd: 1500, quantity: 8.0906, price: 185.4 },
      { symbol: "AVAX/USDT", category: "alt", action: "comprar", target_pct: 8, current_pct: 0, delta_pct: 8, target_value_usd: 800, current_value_usd: 0, delta_usd: 800, quantity: 20.67, price: 38.7 },
      { symbol: "LINK/USDT", category: "alt", action: "comprar", target_pct: 7, current_pct: 0, delta_pct: 7, target_value_usd: 700, current_value_usd: 0, delta_usd: 700, quantity: 37.84, price: 18.5 },
      { symbol: "DOT/USDT", category: "alt", action: "comprar", target_pct: 5, current_pct: 0, delta_pct: 5, target_value_usd: 500, current_value_usd: 0, delta_usd: 500, quantity: 64.10, price: 7.8 },
      { symbol: "ADA/USDT", category: "alt", action: "comprar", target_pct: 5, current_pct: 0, delta_pct: 5, target_value_usd: 500, current_value_usd: 0, delta_usd: 500, quantity: 694.44, price: 0.72 },
      { symbol: "USDT", category: "stablecoin", action: "invertir", target_pct: 10, current_pct: 45, delta_pct: -35, target_value_usd: 1000, current_value_usd: 4500, delta_usd: -3500, quantity: 0, price: 1 },
    ],
  },
};

const categoryLabels: Record<string, string> = {
  major: "Principal",
  large_cap: "Gran Cap.",
  alt: "Altcoin",
  stablecoin: "Stablecoin",
};

const categoryColors: Record<string, string> = {
  major: "bg-accent-blue",
  large_cap: "bg-accent-green",
  alt: "bg-accent-purple",
  stablecoin: "bg-accent-yellow",
};

export default function AllocationPanel() {
  const { riskProfile } = useStore();
  // Auto-refresh cada 60s (en producción: fetch del backend)
  const { countdown, loading, refresh } = useAutoRefresh(async () => profileData[riskProfile], 60);
  const data = profileData[riskProfile];
  const totalComprar = data.holdings.filter((h) => h.action === "comprar").reduce((s, h) => s + h.delta_usd, 0);
  const totalVender = data.holdings.filter((h) => h.action === "vender").reduce((s, h) => s + Math.abs(h.delta_usd), 0);

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-white font-semibold">Allocación Actual vs Objetivo</h3>
        <div className="flex items-center gap-4 text-xs">
          <CountdownBadge countdown={countdown} loading={loading} onRefresh={refresh} />
          {totalComprar > 0 && (
            <span className="text-accent-green flex items-center gap-1">
              <ArrowUpCircle size={12} /> Comprar ${totalComprar.toLocaleString()}
            </span>
          )}
          {totalVender > 0 && (
            <span className="text-accent-red flex items-center gap-1">
              <ArrowDownCircle size={12} /> Vender ${totalVender.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-800/50">
        {data.holdings.map((h) => (
          <div key={h.symbol} className="px-5 py-3.5 hover:bg-bg-hover transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className={clsx("w-2 h-2 rounded-full", categoryColors[h.category])} />
                <div>
                  <span className="text-white font-medium text-sm">{h.symbol}</span>
                  <span className="text-text-muted text-xs ml-2">{categoryLabels[h.category]}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {h.action === "comprar" && (
                  <span className="text-accent-green text-xs font-medium flex items-center gap-1 bg-accent-green/10 px-2 py-0.5 rounded-full">
                    <ArrowUpCircle size={11} /> Comprar
                  </span>
                )}
                {h.action === "vender" && (
                  <span className="text-accent-red text-xs font-medium flex items-center gap-1 bg-accent-red/10 px-2 py-0.5 rounded-full">
                    <ArrowDownCircle size={11} /> Vender
                  </span>
                )}
                {(h.action === "mantener") && (
                  <span className="text-text-muted text-xs font-medium flex items-center gap-1">
                    <MinusCircle size={11} /> OK
                  </span>
                )}
                {h.action === "invertir" && (
                  <span className="text-accent-yellow text-xs font-medium flex items-center gap-1 bg-accent-yellow/10 px-2 py-0.5 rounded-full">
                    <DollarSign size={11} /> Usar cash
                  </span>
                )}
              </div>
            </div>

            {/* Barra de comparación */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="text-text-muted">Actual: {h.current_pct}%</span>
                  <span className="text-text-secondary">Objetivo: {h.target_pct}%</span>
                </div>
                <div className="relative w-full h-2 bg-gray-700/50 rounded-full overflow-hidden">
                  {/* Barra actual */}
                  <div
                    className="absolute h-full bg-white/20 rounded-full"
                    style={{ width: `${Math.min(100, h.current_pct)}%` }}
                  />
                  {/* Barra objetivo */}
                  <div
                    className={clsx(
                      "absolute h-full rounded-full opacity-80",
                      h.action === "comprar" ? "bg-accent-green" : h.action === "vender" ? "bg-accent-red" : "bg-accent-blue"
                    )}
                    style={{ width: `${Math.min(100, h.target_pct)}%` }}
                  />
                  {/* Marcador actual */}
                  <div
                    className="absolute top-0 h-full w-0.5 bg-white"
                    style={{ left: `${Math.min(100, h.current_pct)}%` }}
                  />
                </div>
              </div>

              {/* Monto USD */}
              {h.action !== "mantener" && h.delta_usd !== 0 && (
                <div className={clsx(
                  "text-right font-mono whitespace-nowrap min-w-[90px]",
                  h.delta_usd > 0 ? "text-accent-green" : "text-accent-red"
                )}>
                  {h.delta_usd > 0 ? "+" : ""}${Math.abs(h.delta_usd).toLocaleString()}
                </div>
              )}
              {(h.action === "mantener" || h.delta_usd === 0) && (
                <div className="text-text-muted font-mono text-right min-w-[90px]">—</div>
              )}
            </div>

            {/* Detalle de cantidad a comprar/vender */}
            {h.action === "comprar" && h.quantity > 0 && h.symbol !== "USDT" && (
              <div className="mt-1.5 text-xs text-text-muted">
                Comprar <span className="text-white font-mono">{h.quantity.toFixed(h.price > 100 ? 5 : 2)}</span> {h.symbol.replace("/USDT", "")} a <span className="text-white font-mono">${h.price.toLocaleString()}</span>
              </div>
            )}
            {h.action === "vender" && h.quantity > 0 && h.symbol !== "USDT" && (
              <div className="mt-1.5 text-xs text-text-muted">
                Vender <span className="text-white font-mono">{h.quantity.toFixed(h.price > 100 ? 5 : 2)}</span> {h.symbol.replace("/USDT", "")} a <span className="text-white font-mono">${h.price.toLocaleString()}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
