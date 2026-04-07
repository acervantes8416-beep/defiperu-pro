import type { Signal } from "@/lib/decisionEngine";
import { useState } from "react";
import clsx from "clsx";
import OrderPanel from "./OrderPanel";

export default function RecommendationCard({ signal: sig }: { signal: Signal }) {
  const [showOrder, setShowOrder] = useState(false);

  const isCall = sig.action.includes("CALL");
  const isBuy = sig.action.startsWith("BUY");
  const border = isBuy ? (isCall ? "border-accent-green/30" : "border-accent-red/30") : "border-accent-yellow/30";
  const bg = isBuy ? (isCall ? "bg-accent-green/5" : "bg-accent-red/5") : "bg-accent-yellow/5";
  const riskColor = { LOW: "text-accent-green", MEDIUM: "text-accent-yellow", HIGH: "text-accent-red" }[sig.riskLevel];
  const confColor = { LOW: "text-accent-red", MEDIUM: "text-accent-yellow", HIGH: "text-accent-green" }[sig.confidence];

  // Strength bar
  const barColor = sig.strength >= 60 ? "bg-accent-green" : sig.strength >= 35 ? "bg-accent-yellow" : "bg-accent-red";

  return (
    <>
      <div className={clsx("border rounded-xl overflow-hidden", border, bg)}>
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-gray-800/50 flex items-center justify-between">
          <span className={clsx("font-bold text-sm font-display", isCall ? "text-accent-green" : "text-accent-red")}>{sig.action}</span>
          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className={riskColor}>{sig.riskLevel}</span>
            <span className={confColor}>Conf:{sig.confidence}</span>
          </div>
        </div>

        {/* Strength bar */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-800 rounded-full h-1.5">
              <div className={clsx("h-1.5 rounded-full transition-all", barColor)} style={{ width: `${sig.strength}%` }} />
            </div>
            <span className="text-[10px] font-mono text-text-muted">{sig.strength}/100</span>
          </div>
        </div>

        {/* Strike / Expiry / DTE */}
        <div className="px-4 py-2.5 grid grid-cols-3 gap-2 text-xs border-b border-gray-800/30">
          <div><div className="text-text-muted text-[10px]">Strike</div><div className="text-white font-mono font-bold">${sig.strike.toLocaleString()}</div></div>
          <div><div className="text-text-muted text-[10px]">Expiry</div><div className="text-white font-mono">{sig.expiry}</div></div>
          <div><div className="text-text-muted text-[10px]">DTE</div><div className="text-white font-mono">{sig.dte}d</div></div>
        </div>

        {/* Entry / Target / BE / IV */}
        <div className="px-4 py-2.5 grid grid-cols-2 gap-2 text-xs border-b border-gray-800/30">
          <div><div className="text-text-muted text-[10px]">Entry USD</div><div className="text-white font-mono">${sig.entryUSD.toLocaleString()}</div></div>
          <div><div className="text-text-muted text-[10px]">Target</div><div className="text-accent-green font-mono font-bold">{sig.targetYield}</div></div>
          <div><div className="text-text-muted text-[10px]">Breakeven</div><div className="text-white font-mono">${sig.breakeven.toLocaleString()}</div></div>
          <div><div className="text-text-muted text-[10px]">IV</div><div className="text-accent-yellow font-mono">{sig.greeks.iv.toFixed(1)}%</div></div>
        </div>

        {/* Greeks row */}
        <div className="px-4 py-1.5 border-b border-gray-800/30 flex gap-3 text-[10px] font-mono text-text-secondary">
          <span>Δ {sig.greeks.delta.toFixed(3)}</span>
          <span>Γ {sig.greeks.gamma.toFixed(6)}</span>
          <span className="text-accent-red">Θ {sig.greeks.theta.toFixed(1)}</span>
          <span className="text-accent-blue">ν {sig.greeks.vega.toFixed(1)}</span>
        </div>

        {/* Contracts */}
        <div className="px-4 py-1.5 border-b border-gray-800/30 text-[11px]">
          <span className="text-accent-blue font-mono font-semibold">{sig.contracts} contratos (2% cap)</span>
        </div>

        {/* Rationale */}
        <div className="px-4 py-2.5 border-b border-gray-800/30">
          <div className="text-text-muted text-[10px] mb-0.5">Rationale</div>
          <p className="text-text-secondary text-[11px] leading-relaxed">{sig.rationale}</p>
        </div>

        {/* Max Loss / Gain */}
        <div className="px-4 py-1.5 border-b border-gray-800/30 grid grid-cols-2 gap-1 text-[10px]">
          <div><span className="text-text-muted">Max loss: </span><span className="text-accent-red">{sig.maxLoss}</span></div>
          <div><span className="text-text-muted">Max gain: </span><span className="text-accent-green">{sig.maxGain}</span></div>
        </div>

        {/* Risk tags */}
        <div className="px-4 py-1.5 flex flex-wrap gap-1">
          {sig.keyRisks.map((r, i) => (
            <span key={i} className="text-[9px] bg-bg border border-gray-700 text-text-muted px-1.5 py-0.5 rounded-full">{r}</span>
          ))}
        </div>

        {/* CTA */}
        <div className="px-4 py-2.5">
          <button onClick={() => setShowOrder(true)}
            className="w-full text-center text-xs font-semibold text-accent-blue hover:text-white transition-colors font-display">
            Ver orden completa ↗
          </button>
        </div>
      </div>

      {showOrder && <OrderPanel signal={sig} onClose={() => setShowOrder(false)} />}
    </>
  );
}
