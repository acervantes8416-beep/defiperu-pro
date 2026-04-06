"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import MetricCard from "@/components/dashboard/MetricCard";
import MarketBar from "@/components/dashboard/MarketBar";
import MarketPhaseCard from "@/components/dashboard/MarketPhaseCard";
import RiskProfileSelector from "@/components/dashboard/RiskProfileSelector";
import AllocationPanel from "@/components/dashboard/AllocationPanel";
import PnLByAsset from "@/components/dashboard/PnLByAsset";
import SignalsTable from "@/components/dashboard/SignalsTable";
import DecisionPanel from "@/components/dashboard/DecisionPanel";
import PriceChart from "@/components/charts/PriceChart";
import EquityCurve from "@/components/charts/EquityCurve";
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Activity, Shield } from "lucide-react";
import type { AnalysisResult, RiskProfileType } from "@/types";

const demoEquity = Array.from({ length: 200 }, (_, i) => {
  const base = 10000;
  const trend = i * 15;
  const noise = Math.sin(i * 0.1) * 300 + Math.random() * 200 - 100;
  return base + trend + noise;
});

const profileMetrics: Record<RiskProfileType, { value: number; pnl: number; dd: number; sharpe: number; winRate: number }> = {
  conservador: { value: 10485, pnl: 485, dd: -3.2, sharpe: 2.1, winRate: 71.4 },
  moderado: { value: 10815, pnl: 815, dd: -6.8, sharpe: 1.87, winRate: 64.2 },
  agresivo: { value: 11282, pnl: 1282, dd: -12.4, sharpe: 1.52, winRate: 58.7 },
};

export default function DashboardPage() {
  const { selectedSymbol, selectedTimeframe, setSymbol, riskProfile } = useStore();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const metrics = profileMetrics[riskProfile];

  useEffect(() => {
    setAnalysis({
      symbol: selectedSymbol,
      timeframe: selectedTimeframe,
      decision: { signal: "BUY", meta_score: 62.4, confidence: 78, entry_price: 98450, stop_loss: 96200, take_profit: 103500, risk_reward: 2.24, position_size_pct: 5.2 },
      strategies: {
        trend_following: { signal: "BUY", confidence: 82, entry: 98450, sl: 96200, tp: 103500, rr: 2.24, reasoning: ["Alineación EMA alcista", "Histograma MACD creciente"] },
        mean_reversion: { signal: "HOLD", confidence: 45, entry: 98450, sl: 96200, tp: 103500, rr: 2.24, reasoning: ["RSI neutral en 48"] },
        breakout: { signal: "BUY", confidence: 68, entry: 98450, sl: 96200, tp: 103500, rr: 2.24, reasoning: ["Volumen 2.1x promedio"] },
      },
      reasoning: [],
    });
  }, [selectedSymbol, selectedTimeframe]);

  const returnPct = (metrics.pnl / 10000) * 100;

  return (
    <div className="space-y-6">
      {/* ── Barra de mercado global (Fear & Greed, Dominancia, Fase) ── */}
      <MarketBar />

      {/* ── Indicador de fase prominente ── */}
      <MarketPhaseCard />

      {/* ── Perfil de riesgo ── */}
      <RiskProfileSelector />

      {/* ── Métricas principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Valor del Portfolio" value={metrics.value} format="currency" change={returnPct} icon={<DollarSign size={18} />} />
        <MetricCard title="PnL Total" value={metrics.pnl} format="currency" change={returnPct} icon={<TrendingUp size={18} />} />
        <MetricCard title="Tasa de Acierto" value={metrics.winRate} format="percent" icon={<Activity size={18} />} />
        <MetricCard title="Ratio Sharpe" value={metrics.sharpe} format="ratio" icon={<BarChart3 size={18} />} />
        <MetricCard title="Máx. Drawdown" value={metrics.dd} format="percent" icon={<TrendingDown size={18} />} />
        <MetricCard title="Señales Activas" value={4} format="number" icon={<Shield size={18} />} />
      </div>

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PriceChart symbol={selectedSymbol} timeframe={selectedTimeframe} height={480} />
          <PnLByAsset />
          <AllocationPanel />
          <EquityCurve data={demoEquity} title="Curva de Equity del Portfolio" />
          <SignalsTable onSelect={(s) => setSymbol(s)} />
        </div>

        <div className="space-y-6">
          <DecisionPanel analysis={analysis} />

          <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Actividad de Hoy</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Señales generadas</span>
                <span className="text-white font-mono">24</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Operaciones Spot</span>
                <span className="text-white font-mono">6</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Ganadas / Perdidas</span>
                <span className="text-accent-green font-mono">4 / 2</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">PnL del día</span>
                <span className="text-accent-green font-mono">+$342.50</span>
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Perfil Activo</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Perfil</span>
                <span className="text-white font-semibold capitalize">{riskProfile}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Drawdown máx.</span>
                <span className="text-accent-yellow font-mono">
                  {riskProfile === "conservador" ? "10%" : riskProfile === "moderado" ? "20%" : "35%"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Riesgo por op.</span>
                <span className="text-text-primary font-mono">
                  {riskProfile === "conservador" ? "1%" : riskProfile === "moderado" ? "2%" : "3%"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Modo</span>
                <span className="text-accent-green font-mono">Solo Spot</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
