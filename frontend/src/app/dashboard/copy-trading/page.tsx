"use client";
import { useState } from "react";
import { Users, Trophy, TrendingUp, Copy } from "lucide-react";

const leaderboard = [
  { rank: 1, username: "AlphaTrader", returnPct: 89.2, winRate: 72.1, sharpe: 2.8, trades: 342, followers: 156, strategy: "Trend Following" },
  { rank: 2, username: "CryptoWhale", returnPct: 67.4, winRate: 68.5, sharpe: 2.3, trades: 218, followers: 98, strategy: "Mixta" },
  { rank: 3, username: "QuantBot_X", returnPct: 54.8, winRate: 65.2, sharpe: 2.1, trades: 567, followers: 74, strategy: "Mean Reversion" },
  { rank: 4, username: "SOL_Maxi", returnPct: 48.3, winRate: 61.8, sharpe: 1.9, trades: 145, followers: 52, strategy: "Breakout" },
  { rank: 5, username: "DeFiNerd", returnPct: 42.1, winRate: 59.4, sharpe: 1.7, trades: 289, followers: 41, strategy: "Trend Following" },
];

const strategies = [
  { name: "Trend Following", return: 34.2, winRate: 62.4, sharpe: 1.9, signals: 1240, bestPair: "BTC/USDT", bestTF: "4h" },
  { name: "Mean Reversion", return: 28.7, winRate: 58.1, sharpe: 1.5, signals: 890, bestPair: "ETH/USDT", bestTF: "1h" },
  { name: "Breakout", return: 22.1, winRate: 51.3, sharpe: 1.3, signals: 456, bestPair: "SOL/USDT", bestTF: "4h" },
];

export default function CopyTradingPage() {
  const [tab, setTab] = useState<"leaders" | "strategies">("leaders");
  const [copying, setCopying] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Users size={24} /> Copy Trading y Rankings — Spot
      </h1>

      <div className="flex gap-2">
        {[
          { id: "leaders" as const, label: "Mejores Traders", icon: Trophy },
          { id: "strategies" as const, label: "Ranking de Estrategias", icon: TrendingUp },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? "bg-accent-blue text-white" : "bg-bg-card text-text-secondary hover:text-white border border-gray-800"
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "leaders" && (
        <div className="space-y-3">
          {leaderboard.map((l) => (
            <div key={l.rank} className="bg-bg-card border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                  l.rank === 1 ? "bg-yellow-500/20 text-yellow-400" :
                  l.rank === 2 ? "bg-gray-400/20 text-gray-300" :
                  l.rank === 3 ? "bg-orange-500/20 text-orange-400" :
                  "bg-gray-700 text-text-muted"
                }`}>
                  {l.rank}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{l.username}</span>
                    <span className="text-xs text-text-muted bg-bg px-2 py-0.5 rounded">{l.strategy}</span>
                    <span className="text-xs text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded">Spot</span>
                  </div>
                  <div className="flex gap-6 mt-1 text-sm">
                    <span className="text-accent-green">+{l.returnPct}% retorno</span>
                    <span className="text-text-secondary">{l.winRate}% acierto</span>
                    <span className="text-text-secondary">Sharpe {l.sharpe}</span>
                    <span className="text-text-muted">{l.trades} ops</span>
                    <span className="text-text-muted">{l.followers} seguidores</span>
                  </div>
                </div>
                <button
                  onClick={() => setCopying(copying === l.username ? null : l.username)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    copying === l.username
                      ? "bg-accent-green text-white"
                      : "bg-bg border border-gray-700 text-text-secondary hover:text-white hover:border-accent-blue"
                  }`}
                >
                  <Copy size={14} />
                  {copying === l.username ? "Copiando" : "Copiar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "strategies" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategies.map((s, i) => (
            <div key={s.name} className="bg-bg-card border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">{s.name}</h3>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? "bg-yellow-500/20 text-yellow-400" : i === 1 ? "bg-gray-400/20 text-gray-300" : "bg-orange-500/20 text-orange-400"
                }`}>{i + 1}</div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-text-muted">Retorno Total</span><span className="text-accent-green font-mono">+{s.return}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Tasa de Acierto</span><span className="text-white font-mono">{s.winRate}%</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Ratio Sharpe</span><span className="text-accent-blue font-mono">{s.sharpe}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Señales Totales</span><span className="text-text-secondary font-mono">{s.signals}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Mejor Par</span><span className="text-text-secondary">{s.bestPair}</span></div>
                <div className="flex justify-between text-sm"><span className="text-text-muted">Mejor Temporalidad</span><span className="text-text-secondary">{s.bestTF}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
