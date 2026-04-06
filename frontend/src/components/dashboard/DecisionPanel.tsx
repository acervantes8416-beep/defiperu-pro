"use client";
import type { AnalysisResult } from "@/types";
import SignalBadge from "./SignalBadge";
import { Target, ShieldAlert, TrendingUp, BarChart3 } from "lucide-react";

interface Props {
  analysis: AnalysisResult | null;
  loading?: boolean;
}

export default function DecisionPanel({ analysis, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-48 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-700 rounded w-full" />
          <div className="h-4 bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6 text-center text-text-muted">
        Selecciona un par para ver la decisión de trading
      </div>
    );
  }

  const d = analysis.decision;
  const isActive = d.signal !== "HOLD";

  return (
    <div className={`bg-bg-card border rounded-xl p-6 ${isActive ? (d.signal === "BUY" ? "border-accent-green/30 glow-green" : "border-accent-red/30 glow-red") : "border-gray-800"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-semibold text-lg">{analysis.symbol}</h3>
          <span className="text-text-muted text-sm">{analysis.timeframe} · Spot</span>
        </div>
        <SignalBadge signal={d.signal as any} confidence={d.confidence} size="lg" />
      </div>

      {/* Meta Score */}
      <div className="mb-5">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-text-secondary">Meta Score</span>
          <span className={d.meta_score > 0 ? "text-accent-green" : d.meta_score < 0 ? "text-accent-red" : "text-text-primary"}>
            {d.meta_score > 0 ? "+" : ""}{d.meta_score}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${d.meta_score > 0 ? "bg-accent-green" : d.meta_score < 0 ? "bg-accent-red" : "bg-gray-500"}`}
            style={{ width: `${Math.min(100, Math.abs(d.meta_score))}%`, marginLeft: d.meta_score < 0 ? `${100 - Math.abs(d.meta_score)}%` : "0" }}
          />
        </div>
      </div>

      {/* Niveles clave */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <Target size={12} /> Entrada
          </div>
          <div className="text-white font-mono font-semibold">${d.entry_price.toLocaleString()}</div>
        </div>
        <div className="bg-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <ShieldAlert size={12} /> Stop Loss
          </div>
          <div className="text-accent-red font-mono font-semibold">${d.stop_loss.toLocaleString()}</div>
        </div>
        <div className="bg-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <TrendingUp size={12} /> Take Profit
          </div>
          <div className="text-accent-green font-mono font-semibold">${d.take_profit.toLocaleString()}</div>
        </div>
        <div className="bg-bg/50 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1">
            <BarChart3 size={12} /> Riesgo/Beneficio
          </div>
          <div className="text-accent-blue font-mono font-semibold">{d.risk_reward.toFixed(2)}</div>
        </div>
      </div>

      {/* Posición recomendada */}
      {isActive && (
        <div className="bg-accent-blue/10 border border-accent-blue/20 rounded-lg p-3 mb-4">
          <div className="text-accent-blue text-sm font-medium">
            Posición recomendada: {d.position_size_pct.toFixed(1)}% del portfolio (Spot)
          </div>
        </div>
      )}

      {/* Desglose de estrategias */}
      <div className="space-y-2">
        <div className="text-text-secondary text-xs uppercase font-medium">Desglose por Estrategia</div>
        {Object.entries(analysis.strategies).map(([name, strat]) => (
          <div key={name} className="flex items-center justify-between text-sm">
            <span className="text-text-secondary capitalize">{name.replace("_", " ")}</span>
            <div className="flex items-center gap-2">
              <span className={strat.signal === "BUY" ? "text-accent-green" : strat.signal === "SELL" ? "text-accent-red" : "text-text-muted"}>
                {strat.signal}
              </span>
              <span className="text-text-muted">{strat.confidence.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
