import type { Signal } from "@/lib/decisionEngine";
import { useMarketStore } from "@/store/marketStore";
import { X, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function OrderPanel({ signal: sig, onClose }: { signal: Signal; onClose: () => void }) {
  const { spot, capital } = useMarketStore();
  const [copied, setCopied] = useState(false);

  const isBuy = sig.action.startsWith("BUY");
  const limit = isBuy ? sig.entryUSD * 1.005 : sig.entryUSD * 0.995;
  const total = sig.entryUSD * sig.contracts;
  const capPct = capital > 0 ? (total / capital * 100) : 0;
  const beMove = spot > 0 ? (Math.abs(sig.breakeven - spot) / spot * 100) : 0;

  const txt = [
    `Exchange: Gate.io`,
    `Direction: ${sig.action}`,
    `Instrument: ${sig.instrument}`,
    `Quantity: ${sig.contracts} contracts`,
    `Limit Price: $${limit.toFixed(2)} USDT`,
    `Time in Force: GTC`,
    `Total Premium: $${total.toFixed(2)} USDT`,
    `Capital at Risk: ${capPct.toFixed(1)}%`,
    `Breakeven: $${sig.breakeven.toLocaleString()} (${beMove.toFixed(2)}% move)`,
    `Greeks: Δ${sig.greeks.delta.toFixed(3)} Γ${sig.greeks.gamma.toFixed(6)} Θ${sig.greeks.theta.toFixed(1)} ν${sig.greeks.vega.toFixed(1)}`,
  ].join("\n");

  const copy = () => { navigator.clipboard.writeText(txt); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-bg-surface border-l border-gray-800 p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-display font-bold text-white">Orden Completa</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-3 text-sm font-mono">
          <R label="Exchange" value="Gate.io" />
          <R label="Dirección" value={sig.action} color={isBuy ? "text-accent-green" : "text-accent-red"} />
          <R label="Instrumento" value={sig.instrument} />
          <R label="Contratos" value={`${sig.contracts}`} />
          <R label="Precio límite" value={`$${limit.toFixed(2)} USDT`} />
          <R label="Vigencia" value="GTC" />
          <div className="border-t border-gray-700 pt-3 space-y-3">
            <R label="Prima total" value={`$${total.toFixed(2)}`} bold />
            <R label="Capital en riesgo" value={`${capPct.toFixed(1)}%`} color={capPct > 5 ? "text-accent-red" : "text-accent-green"} />
            <R label="Breakeven" value={`$${sig.breakeven.toLocaleString()}`} />
            <R label="Mov. necesario" value={`${beMove.toFixed(2)}%`} />
          </div>
          <div className="border-t border-gray-700 pt-3 space-y-3">
            <R label="Delta" value={sig.greeks.delta.toFixed(3)} />
            <R label="Gamma" value={sig.greeks.gamma.toFixed(6)} />
            <R label="Theta/d" value={`$${sig.greeks.theta.toFixed(2)}`} color="text-accent-red" />
            <R label="Vega/1%" value={`$${sig.greeks.vega.toFixed(2)}`} color="text-accent-blue" />
          </div>
        </div>

        <button onClick={copy}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue py-3 rounded-xl font-semibold hover:bg-accent-blue/20 transition-colors text-sm">
          {copied ? <><CheckCircle2 size={16} /> Copiado!</> : <><Copy size={16} /> Copiar instrucción</>}
        </button>
      </div>
    </div>
  );
}

function R({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-text-muted">{label}</span>
      <span className={`${color || "text-white"} ${bold ? "font-bold" : ""}`}>{value}</span>
    </div>
  );
}
