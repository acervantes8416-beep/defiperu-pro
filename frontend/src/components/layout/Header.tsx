"use client";
import { useStore } from "@/store";
import { Bell, LogOut } from "lucide-react";

const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];
const symbols = [
  "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT",
  "ADA/USDT", "AVAX/USDT", "DOT/USDT", "LINK/USDT",
];

export default function Header() {
  const { selectedSymbol, selectedTimeframe, setSymbol, setTimeframe, logout, user, riskProfile } = useStore();

  return (
    <header className="h-16 bg-bg-card border-b border-gray-800 flex items-center px-6 gap-4">
      {/* Selector de par */}
      <select
        value={selectedSymbol}
        onChange={(e) => setSymbol(e.target.value)}
        className="bg-bg border border-gray-700 text-white rounded-lg px-3 py-1.5 text-sm"
      >
        {symbols.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Selector de timeframe */}
      <div className="flex gap-1">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedTimeframe === tf
                ? "bg-accent-blue text-white"
                : "text-text-secondary hover:text-white hover:bg-bg-hover"
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Perfil activo */}
      <span className="text-xs text-text-muted bg-bg px-2 py-1 rounded capitalize">
        {riskProfile}
      </span>

      <div className="flex-1" />

      {/* Indicador en vivo */}
      <div className="flex items-center gap-2 text-xs">
        <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
        <span className="text-text-secondary">En vivo · Spot</span>
      </div>

      <button className="text-text-secondary hover:text-white p-2">
        <Bell size={18} />
      </button>

      {user && <span className="text-sm text-text-secondary">{user.username}</span>}

      <button onClick={logout} className="text-text-secondary hover:text-accent-red p-2" title="Cerrar sesión">
        <LogOut size={18} />
      </button>
    </header>
  );
}
