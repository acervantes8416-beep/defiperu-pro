"use client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CountdownBadge from "@/components/common/CountdownBadge";
import { BarChart3, TrendingUp, TrendingDown, ShieldAlert } from "lucide-react";
import clsx from "clsx";

interface Coin {
  rank: number;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change_1h: number;
  change_24h: number;
  change_7d: number;
  market_cap: number;
  volume_24h: number;
  signal: "COMPRAR" | "MANTENER" | "EVITAR";
}

async function fetchTop100(): Promise<Coin[]> {
  try {
    const resp = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?" +
      new URLSearchParams({
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: "100",
        page: "1",
        sparkline: "false",
        price_change_percentage: "1h,24h,7d",
      })
    );
    const coins = await resp.json();
    return coins.map((c: any) => {
      const ch24 = c.price_change_percentage_24h || 0;
      const ch7d = c.price_change_percentage_7d_in_currency || 0;
      let signal: "COMPRAR" | "MANTENER" | "EVITAR" = "MANTENER";
      if (ch24 > 3 && ch7d > 5) signal = "COMPRAR";
      else if (ch24 < -5 || ch7d < -10) signal = "EVITAR";

      return {
        rank: c.market_cap_rank || 0,
        symbol: (c.symbol || "").toUpperCase(),
        name: c.name || "",
        image: c.image || "",
        price: c.current_price || 0,
        change_1h: Math.round((c.price_change_percentage_1h_in_currency || 0) * 100) / 100,
        change_24h: Math.round(ch24 * 100) / 100,
        change_7d: Math.round(ch7d * 100) / 100,
        market_cap: c.market_cap || 0,
        volume_24h: c.total_volume || 0,
        signal,
      };
    });
  } catch {
    return [];
  }
}

function formatNum(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString()}`;
}

function ChangeBadge({ value }: { value: number }) {
  return (
    <span className={clsx("font-mono text-xs", value >= 0 ? "text-accent-green" : "text-accent-red")}>
      {value >= 0 ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const config = {
    COMPRAR: { bg: "bg-accent-green/15", text: "text-accent-green", border: "border-accent-green/30", icon: TrendingUp },
    MANTENER: { bg: "bg-accent-yellow/15", text: "text-accent-yellow", border: "border-accent-yellow/30", icon: ShieldAlert },
    EVITAR: { bg: "bg-accent-red/15", text: "text-accent-red", border: "border-accent-red/30", icon: TrendingDown },
  }[signal] || { bg: "bg-gray-700", text: "text-text-muted", border: "border-gray-600", icon: ShieldAlert };
  const Icon = config.icon;

  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border", config.bg, config.text, config.border)}>
      <Icon size={10} /> {signal}
    </span>
  );
}

export default function RendimientosPage() {
  const { data: coins, countdown, loading, refresh } = useAutoRefresh(fetchTop100, 60);

  const buyCount = coins?.filter((c) => c.signal === "COMPRAR").length || 0;
  const avoidCount = coins?.filter((c) => c.signal === "EVITAR").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} /> Rendimientos de Mercado
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs">
            <span className="text-accent-green">{buyCount} oportunidades</span>
            <span className="text-accent-red">{avoidCount} a evitar</span>
          </div>
          <CountdownBadge countdown={countdown} loading={loading} onRefresh={refresh} />
        </div>
      </div>

      <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-text-muted text-xs uppercase border-b border-gray-800 sticky top-0 bg-bg-card">
                <th className="px-4 py-3 text-left w-12">#</th>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">1h</th>
                <th className="px-4 py-3 text-right">24h</th>
                <th className="px-4 py-3 text-right">7d</th>
                <th className="px-4 py-3 text-right">Market Cap</th>
                <th className="px-4 py-3 text-right">Volumen 24h</th>
                <th className="px-4 py-3 text-center">Señal</th>
              </tr>
            </thead>
            <tbody>
              {(coins || []).map((c) => (
                <tr key={c.rank} className="border-b border-gray-800/30 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-2.5 text-text-muted text-sm font-mono">{c.rank}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      {c.image && (
                        <img src={c.image} alt={c.symbol} className="w-6 h-6 rounded-full" loading="lazy" />
                      )}
                      <div>
                        <span className="text-white font-medium text-sm">{c.name}</span>
                        <span className="text-text-muted text-xs ml-1.5">{c.symbol}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-white text-sm">
                    ${c.price < 1 ? c.price.toFixed(6) : c.price < 10 ? c.price.toFixed(4) : c.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-2.5 text-right"><ChangeBadge value={c.change_1h} /></td>
                  <td className="px-4 py-2.5 text-right"><ChangeBadge value={c.change_24h} /></td>
                  <td className="px-4 py-2.5 text-right"><ChangeBadge value={c.change_7d} /></td>
                  <td className="px-4 py-2.5 text-right text-text-secondary text-sm font-mono">{formatNum(c.market_cap)}</td>
                  <td className="px-4 py-2.5 text-right text-text-secondary text-sm font-mono">{formatNum(c.volume_24h)}</td>
                  <td className="px-4 py-2.5 text-center"><SignalBadge signal={c.signal} /></td>
                </tr>
              ))}
              {(!coins || coins.length === 0) && !loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-text-muted">
                    No se pudieron cargar los datos. Reintentando en {countdown}s...
                  </td>
                </tr>
              )}
              {loading && !coins && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-text-muted">
                    Cargando datos de mercado...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
