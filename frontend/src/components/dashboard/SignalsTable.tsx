"use client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CountdownBadge from "@/components/common/CountdownBadge";
import SignalBadge from "./SignalBadge";
import clsx from "clsx";

interface SpotSignal {
  symbol: string;
  signal: "BUY" | "SELL" | "HOLD";
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  reason: string;
}

// Señales demo que se actualizarían vía API
const demoSignals: SpotSignal[] = [
  { symbol: "BTC/USDT", signal: "BUY", entry_price: 98450, stop_loss: 96200, take_profit: 103500, confidence: 78, reason: "Alineación EMA alcista + MACD creciente + volumen 1.8x promedio" },
  { symbol: "ETH/USDT", signal: "BUY", entry_price: 3420, stop_loss: 3310, take_profit: 3650, confidence: 65, reason: "RSI recuperándose desde sobreventa + precio sobre EMA50" },
  { symbol: "SOL/USDT", signal: "SELL", entry_price: 185.4, stop_loss: 192.5, take_profit: 172.0, confidence: 58, reason: "Death cross EMA20/50 + RSI sobrecomprado descendiendo" },
  { symbol: "XRP/USDT", signal: "BUY", entry_price: 2.18, stop_loss: 2.08, take_profit: 2.42, confidence: 71, reason: "Breakout sobre resistencia con volumen 2.1x + Ichimoku alcista" },
  { symbol: "AVAX/USDT", signal: "SELL", entry_price: 38.7, stop_loss: 40.2, take_profit: 35.8, confidence: 52, reason: "Precio bajo Ichimoku Cloud + histograma MACD decreciente" },
  { symbol: "BNB/USDT", signal: "HOLD", entry_price: 612, stop_loss: 598, take_profit: 635, confidence: 32, reason: "Señales mixtas — esperando confirmación de tendencia" },
];

const signalLabels: Record<string, string> = { BUY: "COMPRAR", SELL: "VENDER", HOLD: "MANTENER" };

async function fetchSignals(): Promise<SpotSignal[]> {
  // En producción: llamar a /api/v1/signals/scan
  return demoSignals;
}

interface Props {
  onSelect?: (symbol: string) => void;
  standalone?: boolean;
}

export default function SignalsTable({ onSelect, standalone = false }: Props) {
  const { data: signals, countdown, loading, refresh } = useAutoRefresh(fetchSignals, 60);
  const list = signals || [];

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-white font-semibold">Señales Spot en Tiempo Real</h3>
        <CountdownBadge countdown={countdown} loading={loading} onRefresh={refresh} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-text-muted text-xs uppercase border-b border-gray-800">
              <th className="px-5 py-3 text-left">Activo</th>
              <th className="px-5 py-3 text-left">Señal</th>
              <th className="px-5 py-3 text-right">Entrada</th>
              <th className="px-5 py-3 text-right">Stop Loss</th>
              <th className="px-5 py-3 text-right">Take Profit</th>
              <th className="px-5 py-3 text-right">Confianza</th>
              <th className="px-5 py-3 text-left">Razón</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr
                key={s.symbol}
                onClick={() => onSelect?.(s.symbol)}
                className={clsx(
                  "border-b border-gray-800/50 hover:bg-bg-hover transition-colors",
                  onSelect && "cursor-pointer"
                )}
              >
                <td className="px-5 py-3 font-medium text-white">{s.symbol}</td>
                <td className="px-5 py-3">
                  <span className={clsx(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border",
                    s.signal === "BUY" ? "bg-accent-green/15 text-accent-green border-accent-green/30" :
                    s.signal === "SELL" ? "bg-accent-red/15 text-accent-red border-accent-red/30" :
                    "bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30"
                  )}>
                    {signalLabels[s.signal]}
                  </span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-text-primary text-sm">${s.entry_price.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-mono text-accent-red text-sm">${s.stop_loss.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-mono text-accent-green text-sm">${s.take_profit.toLocaleString()}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-12 bg-gray-700 rounded-full h-1.5">
                      <div
                        className={clsx("h-1.5 rounded-full", s.confidence >= 60 ? "bg-accent-green" : s.confidence >= 40 ? "bg-accent-yellow" : "bg-accent-red")}
                        style={{ width: `${s.confidence}%` }}
                      />
                    </div>
                    <span className="text-text-secondary text-xs font-mono">{s.confidence}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-text-secondary text-xs max-w-[250px] truncate" title={s.reason}>
                  {s.reason}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-text-muted">
                  Sin señales disponibles. Actualizando en {countdown}s...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
