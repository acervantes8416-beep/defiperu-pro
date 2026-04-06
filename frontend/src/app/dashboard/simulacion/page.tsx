"use client";
import { useState, useEffect, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import MetricCard from "@/components/dashboard/MetricCard";
import CountdownBadge from "@/components/common/CountdownBadge";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { LineChart, TrendingUp } from "lucide-react";
import clsx from "clsx";
import type { RiskProfileType } from "@/types";

interface SimulationData {
  profile: string;
  profileName: string;
  days: number;
  initialCapital: number;
  finalValue: number;
  returnPct: number;
  maxDrawdownPct: number;
  evolution: { timestamp: number; value: number }[];
}

const COINGECKO = "https://api.coingecko.com/api/v3";

const profileConfigs: Record<RiskProfileType, {
  name: string;
  color: string;
  allocations: { id: string; symbol: string; pct: number }[];
  cashPct: number;
}> = {
  conservador: {
    name: "Conservador",
    color: "#00d4aa",
    allocations: [
      { id: "bitcoin", symbol: "BTC", pct: 50 },
      { id: "ethereum", symbol: "ETH", pct: 30 },
    ],
    cashPct: 20,
  },
  moderado: {
    name: "Moderado",
    color: "#3b82f6",
    allocations: [
      { id: "bitcoin", symbol: "BTC", pct: 35 },
      { id: "ethereum", symbol: "ETH", pct: 25 },
      { id: "solana", symbol: "SOL", pct: 20 },
      { id: "binancecoin", symbol: "BNB", pct: 10 },
    ],
    cashPct: 10,
  },
  agresivo: {
    name: "Agresivo",
    color: "#8b5cf6",
    allocations: [
      { id: "bitcoin", symbol: "BTC", pct: 25 },
      { id: "ethereum", symbol: "ETH", pct: 20 },
      { id: "solana", symbol: "SOL", pct: 20 },
      { id: "avalanche-2", symbol: "AVAX", pct: 8 },
      { id: "chainlink", symbol: "LINK", pct: 7 },
      { id: "polkadot", symbol: "DOT", pct: 5 },
      { id: "cardano", symbol: "ADA", pct: 5 },
    ],
    cashPct: 10,
  },
};

async function simulateProfile(profile: RiskProfileType, days: number): Promise<SimulationData> {
  const config = profileConfigs[profile];
  const initial = 10000;

  // Fetch historical data for all assets
  const priceData: Record<string, [number, number][]> = {};
  const ids = config.allocations.map((a) => a.id);

  try {
    const responses = await Promise.allSettled(
      ids.map((id) =>
        fetch(`${COINGECKO}/coins/${id}/market_chart?vs_currency=usd&days=${days}`)
          .then((r) => r.json())
      )
    );

    ids.forEach((id, i) => {
      if (responses[i].status === "fulfilled") {
        priceData[id] = (responses[i] as PromiseFulfilledResult<any>).value.prices || [];
      }
    });
  } catch { /* silent */ }

  // Find min length for alignment
  const lengths = Object.values(priceData).map((p) => p.length);
  const minLen = lengths.length > 0 ? Math.min(...lengths) : 0;

  if (minLen === 0) {
    return {
      profile, profileName: config.name, days, initialCapital: initial,
      finalValue: initial, returnPct: 0, maxDrawdownPct: 0, evolution: [],
    };
  }

  // Simulate portfolio evolution
  const evolution: { timestamp: number; value: number }[] = [];
  let peak = 0;
  let maxDd = 0;

  for (let i = 0; i < minLen; i++) {
    let value = initial * (config.cashPct / 100);
    for (const alloc of config.allocations) {
      const prices = priceData[alloc.id];
      if (prices && prices[0] && prices[i] && prices[0][1] > 0) {
        value += (initial * alloc.pct / 100) * (prices[i][1] / prices[0][1]);
      }
    }
    evolution.push({ timestamp: Object.values(priceData)[0][i][0], value: Math.round(value * 100) / 100 });
    if (value > peak) peak = value;
    const dd = peak > 0 ? ((peak - value) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }

  const final = evolution[evolution.length - 1]?.value || initial;
  return {
    profile,
    profileName: config.name,
    days,
    initialCapital: initial,
    finalValue: final,
    returnPct: Math.round(((final - initial) / initial) * 10000) / 100,
    maxDrawdownPct: Math.round(maxDd * 100) / 100,
    evolution,
  };
}

export default function SimulacionPage() {
  const [days, setDays] = useState(30);
  const [results, setResults] = useState<Record<RiskProfileType, SimulationData | null>>({
    conservador: null, moderado: null, agresivo: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [c, m, a] = await Promise.all([
      simulateProfile("conservador", days),
      simulateProfile("moderado", days),
      simulateProfile("agresivo", days),
    ]);
    setResults({ conservador: c, moderado: m, agresivo: a });
    setLoading(false);
    return true;
  }, [days]);

  const { countdown, refresh } = useAutoRefresh(fetchAll, 300); // Cada 5 min (datos no cambian tanto)

  const periodBtns = [
    { label: "30 días", value: 30 },
    { label: "90 días", value: 90 },
    { label: "1 año", value: 365 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <LineChart size={24} /> Simulación Histórica
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex gap-1">
            {periodBtns.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  days === p.value ? "bg-accent-blue text-white" : "text-text-secondary hover:text-white bg-bg-card border border-gray-700"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <CountdownBadge countdown={countdown} loading={loading} onRefresh={refresh} />
        </div>
      </div>

      <p className="text-text-secondary text-sm">
        Evolución simulada de $10,000 USD invertidos según cada perfil de riesgo, usando precios reales históricos de CoinGecko. Solo operaciones Spot.
      </p>

      {/* Cards de resultados por perfil */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["conservador", "moderado", "agresivo"] as RiskProfileType[]).map((p) => {
          const r = results[p];
          const config = profileConfigs[p];
          if (!r) return (
            <div key={p} className="bg-bg-card border border-gray-800 rounded-xl p-5 animate-pulse">
              <div className="h-32 bg-gray-700/30 rounded" />
            </div>
          );

          return (
            <div key={p} className="bg-bg-card border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">{config.name}</h3>
                <span className={clsx("text-sm font-bold font-mono", r.returnPct >= 0 ? "text-accent-green" : "text-accent-red")}>
                  {r.returnPct >= 0 ? "+" : ""}{r.returnPct}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div>
                  <span className="text-text-muted">Capital Final</span>
                  <div className="text-white font-mono font-semibold">${r.finalValue.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-text-muted">Máx. Drawdown</span>
                  <div className="text-accent-red font-mono font-semibold">-{r.maxDrawdownPct}%</div>
                </div>
              </div>
              <div className="text-xs text-text-muted mb-1">Distribución:</div>
              <div className="text-xs text-text-secondary">
                {config.allocations.map((a) => `${a.symbol} ${a.pct}%`).join(" · ")} · USDT {config.cashPct}%
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico comparativo */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Evolución Comparativa — Últimos {days} días</h3>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart>
            <defs>
              <linearGradient id="gradCons" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.15} /><stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradMod" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAgr" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(ts) => new Date(ts).toLocaleDateString("es-PE", { month: "short", day: "numeric" })}
              stroke="#6b7280"
              fontSize={11}
            />
            <YAxis
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              stroke="#6b7280"
              fontSize={11}
            />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px" }}
              labelFormatter={(ts) => new Date(ts).toLocaleDateString("es-PE", { year: "numeric", month: "long", day: "numeric" })}
              formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
            />
            {results.conservador && results.conservador.evolution.length > 0 && (
              <Area
                data={results.conservador.evolution}
                dataKey="value"
                name="Conservador"
                stroke="#00d4aa"
                fill="url(#gradCons)"
                strokeWidth={2}
                dot={false}
              />
            )}
            {results.moderado && results.moderado.evolution.length > 0 && (
              <Area
                data={results.moderado.evolution}
                dataKey="value"
                name="Moderado"
                stroke="#3b82f6"
                fill="url(#gradMod)"
                strokeWidth={2}
                dot={false}
              />
            )}
            {results.agresivo && results.agresivo.evolution.length > 0 && (
              <Area
                data={results.agresivo.evolution}
                dataKey="value"
                name="Agresivo"
                stroke="#8b5cf6"
                fill="url(#gradAgr)"
                strokeWidth={2}
                dot={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
        <div className="flex items-center justify-center gap-6 mt-3">
          <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-0.5 bg-accent-green rounded-full inline-block" /> Conservador</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-0.5 bg-accent-blue rounded-full inline-block" /> Moderado</span>
          <span className="flex items-center gap-1.5 text-xs"><span className="w-3 h-0.5 bg-accent-purple rounded-full inline-block" /> Agresivo</span>
        </div>
      </div>
    </div>
  );
}
