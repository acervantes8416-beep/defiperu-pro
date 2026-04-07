import type { Signal } from "@/lib/decisionEngine";
import { useMarketStore } from "@/store/marketStore";
import { useState } from "react";
import clsx from "clsx";
import OrderPanel from "./OrderPanel";

export default function RecommendationCard({ signal }: { signal: Signal }) {
  const [showOrder, setShowOrder] = useState(false);
  const { capital, spot } = useMarketStore();

  const isBuy = signal.action.startsWith("BUY");
  const isCall = signal.action.includes("CALL");
  const borderColor = isBuy
    ? (isCall ? "border-accent-green/30" : "border-accent-red/30")
    : "border-accent-yellow/30";
  const bgGlow = isBuy
    ? (isCall ? "bg-accent-green/5" : "bg-accent-red/5")
    : "bg-accent-yellow/5";

  const contractSize = capital > 0 ? Math.max(0.1, Math.min(10, Math.floor((capital * 0.02 / signal.entryUSD) * 10) / 10)) : 0;
  const riskPct = signal.entryUSD * contractSize / capital * 100;

  const riskColors = { LOW: "text-accent-green", MEDIUM: "text-accent-yellow", HIGH: "text-accent-red" };
  const confColors = { LOW: "text-accent-red", MEDIUM: "text-accent-yellow", HIGH: "text-accent-green" };

  return (
    <>
      <div className={clsx("border rounded-xl overflow-hidden", borderColor, bgGlow)}>
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-800/50 flex items-center justify-between">
          <span className={clsx("font-bold text-sm", isCall ? "text-accent-green" : "text-accent-red")}>{signal.action}</span>
          <div className="flex items-center gap-3 text-xs">
            <span className={riskColors[signal.riskLevel]}>{signal.riskLevel} RISK</span>
            <span className={confColors[signal.confidence]}>Conf: {signal.confidence}</span>
          </div>
        </div>

        {/* Strike / Expiry / DTE */}
        <div className="px-5 py-3 grid grid-cols-3 gap-3 border-b border-gray-800/30 text-sm">
          <div><div className="text-text-muted text-xs">Strike</div><div className="text-white font-mono font-bold">${signal.strike.toLocaleString()}</div></div>
          <div><div className="text-text-muted text-xs">Expiry</div><div className="text-white font-mono">{signal.expiry}</div></div>
          <div><div className="text-text-muted text-xs">DTE</div><div className="text-white font-mono">{signal.dte}d</div></div>
        </div>

        {/* Entry / Target */}
        <div className="px-5 py-3 grid grid-cols-2 gap-3 border-b border-gray-800/30 text-sm">
          <div><div className="text-text-muted text-xs">Entry USD</div><div className="text-white font-mono">${signal.entryUSD.toLocaleString()}</div></div>
          <div><div className="text-text-muted text-xs">Target yield</div><div className="text-accent-green font-mono font-bold">{signal.targetYield}</div></div>
          <div><div className="text-text-muted text-xs">Breakeven</div><div className="text-white font-mono">${signal.breakeven.toLocaleString()}</div></div>
          <div><div className="text-text-muted text-xs">IV</div><div className="text-accent-yellow font-mono">{signal.greeks.iv.toFixed(1)}%</div></div>
        </div>

        {/* Greeks */}
        <div className="px-5 py-2 border-b border-gray-800/30 flex items-center gap-4 text-xs font-mono text-text-secondary">
          <span>Δ {signal.greeks.delta.toFixed(3)}</span>
          <span>Γ {signal.greeks.gamma.toFixed(6)}</span>
          <span className="text-accent-red">Θ {signal.greeks.theta.toFixed(1)}</span>
          <span className="text-accent-blue">ν {signal.greeks.vega.toFixed(1)}</span>
        </div>

        {/* Contracts */}
        <div className="px-5 py-2 border-b border-gray-800/30 text-xs">
          <span className="text-accent-blue font-medium">Contratos sugeridos: {contractSize} ({riskPct.toFixed(1)}% cap)</span>
        </div>

        {/* Rationale */}
        <div className="px-5 py-3 border-b border-gray-800/30">
          <div className="text-text-muted text-xs mb-1">Rationale</div>
          <p className="text-text-secondary text-xs leading-relaxed">{signal.rationale}</p>
        </div>

        {/* Max Loss/Gain */}
        <div className="px-5 py-2 border-b border-gray-800/30 text-xs grid grid-cols-2 gap-2">
          <div><span className="text-text-muted">Max loss: </span><span className="text-accent-red">{signal.maxLoss}</span></div>
          <div><span className="text-text-muted">Max gain: </span><span className="text-accent-green">{signal.maxGain}</span></div>
        </div>

        {/* Risk tags */}
        <div className="px-5 py-2 flex flex-wrap gap-1.5">
          {signal.keyRisks.map((r, i) => (
            <span key={i} className="text-[10px] bg-bg border border-gray-700 text-text-muted px-2 py-0.5 rounded-full">{r}</span>
          ))}
        </div>

        {/* Action button */}
        <div className="px-5 py-3">
          <button onClick={() => setShowOrder(true)} className="w-full text-center text-sm font-medium text-accent-blue hover:text-white transition-colors">
            Ver orden completa ↗
          </button>
        </div>
      </div>

      {showOrder && <OrderPanel signal={signal} contracts={contractSize} onClose={() => setShowOrder(false)} />}
    </>
  );
}
