"use client";
import type { Signal } from "@/types";
import SignalBadge from "./SignalBadge";

interface Props {
  signals: Signal[];
  onSelect?: (symbol: string) => void;
}

export default function SignalsTable({ signals, onSelect }: Props) {
  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800">
        <h3 className="text-white font-semibold">Señales en Tiempo Real</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-text-muted text-xs uppercase border-b border-gray-800">
              <th className="px-5 py-3 text-left">Par</th>
              <th className="px-5 py-3 text-left">Señal</th>
              <th className="px-5 py-3 text-right">Meta Score</th>
              <th className="px-5 py-3 text-right">Entrada</th>
              <th className="px-5 py-3 text-right">Stop Loss</th>
              <th className="px-5 py-3 text-right">Take Profit</th>
              <th className="px-5 py-3 text-right">R/R</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr
                key={s.symbol}
                onClick={() => onSelect?.(s.symbol)}
                className="border-b border-gray-800/50 hover:bg-bg-hover cursor-pointer transition-colors"
              >
                <td className="px-5 py-3 font-medium text-white">{s.symbol}</td>
                <td className="px-5 py-3">
                  <SignalBadge signal={s.signal} confidence={s.confidence} size="sm" />
                </td>
                <td className={`px-5 py-3 text-right font-mono ${s.meta_score > 0 ? "text-accent-green" : s.meta_score < 0 ? "text-accent-red" : "text-text-secondary"}`}>
                  {s.meta_score > 0 ? "+" : ""}{s.meta_score.toFixed(1)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-text-primary">
                  ${s.entry_price.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right font-mono text-accent-red">
                  ${s.stop_loss.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right font-mono text-accent-green">
                  ${s.take_profit.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-right font-mono text-accent-blue">
                  {s.risk_reward.toFixed(2)}
                </td>
              </tr>
            ))}
            {signals.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-text-muted">
                  Sin señales disponibles. Conecta tu exchange para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
