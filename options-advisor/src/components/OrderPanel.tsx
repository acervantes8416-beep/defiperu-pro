import type { Signal } from "@/lib/decisionEngine";
import { useMarketStore } from "@/store/marketStore";
import { X, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface Props {
  signal: Signal;
  contracts: number;
  onClose: () => void;
}

export default function OrderPanel({ signal, contracts, onClose }: Props) {
  const { spot, capital } = useMarketStore();
  const [copied, setCopied] = useState(false);

  const isBuy = signal.action.startsWith("BUY");
  const midPrice = signal.entryUSD;
  const limitPrice = isBuy ? midPrice * 1.005 : midPrice * 0.995; // +/- 0.5%
  const totalPremium = midPrice * contracts;
  const capitalPct = capital > 0 ? (totalPremium / capital * 100) : 0;
  const beMovePct = spot > 0 ? (Math.abs(signal.breakeven - spot) / spot * 100) : 0;

  const orderText = `
Exchange: Deribit
Direction: ${signal.action}
Instrument: ${signal.instrument}
Quantity: ${contracts} contracts
Limit Price: $${limitPrice.toFixed(2)} USD
Time in Force: GTC
Total Premium: $${totalPremium.toFixed(2)} USD
Capital at Risk: ${capitalPct.toFixed(1)}%
Breakeven: $${signal.breakeven.toLocaleString()} (${beMovePct.toFixed(2)}% move)
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(orderText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-bg-card border-l border-gray-800 p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white">Orden Completa</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <Row label="Exchange" value="Deribit" />
          <Row label="Dirección" value={signal.action} color={isBuy ? "text-accent-green" : "text-accent-red"} />
          <Row label="Instrumento" value={signal.instrument} mono />
          <Row label="Cantidad" value={`${contracts} contratos`} />
          <Row label="Precio límite" value={`$${limitPrice.toFixed(2)} USD`} mono />
          <Row label="Tiempo en vigor" value="GTC (Good Till Cancel)" />

          <div className="border-t border-gray-700 pt-4 space-y-3">
            <Row label="Prima total" value={`$${totalPremium.toFixed(2)} USD`} mono bold />
            <Row label="Capital en riesgo" value={`${capitalPct.toFixed(1)}%`} color={capitalPct > 5 ? "text-accent-red" : "text-accent-green"} />
            <Row label="Breakeven" value={`$${signal.breakeven.toLocaleString()}`} mono />
            <Row label="Mov. necesario" value={`${beMovePct.toFixed(2)}%`} mono />
          </div>

          <button onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 bg-accent-blue/10 border border-accent-blue/30 text-accent-blue py-3 rounded-xl font-medium hover:bg-accent-blue/20 transition-colors">
            {copied ? <><CheckCircle2 size={16} /> Copiado!</> : <><Copy size={16} /> Copiar instrucción</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono, bold, color }: { label: string; value: string; mono?: boolean; bold?: boolean; color?: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`${mono ? "font-mono" : ""} ${bold ? "font-bold" : ""} ${color || "text-white"}`}>{value}</span>
    </div>
  );
}
