"use client";
import { useState } from "react";
import SignalBadge from "@/components/dashboard/SignalBadge";

const demoAnalysis = [
  {
    symbol: "BTC/USDT", signal: "BUY" as const, metaScore: 62.4, confidence: 78,
    entry: 98450, sl: 96200, tp: 103500, rr: 2.24, position: 5.2,
    strategies: [
      { name: "Trend Following", signal: "BUY", confidence: 82, reasons: ["EMA20 > EMA50 > EMA200", "Histograma MACD creciente", "Volumen 1.8x promedio"] },
      { name: "Mean Reversion", signal: "BUY", confidence: 55, reasons: ["RSI en 42, recuperándose desde 35", "Precio cerca de Bollinger media"] },
      { name: "Breakout", signal: "BUY", confidence: 68, reasons: ["Precio sobre Ichimoku Cloud", "Resistencia en 99000 testeada 3 veces"] },
    ],
  },
  {
    symbol: "ETH/USDT", signal: "BUY" as const, metaScore: 45.1, confidence: 65,
    entry: 3420, sl: 3310, tp: 3650, rr: 2.09, position: 4.1,
    strategies: [
      { name: "Trend Following", signal: "BUY", confidence: 70, reasons: ["EMAs alineadas alcistas", "MACD sobre línea signal"] },
      { name: "Mean Reversion", signal: "HOLD", confidence: 40, reasons: ["RSI neutral en 52"] },
      { name: "Breakout", signal: "BUY", confidence: 62, reasons: ["Pico de volumen detectado"] },
    ],
  },
  {
    symbol: "SOL/USDT", signal: "SELL" as const, metaScore: -38.2, confidence: 58,
    entry: 185.4, sl: 192.5, tp: 172.0, rr: 1.89, position: 3.8,
    strategies: [
      { name: "Trend Following", signal: "SELL", confidence: 65, reasons: ["Death cross EMA20/50", "Debajo de EMA200"] },
      { name: "Mean Reversion", signal: "SELL", confidence: 60, reasons: ["RSI sobrecomprado en 72, descendiendo"] },
      { name: "Breakout", signal: "HOLD", confidence: 30, reasons: ["Sin nivel de breakout claro"] },
    ],
  },
];

export default function SignalsPage() {
  const [selected, setSelected] = useState(0);
  const s = demoAnalysis[selected];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Análisis de Señales — Spot</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de señales */}
        <div className="space-y-3">
          {demoAnalysis.map((item, i) => (
            <button
              key={item.symbol}
              onClick={() => setSelected(i)}
              className={`w-full text-left bg-bg-card border rounded-xl p-4 transition-all ${
                selected === i ? "border-accent-blue" : "border-gray-800 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">{item.symbol}</span>
                <SignalBadge signal={item.signal} size="sm" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-text-muted">Confianza</div>
                  <div className="text-white font-mono">{item.confidence}%</div>
                </div>
                <div>
                  <div className="text-text-muted">Meta Score</div>
                  <div className={`font-mono ${item.metaScore > 0 ? "text-accent-green" : "text-accent-red"}`}>
                    {item.metaScore > 0 ? "+" : ""}{item.metaScore}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted">R/R</div>
                  <div className="text-accent-blue font-mono">{item.rr}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Análisis detallado */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`bg-bg-card border rounded-xl p-6 ${s.signal === "BUY" ? "border-accent-green/30 glow-green" : s.signal === "SELL" ? "border-accent-red/30 glow-red" : "border-gray-800"}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{s.symbol}</h2>
              <SignalBadge signal={s.signal} confidence={s.confidence} size="lg" />
            </div>

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

          {/* Desglose por estrategia */}
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
                <div
                  className={`h-1.5 rounded-full ${strat.signal === "BUY" ? "bg-accent-green" : strat.signal === "SELL" ? "bg-accent-red" : "bg-accent-yellow"}`}
                  style={{ width: `${strat.confidence}%` }}
                />
              </div>
              <ul className="space-y-1">
                {strat.reasons.map((r, i) => (
                  <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                    <span className="text-text-muted mt-0.5">-</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
