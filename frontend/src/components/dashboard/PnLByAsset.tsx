"use client";
import { useStore } from "@/store";
import type { RiskProfileType } from "@/types";
import { TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";

interface AssetPnL {
  symbol: string;
  entry_price: number;
  current_price: number;
  quantity: number;
  value_usd: number;
  pnl_usd: number;
  pnl_pct: number;
  change_24h: number;
}

const demoAssets: Record<RiskProfileType, AssetPnL[]> = {
  conservador: [
    { symbol: "BTC/USDT", entry_price: 95200, current_price: 98450, quantity: 0.0525, value_usd: 5168.63, pnl_usd: 170.63, pnl_pct: 3.41, change_24h: 1.2 },
    { symbol: "ETH/USDT", entry_price: 3280, current_price: 3420, quantity: 0.877, value_usd: 2999.54, pnl_usd: 122.78, pnl_pct: 4.27, change_24h: 2.1 },
  ],
  moderado: [
    { symbol: "BTC/USDT", entry_price: 95200, current_price: 98450, quantity: 0.0356, value_usd: 3504.82, pnl_usd: 115.72, pnl_pct: 3.41, change_24h: 1.2 },
    { symbol: "ETH/USDT", entry_price: 3280, current_price: 3420, quantity: 0.731, value_usd: 2499.82, pnl_usd: 102.34, pnl_pct: 4.27, change_24h: 2.1 },
    { symbol: "SOL/USDT", entry_price: 178.50, current_price: 185.40, quantity: 10.78, value_usd: 1998.61, pnl_usd: 74.38, pnl_pct: 3.87, change_24h: -0.8 },
    { symbol: "BNB/USDT", entry_price: 598.00, current_price: 612.00, quantity: 1.634, value_usd: 1000.01, pnl_usd: 22.88, pnl_pct: 2.34, change_24h: 0.5 },
    { symbol: "LINK/USDT", entry_price: 17.80, current_price: 18.50, quantity: 27.03, value_usd: 500.06, pnl_usd: 18.92, pnl_pct: 3.93, change_24h: 1.8 },
  ],
  agresivo: [
    { symbol: "BTC/USDT", entry_price: 95200, current_price: 98450, quantity: 0.0254, value_usd: 2500.63, pnl_usd: 82.58, pnl_pct: 3.41, change_24h: 1.2 },
    { symbol: "ETH/USDT", entry_price: 3280, current_price: 3420, quantity: 0.585, value_usd: 2000.70, pnl_usd: 81.90, pnl_pct: 4.27, change_24h: 2.1 },
    { symbol: "SOL/USDT", entry_price: 178.50, current_price: 185.40, quantity: 8.09, value_usd: 1500.19, pnl_usd: 55.82, pnl_pct: 3.87, change_24h: -0.8 },
    { symbol: "TAO/USDT", entry_price: 380.00, current_price: 400.00, quantity: 3.75, value_usd: 1500.00, pnl_usd: 75.00, pnl_pct: 5.26, change_24h: 4.2 },
    { symbol: "LINK/USDT", entry_price: 17.80, current_price: 18.50, quantity: 27.03, value_usd: 500.06, pnl_usd: 18.92, pnl_pct: 3.93, change_24h: 1.8 },
    { symbol: "AVAX/USDT", entry_price: 36.20, current_price: 38.70, quantity: 12.92, value_usd: 500.00, pnl_usd: 32.30, pnl_pct: 6.91, change_24h: 3.2 },
    { symbol: "ADA/USDT", entry_price: 0.68, current_price: 0.72, quantity: 694.44, value_usd: 500.00, pnl_usd: 27.78, pnl_pct: 5.88, change_24h: 0.9 },
  ],
};

export default function PnLByAsset() {
  const { riskProfile } = useStore();
  const assets = demoAssets[riskProfile];
  const totalPnl = assets.reduce((s, a) => s + a.pnl_usd, 0);
  const totalValue = assets.reduce((s, a) => s + a.value_usd, 0);

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-white font-semibold">PnL por Activo — Spot</h3>
        <span className={clsx("text-sm font-mono font-semibold", totalPnl >= 0 ? "text-accent-green" : "text-accent-red")}>
          {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
        </span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-text-muted text-xs uppercase border-b border-gray-800">
            <th className="px-5 py-2.5 text-left">Activo</th>
            <th className="px-5 py-2.5 text-right">Precio</th>
            <th className="px-5 py-2.5 text-right">Cantidad</th>
            <th className="px-5 py-2.5 text-right">Valor USD</th>
            <th className="px-5 py-2.5 text-right">PnL</th>
            <th className="px-5 py-2.5 text-right">24h</th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.symbol} className="border-b border-gray-800/30 hover:bg-bg-hover transition-colors">
              <td className="px-5 py-3">
                <span className="text-white font-medium text-sm">{a.symbol.replace("/USDT", "")}</span>
              </td>
              <td className="px-5 py-3 text-right font-mono text-text-primary text-sm">
                ${a.current_price.toLocaleString()}
              </td>
              <td className="px-5 py-3 text-right font-mono text-text-secondary text-sm">
                {a.quantity.toFixed(a.current_price > 100 ? 4 : 2)}
              </td>
              <td className="px-5 py-3 text-right font-mono text-white text-sm">
                ${a.value_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
              <td className="px-5 py-3 text-right">
                <div className={clsx("font-mono text-sm font-medium", a.pnl_usd >= 0 ? "text-accent-green" : "text-accent-red")}>
                  {a.pnl_usd >= 0 ? "+" : ""}${a.pnl_usd.toFixed(2)}
                </div>
                <div className={clsx("font-mono text-xs", a.pnl_pct >= 0 ? "text-accent-green/70" : "text-accent-red/70")}>
                  {a.pnl_pct >= 0 ? "+" : ""}{a.pnl_pct.toFixed(2)}%
                </div>
              </td>
              <td className="px-5 py-3 text-right">
                <span className={clsx("inline-flex items-center gap-0.5 text-xs font-mono", a.change_24h >= 0 ? "text-accent-green" : "text-accent-red")}>
                  {a.change_24h >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {a.change_24h >= 0 ? "+" : ""}{a.change_24h}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
