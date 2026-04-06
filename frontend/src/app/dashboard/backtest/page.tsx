"use client";
import { useState } from "react";
import MetricCard from "@/components/dashboard/MetricCard";
import EquityCurve from "@/components/charts/EquityCurve";
import { FlaskConical } from "lucide-react";

const demoResult = {
  initial: 10000,
  final: 14250,
  returnPct: 42.5,
  trades: 87,
  winRate: 62.1,
  maxDD: 11.3,
  sharpe: 1.92,
  profitFactor: 1.85,
  avgWin: 245,
  avgLoss: -132,
  equity: Array.from({ length: 300 }, (_, i) => {
    const base = 10000 + i * 14;
    return base + Math.sin(i * 0.05) * 500 + Math.random() * 200;
  }),
  trades_list: [
    { date: "2025-12-01", symbol: "BTC/USDT", side: "COMPRA", entry: 94200, exit: 96800, pnl: 312, pnlPct: 2.8, strategy: "trend_following" },
    { date: "2025-12-03", symbol: "ETH/USDT", side: "COMPRA", entry: 3280, exit: 3150, pnl: -187, pnlPct: -4.0, strategy: "mean_reversion" },
    { date: "2025-12-05", symbol: "SOL/USDT", side: "VENTA", entry: 192, exit: 183, pnl: 245, pnlPct: 4.7, strategy: "breakout" },
    { date: "2025-12-08", symbol: "BTC/USDT", side: "COMPRA", entry: 97100, exit: 99400, pnl: 456, pnlPct: 2.4, strategy: "trend_following" },
    { date: "2025-12-10", symbol: "XRP/USDT", side: "COMPRA", entry: 2.05, exit: 2.18, pnl: 178, pnlPct: 6.3, strategy: "breakout" },
  ],
};

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [capital, setCapital] = useState("10000");
  const [confidence, setConfidence] = useState("40");
  const [running, setRunning] = useState(false);
  const [hasResult, setHasResult] = useState(true);

  const runBacktest = () => {
    setRunning(true);
    setTimeout(() => { setRunning(false); setHasResult(true); }, 2000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <FlaskConical size={24} /> Motor de Backtesting — Spot
      </h1>

      {/* Configuración */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1">Par</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              {["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">Temporalidad</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              {["5m", "15m", "1h", "4h", "1d"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">Capital Inicial</label>
            <input value={capital} onChange={(e) => setCapital(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">Confianza Mín.</label>
            <input value={confidence} onChange={(e) => setConfidence(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <div className="flex items-end">
            <button onClick={runBacktest} disabled={running} className="w-full bg-gradient-to-r from-accent-blue to-accent-purple text-white py-2 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">
              {running ? "Ejecutando..." : "Ejecutar Backtest"}
            </button>
          </div>
        </div>
      </div>

      {hasResult && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <MetricCard title="Capital Final" value={demoResult.final} format="currency" />
            <MetricCard title="Retorno Total" value={demoResult.returnPct} format="percent" change={demoResult.returnPct} />
            <MetricCard title="Operaciones" value={demoResult.trades} />
            <MetricCard title="Tasa Acierto" value={demoResult.winRate} format="percent" />
            <MetricCard title="Máx. Drawdown" value={-demoResult.maxDD} format="percent" />
            <MetricCard title="Ratio Sharpe" value={demoResult.sharpe} format="ratio" />
            <MetricCard title="Factor Beneficio" value={demoResult.profitFactor} format="ratio" />
            <MetricCard title="Ganancia Prom." value={demoResult.avgWin} format="currency" />
          </div>

          <EquityCurve data={demoResult.equity} title="Curva de Equity — Backtest Spot" height={350} />

          <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h3 className="text-white font-semibold">Historial de Operaciones</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-text-muted text-xs uppercase border-b border-gray-800">
                  <th className="px-5 py-3 text-left">Fecha</th>
                  <th className="px-5 py-3 text-left">Par</th>
                  <th className="px-5 py-3 text-left">Tipo</th>
                  <th className="px-5 py-3 text-right">Entrada</th>
                  <th className="px-5 py-3 text-right">Salida</th>
                  <th className="px-5 py-3 text-right">PnL</th>
                  <th className="px-5 py-3 text-right">PnL %</th>
                  <th className="px-5 py-3 text-left">Estrategia</th>
                </tr>
              </thead>
              <tbody>
                {demoResult.trades_list.map((t, i) => (
                  <tr key={i} className="border-b border-gray-800/50 hover:bg-bg-hover">
                    <td className="px-5 py-3 text-text-secondary text-sm">{t.date}</td>
                    <td className="px-5 py-3 text-white font-medium">{t.symbol}</td>
                    <td className={`px-5 py-3 font-medium ${t.side === "COMPRA" ? "text-accent-green" : "text-accent-red"}`}>{t.side}</td>
                    <td className="px-5 py-3 text-right font-mono text-text-primary">${t.entry.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right font-mono text-text-primary">${t.exit.toLocaleString()}</td>
                    <td className={`px-5 py-3 text-right font-mono ${t.pnl > 0 ? "text-accent-green" : "text-accent-red"}`}>
                      {t.pnl > 0 ? "+" : ""}${t.pnl}
                    </td>
                    <td className={`px-5 py-3 text-right font-mono ${t.pnlPct > 0 ? "text-accent-green" : "text-accent-red"}`}>
                      {t.pnlPct > 0 ? "+" : ""}{t.pnlPct}%
                    </td>
                    <td className="px-5 py-3 text-text-muted text-sm capitalize">{t.strategy.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
