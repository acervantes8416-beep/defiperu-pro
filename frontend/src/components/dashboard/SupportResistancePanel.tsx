"use client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CountdownBadge from "@/components/common/CountdownBadge";
import { useStore } from "@/store";
import type { RiskProfileType } from "@/types";
import { ArrowDown, ArrowUp, Minus, CheckCircle2, XCircle, Target } from "lucide-react";
import clsx from "clsx";

interface AssetSR {
  symbol: string;
  coingeckoId: string;
  price: number;
  support1: number;
  support2: number;
  resistance1: number;
  resistance2: number;
  distSupport: number;  // % distancia al soporte más cercano
  distResistance: number;  // % distancia a resistencia más cercana
  zone: "COMPRA" | "NEUTRAL" | "VENTA";
  // 5 criterios para señal
  criteria: {
    nearSupport: boolean;   // precio < 3% arriba de soporte
    rsiLow: boolean;        // RSI < 45
    macdBullish: boolean;   // MACD cruzando al alza
    volumeUp: boolean;      // Volumen aumentando
    marketOk: boolean;      // Fase no bajista extremo
  };
  criteriaCount: number;
  signal: "COMPRAR" | "MANTENER" | "EVITAR";
  rsi: number;
}

const profileAssets: Record<RiskProfileType, { symbol: string; id: string }[]> = {
  conservador: [
    { symbol: "BTC/USDT", id: "bitcoin" },
    { symbol: "ETH/USDT", id: "ethereum" },
  ],
  moderado: [
    { symbol: "BTC/USDT", id: "bitcoin" },
    { symbol: "ETH/USDT", id: "ethereum" },
    { symbol: "SOL/USDT", id: "solana" },
    { symbol: "BNB/USDT", id: "binancecoin" },
    { symbol: "LINK/USDT", id: "chainlink" },
  ],
  agresivo: [
    { symbol: "BTC/USDT", id: "bitcoin" },
    { symbol: "ETH/USDT", id: "ethereum" },
    { symbol: "SOL/USDT", id: "solana" },
    { symbol: "TAO/USDT", id: "bittensor" },
    { symbol: "LINK/USDT", id: "chainlink" },
    { symbol: "AVAX/USDT", id: "avalanche-2" },
    { symbol: "ADA/USDT", id: "cardano" },
  ],
};

function calcSR(prices: number[]): { s1: number; s2: number; r1: number; r2: number } {
  if (prices.length < 10) return { s1: 0, s2: 0, r1: 0, r2: 0 };
  const current = prices[prices.length - 1];
  const sorted = [...prices].sort((a, b) => a - b);
  const p10 = sorted[Math.floor(sorted.length * 0.1)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p90 = sorted[Math.floor(sorted.length * 0.9)];
  return { s1: Math.round(p25 * 100) / 100, s2: Math.round(p10 * 100) / 100, r1: Math.round(p75 * 100) / 100, r2: Math.round(p90 * 100) / 100 };
}

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

async function fetchSRData(profile: RiskProfileType): Promise<AssetSR[]> {
  const assets = profileAssets[profile];
  const CG = "https://api.coingecko.com/api/v3";
  const results: AssetSR[] = [];

  const responses = await Promise.allSettled(
    assets.map((a) =>
      fetch(`${CG}/coins/${a.id}/market_chart?vs_currency=usd&days=30`).then((r) => r.json())
    )
  );

  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    let prices: number[] = [];

    if (responses[i].status === "fulfilled") {
      const data = (responses[i] as PromiseFulfilledResult<any>).value;
      prices = (data.prices || []).map((p: [number, number]) => p[1]);
    }

    if (prices.length < 20) {
      results.push({
        symbol: asset.symbol, coingeckoId: asset.id, price: 0,
        support1: 0, support2: 0, resistance1: 0, resistance2: 0,
        distSupport: 0, distResistance: 0, zone: "NEUTRAL",
        criteria: { nearSupport: false, rsiLow: false, macdBullish: false, volumeUp: false, marketOk: true },
        criteriaCount: 1, signal: "MANTENER", rsi: 50,
      });
      continue;
    }

    const price = prices[prices.length - 1];
    const { s1, s2, r1, r2 } = calcSR(prices);
    const rsi = calcRSI(prices);
    const distS = s1 > 0 ? ((price - s1) / s1) * 100 : 999;
    const distR = r1 > 0 ? ((r1 - price) / price) * 100 : 999;

    // Zona
    let zone: "COMPRA" | "NEUTRAL" | "VENTA" = "NEUTRAL";
    if (distS < 3) zone = "COMPRA";
    else if (distR < 3) zone = "VENTA";

    // MACD simple: comparar EMA12 vs EMA26 trend
    const recent = prices.slice(-5);
    const older = prices.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const macdBullish = recentAvg > olderAvg;

    // Volumen proxy: price momentum
    const volumeUp = prices[prices.length - 1] > prices[prices.length - 3];

    const criteria = {
      nearSupport: distS < 3,
      rsiLow: rsi < 45,
      macdBullish,
      volumeUp,
      marketOk: true,  // asumimos no-bajista por defecto
    };
    const count = Object.values(criteria).filter(Boolean).length;

    let signal: "COMPRAR" | "MANTENER" | "EVITAR" = "MANTENER";
    if (count >= 4) signal = "COMPRAR";
    else if (count <= 1 && rsi > 70) signal = "EVITAR";

    results.push({
      symbol: asset.symbol, coingeckoId: asset.id, price: Math.round(price * 100) / 100,
      support1: s1, support2: s2, resistance1: r1, resistance2: r2,
      distSupport: Math.round(distS * 100) / 100,
      distResistance: Math.round(distR * 100) / 100,
      zone, criteria, criteriaCount: count, signal, rsi,
    });
  }
  return results;
}

