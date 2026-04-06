"use client";
import { useStore } from "@/store";
import MarketBar from "@/components/dashboard/MarketBar";
import MarketPhaseCard from "@/components/dashboard/MarketPhaseCard";
import DominanceAnalysis from "@/components/dashboard/DominanceAnalysis";
import RiskProfileSelector from "@/components/dashboard/RiskProfileSelector";
import AllocationPanel from "@/components/dashboard/AllocationPanel";
import PnLByAsset from "@/components/dashboard/PnLByAsset";
import PriceChart from "@/components/charts/PriceChart";
import { DollarSign, TrendingUp } from "lucide-react";
import type { RiskProfileType } from "@/types";

const profileMetrics: Record<RiskProfileType, { value: number; pnl: number }> = {
  conservador: { value: 10485, pnl: 485 },
  moderado: { value: 10815, pnl: 815 },
  agresivo: { value: 11282, pnl: 1282 },
};

export default function DashboardPage() {
  const { selectedSymbol, selectedTimeframe, riskProfile, investorProfile } = useStore();
  const m = profileMetrics[riskProfile];
  const capital = investorProfile?.capital || 10000;
  const pnl = m.pnl * (capital / 10000);
  const value = capital + pnl;
  const userName = investorProfile?.name || "Inversor";

  return (
    <div className="space-y-6">
      {/* Saludo personalizado */}
      <div>
        <h1 className="text-2xl font-bold text-white">Hola, {userName}</h1>
        <p className="text-text-secondary text-sm">Tu resumen de mercado e inversión — actualizado cada 60 segundos.</p>
      </div>

      {/* ── Barra de mercado: F&G + Dominancia + Fase ── */}
      <MarketBar />

      {/* ── Fase del mercado con explicación simple ── */}
      <MarketPhaseCard />

      {/* ── Portafolio del usuario (simplificado) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
            <DollarSign size={16} /> Valor Total
          </div>
          <div className="text-3xl font-bold text-white">${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="text-text-muted text-xs mt-1">Capital inicial: ${capital.toLocaleString()}</div>
        </div>
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 text-text-muted text-sm mb-2">
            <TrendingUp size={16} /> Ganancia / Pérdida
          </div>
          <div className={`text-3xl font-bold ${pnl >= 0 ? "text-accent-green" : "text-accent-red"}`}>
            {pnl >= 0 ? "+" : ""}${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          <div className={`text-xs mt-1 ${pnl >= 0 ? "text-accent-green/70" : "text-accent-red/70"}`}>
            {pnl >= 0 ? "+" : ""}{((pnl / capital) * 100).toFixed(2)}% desde tu inversión
          </div>
        </div>
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <div className="text-text-muted text-sm mb-2">Perfil Activo</div>
          <div className="text-2xl font-bold text-white capitalize">{riskProfile}</div>
          <div className="text-text-muted text-xs mt-1">
            Máx. drawdown: {riskProfile === "conservador" ? "10%" : riskProfile === "moderado" ? "20%" : "35%"} · Solo Spot
          </div>
        </div>
      </div>

      {/* ── Análisis de dominancia + ciclo de mercado ── */}
      <DominanceAnalysis />

      {/* ── Gráfico ── */}
      <PriceChart symbol={selectedSymbol} timeframe={selectedTimeframe} height={420} />

      {/* ── Perfil de riesgo ── */}
      <RiskProfileSelector />

      {/* ── Grid: PnL + Allocación ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PnLByAsset />
        <AllocationPanel />
      </div>
    </div>
  );
}
