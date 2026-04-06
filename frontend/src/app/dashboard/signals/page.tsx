"use client";
import { useState } from "react";
import SignalBadge from "@/components/dashboard/SignalBadge";
import SignalsTable from "@/components/dashboard/SignalsTable";
import SupportResistancePanel from "@/components/dashboard/SupportResistancePanel";
import { useStore } from "@/store";
import PriceChart from "@/components/charts/PriceChart";

const demoAnalysis = [
  {
    symbol: "BTC/USDT", signal: "BUY" as const, metaScore: 62.4, confidence: 78,
    entry: 98450, sl: 96200, tp: 103500, rr: 2.24, position: 5.2,
    reason: "4/5 criterios: cerca de soporte, RSI 42, MACD alcista, volumen 1.8x",
    criteriaCount: 4,
    strategies: [
      { name: "Trend Following", signal: "BUY", confidence: 82, reasons: ["EMA20 > EMA50 > EMA200", "Histograma MACD creciente"] },
      { name: "Mean Reversion", signal: "BUY", confidence: 55, reasons: ["RSI en 42, recuperándose desde 35"] },
      { name: "Breakout", signal: "BUY", confidence: 68, reasons: ["Precio sobre Ichimoku Cloud"] },
    ],
  },
  {
    symbol: "ETH/USDT", signal: "BUY" as const, metaScore: 45.1, confidence: 65,
    entry: 3420, sl: 3310, tp: 3650, rr: 2.09, position: 4.1,
    reason: "3/5 criterios: RSI 38, MACD positivo, mercado no bajista",
    criteriaCount: 3,
    strategies: [
      { name: "Trend Following", signal: "BUY", confidence: 70, reasons: ["EMAs alineadas alcistas"] },
      { name: "Mean Reversion", signal: "HOLD", confidence: 40, reasons: ["RSI neutral en 52"] },
      { name: "Breakout", signal: "BUY", confidence: 62, reasons: ["Volumen creciente"] },
    ],
  },
  {
    symbol: "SOL/USDT", signal: "SELL" as const, metaScore: -38.2, confidence: 58,
    entry: 185.4, sl: 192.5, tp: 172.0, rr: 1.89, position: 3.8,
    reason: "1/5 criterios: solo mercado no bajista, RSI 72 alto",
    criteriaCount: 1,
    strategies: [
      { name: "Trend Following", signal: "SELL", confidence: 65, reasons: ["Death cross EMA20/50"] },
      { name: "Mean Reversion", signal: "SELL", confidence: 60, reasons: ["RSI sobrecomprado en 72"] },
      { name: "Breakout", signal: "HOLD", confidence: 30, reasons: ["Sin breakout claro"] },
    ],
  },
];

const signalLabels: Record<string, string> = { BUY: "COMPRAR", SELL: "VENDER", HOLD: "MANTENER" };

export default function SignalsPage() {
  const [selected, setSelected] = useState(0);
  const { setSymbol } = useStore();
  const s = demoAnalysis[selected];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Señales de Compra y Venta — Spot</h1>
      <p className="text-text-secondary text-sm">
        Señales basadas en 5 criterios: soporte, RSI, MACD, volumen y fase de mercado. Solo Spot.
      </p>

      {/* Panel de Soportes y Resistencias */}
      <SupportResistancePanel />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {demoAnalysis.map((item, i) => (
            <button
              key={item.symbol}
              onClick={() => { setSelected(i); setSymbol(item.symbol); }}
              className={`w-full text-left bg-bg-card border rounded-xl p-4 transition-all ${
                selected === i ? "border-accent-blue" : "border-gray-800 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">{item.symbol}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted font-mono">{item.criteriaCount}/5</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                    item.signal === "BUY" ? "bg-accent-green/15 text-accent-green border-accent-green/30" :
                    "bg-accent-red/15 text-accent-red border-accent-red/30"
                  }`}>{signalLabels[item.signal]}</span>
                </div>
              </div>
              <p className="text-text-muted text-xs mb-2">{item.reason}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><div className="text-text-muted">Confianza</div><div className="text-white font-mono">{item.confidence}%</div></div>
                <div><div className="text-text-muted">R/R</div><div className="text-accent-blue font-mono">{item.rr}</div></div>
                <div><div className="text-text-muted">Posición</div><div className="text-accent-purple font-mono">{item.position}%</div></div>
              </div>
            </button>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <PriceChart symbol={s.symbol} timeframe="1h" height={350} />

          <div className={`bg-bg-card border rounded-xl p-6 ${s.signal === "BUY" ? "border-accent-green/30 glow-green" : "border-accent-red/30 glow-red"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{s.symbol}</h2>
              <div className="flex items-center gap-3">
                <span className="text-text-muted text-sm font-mono">{s.criteriaCount}/5 criterios</span>
                <SignalBadge signal={s.signal} confidence={s.confidence} size="lg" />
              </div>
            </div>
            <p className="text-text-secondary text-sm mb-4">{s.reason}</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: "Entrada", value: `$${s.entry.toLocaleString()}`, color: "text-white" },
                { label: "Stop Loss", value: `$${s.sl.toLocaleString()}`, color: "text-accent-red" },
                { label: "Take Profit", value: `$${s.tp.toLocaleString()}`, color: "text-accent-green" },
                { label: "R/R", value: s.rr.toFixed(2), color: "text-accent-blue" },
                { label: "Posición", value: `${s.position}%`, color: "text-accent-purple" },
              ].map((item) => (
                <div key={item.label} className="bg-bg/50 rounded-lg p-3 text-center">
                  <div className="text-text-muted text-xs mb-1">{item.label}</div>
                  <div className={`font-mono font-semibold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {s.strategies.map((strat) => (
            <div key={strat.name} className="bg-bg-card border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{strat.name}</h3>
                <div className="flex items-center gap-2">
                  <SignalBadge signal={strat.signal as any} size="sm" />
                  <span className="text-text-muted text-sm">{strat.confidence}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
                <div className={`h-1.5 rounded-full ${strat.signal === "BUY" ? "bg-accent-green" : strat.signal === "SELL" ? "bg-accent-red" : "bg-accent-yellow"}`} style={{ width: `${strat.confidence}%` }} />
              </div>
              <ul className="space-y-1">
                {strat.reasons.map((r, i) => (
                  <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-text-muted">-</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <SignalsTable standalone />
    </div>
  );
}