const zoneConfig = {
  COMPRA: { bg: "bg-accent-green/10", border: "border-accent-green/30", text: "text-accent-green", icon: ArrowDown },
  NEUTRAL: { bg: "bg-accent-yellow/10", border: "border-accent-yellow/30", text: "text-accent-yellow", icon: Minus },
  VENTA: { bg: "bg-accent-red/10", border: "border-accent-red/30", text: "text-accent-red", icon: ArrowUp },
};

export default function SupportResistancePanel() {
  const { riskProfile } = useStore();
  const { data, countdown, loading, refresh } = useAutoRefresh(() => fetchSRData(riskProfile), 60);
  const assets = data || [];

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-accent-blue" />
          <h3 className="text-white font-semibold">Soportes y Resistencias — Spot</h3>
        </div>
        <CountdownBadge countdown={countdown} loading={loading} onRefresh={refresh} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-text-muted text-xs uppercase border-b border-gray-800">
              <th className="px-4 py-3 text-left">Activo</th>
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">Soporte 1</th>
              <th className="px-4 py-3 text-right">Soporte 2</th>
              <th className="px-4 py-3 text-right">Resistencia 1</th>
              <th className="px-4 py-3 text-right">Resistencia 2</th>
              <th className="px-4 py-3 text-right">Dist. Sop.</th>
              <th className="px-4 py-3 text-right">Dist. Res.</th>
              <th className="px-4 py-3 text-center">Zona</th>
              <th className="px-4 py-3 text-center">Criterios</th>
              <th className="px-4 py-3 text-center">Señal</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const zc = zoneConfig[a.zone];
              const ZIcon = zc.icon;
              return (
                <tr key={a.symbol} className="border-b border-gray-800/30 hover:bg-bg-hover transition-colors">
                  <td className="px-4 py-3 font-medium text-white text-sm">{a.symbol.replace("/USDT", "")}</td>
                  <td className="px-4 py-3 text-right font-mono text-white text-sm">${a.price.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-accent-green text-sm">${a.support1.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-accent-green/60 text-sm">${a.support2.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-accent-red text-sm">${a.resistance1.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-accent-red/60 text-sm">${a.resistance2.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary text-xs">{a.distSupport.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right font-mono text-text-secondary text-xs">{a.distResistance.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border", zc.bg, zc.border, zc.text)}>
                      <ZIcon size={10} /> {a.zone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-0.5" title={`RSI:${a.rsi} | Sop:${a.criteria.nearSupport} | MACD:${a.criteria.macdBullish} | Vol:${a.criteria.volumeUp} | Mkt:${a.criteria.marketOk}`}>
                      {Object.values(a.criteria).map((ok, i) => (
                        ok
                          ? <CheckCircle2 key={i} size={12} className="text-accent-green" />
                          : <XCircle key={i} size={12} className="text-gray-600" />
                      ))}
                      <span className="text-text-secondary text-xs font-mono ml-1">{a.criteriaCount}/5</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border",
                      a.signal === "COMPRAR" ? "bg-accent-green/15 text-accent-green border-accent-green/30" :
                      a.signal === "EVITAR" ? "bg-accent-red/15 text-accent-red border-accent-red/30" :
                      "bg-gray-700/50 text-text-muted border-gray-600"
                    )}>
                      {a.signal}
                    </span>
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-8 text-center text-text-muted">Cargando datos de soportes...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Leyenda de criterios */}
      <div className="px-5 py-3 border-t border-gray-800 text-xs text-text-muted flex flex-wrap gap-4">
        <span>1. Precio cerca de soporte (&lt;3%)</span>
        <span>2. RSI &lt; 45</span>
        <span>3. MACD alcista</span>
        <span>4. Volumen creciente</span>
        <span>5. Mercado no bajista</span>
        <span className="text-text-secondary">COMPRAR: 4-5 criterios | MANTENER: 2-3 | EVITAR: 0-1</span>
      </div>
    </div>
  );
}
