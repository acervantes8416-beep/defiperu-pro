"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/store";
import MetricCard from "@/components/dashboard/MetricCard";
import SignalsTable from "@/components/dashboard/SignalsTable";
import DecisionPanel from "@/components/dashboard/DecisionPanel";
import RiskProfileSelector from "@/components/dashboard/RiskProfileSelector";
import AllocationPanel from "@/components/dashboard/AllocationPanel";
import PnLByAsset from "@/components/dashboard/PnLByAsset";
import PriceChart from "@/components/charts/PriceChart";
import EquityCurve from "@/components/charts/EquityCurve";
import { DollarSign, TrendingUp, TrendingDown, BarChart3, Activity, Shield } from "lucide-react";
import type { Signal, AnalysisResult, RiskProfileType } from "@/types";

// ── Datos demo ──────────────────────────────────────────

const demoSignals: Signal[] = [
  { symbol: "BTC/USDT", signal: "BUY", meta_score: 62.4, confidence: 78, entry_price: 98450, stop_loss: 96200, take_profit: 103500, risk_reward: 2.24 },
  { symbol: "ETH/USDT", signal: "BUY", meta_score: 45.1, confidence: 65, entry_price: 3420, stop_loss: 3310, take_profit: 3650, risk_reward: 2.09 },
  { symbol: "SOL/USDT", signal: "SELL", meta_score: -38.2, confidence: 58, entry_price: 185.4, stop_loss: 192.5, take_profit: 172.0, risk_reward: 1.89 },
  { symbol: "BNB/USDT", signal: "HOLD", meta_score: 8.3, confidence: 32, entry_price: 612, stop_loss: 598, take_profit: 635, risk_reward: 1.64 },
  { symbol: "XRP/USDT", signal: "BUY", meta_score: 51.7, confidence: 71, entry_price: 2.18, stop_loss: 2.08, take_profit: 2.42, risk_reward: 2.40 },
  { symbol: "AVAX/USDT", signal: "SELL", meta_score: -28.5, confidence: 52, entry_price: 38.7, stop_loss: 40.2, take_profit: 35.8, risk_reward: 1.93 },
];

const demoEquity = Array.from({ length: 200 }, (_, i) => {
  const base = 10000;
  const trend = i * 15;
  const noise = Math.sin(i * 0.1) * 300 + Math.random() * 200 - 100;
  return base + trend + noise;
});

// Métricas por perfil
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
    const signal = demoSignals.find((s) => s.symbol === selectedSymbol) || demoSignals[0];
    setAnalysis({
      symbol: signal.symbol,
      timeframe: selectedTimeframe,
      decision: { ...signal, position_size_pct: 5.2 },
      strategies: {
        trend_following: { signal: signal.signal, confidence: signal.confidence * 0.9, entry: signal.entry_price, sl: signal.stop_loss, tp: signal.take_profit, rr: signal.risk_reward, reasoning: ["Alineación EMA alcista", "Histograma MACD creciente"] },
        mean_reversion: { signal: signal.meta_score > 20 ? "BUY" : signal.meta_score < -20 ? "SELL" : "HOLD", confidence: signal.confidence * 0.7, entry: signal.entry_price, sl: signal.stop_loss, tp: signal.take_profit, rr: signal.risk_reward, reasoning: ["RSI en 35, recuperándose"] },
        breakout: { signal: signal.signal, confidence: signal.confidence * 0.6, entry: signal.entry_price, sl: signal.stop_loss, tp: signal.take_profit, rr: signal.risk_reward, reasoning: ["Volumen 2.1x promedio"] },
      },
      reasoning: [],
    });
  }, [selectedSymbol, selectedTimeframe]);

  const returnPct = (metrics.pnl / 10000) * 100;

  return (
    <div className="space-y-6">
      {/* ── Perfil de riesgo (prominente, arriba del todo) ── */}
      <RiskProfileSelector />

      {/* ── Métricas principales ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard title="Valor del Portfolio" value={metrics.value} format="currency" change={returnPct} icon={<DollarSign size={18} />} />
        <MetricCard title="PnL Total" value={metrics.pnl} format="currency" change={returnPct} icon={<TrendingUp size={18} />} />
        <MetricCard title="Tasa de Acierto" value={metrics.winRate} format="percent" icon={<Activity size={18} />} />
        <MetricCard title="Ratio Sharpe" value={metrics.sharpe} format="ratio" icon={<BarChart3 size={18} />} />
        <MetricCard title="Máx. Drawdown" value={metrics.dd} format="percent" icon={<TrendingDown size={18} />} />
        <MetricCard title="Señales Activas" value={demoSignals.filter((s) => s.signal !== "HOLD").length} format="number" icon={<Shield size={18} />} />
      </div>

      {/* ── Grid principal: gráfico + allocación/decisión ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda (2 cols): gráfico + PnL + señales */}
        <div className="lg:col-span-2 space-y-6">
          {/* TradingView chart con EMAs */}
          <PriceChart symbol={selectedSymbol} timeframe={selectedTimeframe} height={480} />

          {/* PnL por activo SPOT */}
          <PnLByAsset />

          {/* Allocación actual vs objetivo */}
          <AllocationPanel />

          {/* Equity curve */}
          <EquityCurve data={demoEquity} title="Curva de Equity del Portfolio" />

          {/* Tabla de señales */}
          <SignalsTable signals={demoSignals} onSelect={(s) => setSymbol(s)} />
        </div>

        {/* Columna derecha (1 col): decisión + actividad */}
        <div className="space-y-6">
          <DecisionPanel analysis={analysis} />

          {/* Resumen del día */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Actividad de Hoy</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Señales generadas</span>
                <span className="text-white font-mono">24</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Operaciones (Spot)</span>
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
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Mejor operación</span>
                <span className="text-accent-green font-mono">+$187.20 (BTC)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Modo</span>
                <span className="text-accent-blue font-mono">Spot</span>
              </div>
            </div>
          </div>

          {/* Perfil activo resumen */}
          <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Perfil Activo</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Perfil</span>
                <span className="text-white font-semibold capitalize">{riskProfile}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Drawdown máx. permitido</span>
                <span className="text-accent-yellow font-mono">
                  {riskProfile === "conservador" ? "10%" : riskProfile === "moderado" ? "20%" : "35%"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Riesgo por operación</span>
                <span className="text-text-primary font-mono">
                  {riskProfile === "conservador" ? "1%" : riskProfile === "moderado" ? "2%" : "3%"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Tipo de operación</span>
                <span className="text-accent-green font-mono">Solo Spot</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
