"use client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CountdownBadge from "@/components/common/CountdownBadge";
import { Waves, ArrowUpRight, ArrowDownRight, AlertTriangle, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import clsx from "clsx";

interface ExchangeFlow {
  exchange: string;
  btcInflow24h: number;  // BTC entrando al exchange
  btcOutflow24h: number; // BTC saliendo del exchange
  netFlow: number;       // negativo = salidas (alcista)
  interpretation: string;
  signal: "ALCISTA" | "BAJISTA" | "NEUTRAL";
}

interface WhaleAlert {
  time: string;
  type: "inflow" | "outflow";
  amount: string;
  token: string;
  from: string;
  to: string;
  interpretation: string;
}

interface WhaleData {
  flows: ExchangeFlow[];
  alerts: WhaleAlert[];
  summary: {
    totalNetFlow: number;
    interpretation: string;
    signal: "ALCISTA" | "BAJISTA" | "NEUTRAL";
  };
}

async function fetchWhaleData(): Promise<WhaleData> {
  // En producción: usar APIs como Glassnode, CryptoQuant, o Whale Alert
  // Demo con datos simulados basados en patrones reales
  const flows: ExchangeFlow[] = [
    {
      exchange: "Binance",
      btcInflow24h: 2340,
      btcOutflow24h: 3120,
      netFlow: -780,
      interpretation: "Salidas netas de BTC. Inversores retirando a wallets frías — señal de acumulación.",
      signal: "ALCISTA",
    },
    {
      exchange: "Coinbase",
      btcInflow24h: 890,
      btcOutflow24h: 1540,
      netFlow: -650,
      interpretation: "Fuerte retiro institucional. Coinbase es preferido por instituciones — señal muy alcista.",
      signal: "ALCISTA",
    },
    {
      exchange: "Kraken",
      btcInflow24h: 420,
      btcOutflow24h: 380,
      netFlow: 40,
      interpretation: "Flujo neutral. Sin movimientos significativos.",
      signal: "NEUTRAL",
    },
    {
      exchange: "OKX",
      btcInflow24h: 1200,
      btcOutflow24h: 890,
      netFlow: 310,
      interpretation: "Entradas netas moderadas. Posible preparación de venta en mercado asiático.",
      signal: "BAJISTA",
    },
    {
      exchange: "Bybit",
      btcInflow24h: 560,
      btcOutflow24h: 720,
      netFlow: -160,
      interpretation: "Ligeras salidas. Tendencia de retiro consistente en la última semana.",
      signal: "ALCISTA",
    },
  ];

  const alerts: WhaleAlert[] = [
    {
      time: "Hace 2h",
      type: "outflow",
      amount: "1,200 BTC",
      token: "BTC",
      from: "Coinbase",
      to: "Wallet desconocida",
      interpretation: "Retiro masivo de exchange — posible acumulación institucional (alcista)",
    },
    {
      time: "Hace 5h",
      type: "inflow",
      amount: "15,000 ETH",
      token: "ETH",
      from: "Wallet ballena",
      to: "Binance",
      interpretation: "ETH entrando a exchange — posible preparación de venta (precaución)",
    },
    {
      time: "Hace 8h",
      type: "outflow",
      amount: "500 BTC",
      token: "BTC",
      from: "Binance",
      to: "Cold wallet",
      interpretation: "Transferencia a almacenamiento frío — hodling (alcista)",
    },
  ];

  const totalNetFlow = flows.reduce((s, f) => s + f.netFlow, 0);
  let summarySignal: "ALCISTA" | "BAJISTA" | "NEUTRAL" = "NEUTRAL";
  let summaryInterp = "";

  if (totalNetFlow < -500) {
    summarySignal = "ALCISTA";
    summaryInterp = `Salidas netas de ${Math.abs(totalNetFlow).toLocaleString()} BTC de exchanges en 24h. Los inversores están retirando a wallets personales, lo que reduce la presión de venta. Históricamente, esto precede subidas de precio.`;
  } else if (totalNetFlow > 500) {
    summarySignal = "BAJISTA";
    summaryInterp = `Entradas netas de ${totalNetFlow.toLocaleString()} BTC a exchanges en 24h. Los inversores están depositando en exchanges, lo que aumenta la presión de venta. Precaución recomendada.`;
  } else {
    summarySignal = "NEUTRAL";
    summaryInterp = "Flujos neutrales en exchanges. Sin señales claras de acumulación o distribución masiva.";
  }

  return { flows, alerts, summary: { totalNetFlow, interpretation: summaryInterp, signal: summarySignal } };
}

export default function BallenasPage() {
  const { data, countdown, loading, refresh } = useAutoRefresh(fetchWhaleData, 60);
  const d = data || { flows: [], alerts: [], summary: { totalNetFlow: 0, interpretation: "", signal: "NEUTRAL" as const } };

  const signalConfig = {
    ALCISTA: { bg: "bg-accent-green/5", border: "border-accent-green/30", text: "text-accent-green", icon: TrendingUp },
    BAJISTA: { bg: "bg-accent-red/5", border: "border-accent-red/30", text: "text-accent-red", icon: TrendingDown },
    NEUTRAL: { bg: "bg-accent-yellow/5", border: "border-accent-yellow/30", text: "text-accent-yellow", icon: Building2 },
  };

  const sc = signalConfig[d.summary.signal];
  const SIcon = sc.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Waves size={24} /> Monitor de Ballenas
        </h1>
        <CountdownBadge countdown={countdown} loading={loading} onRefresh={refresh} />
      </div>

      <p className="text-text-secondary text-sm">
        Monitoreo de flujos de exchanges y movimientos de wallets grandes. Cuando el BTC sale de exchanges, es señal alcista (los inversores guardan). Cuando entra, es señal de posible venta.
      </p>

      {/* Resumen general */}
      <div className={clsx("border rounded-xl p-5", sc.bg, sc.border)}>
        <div className="flex items-start gap-4">
          <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center border", sc.bg, sc.border)}>
            <SIcon size={24} className={sc.text} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className={clsx("text-lg font-bold", sc.text)}>Señal de Ballenas: {d.summary.signal}</h2>
              <span className="text-xs text-text-muted bg-bg/50 px-2 py-0.5 rounded-full font-mono">
                Flujo neto: {d.summary.totalNetFlow > 0 ? "+" : ""}{d.summary.totalNetFlow.toLocaleString()} BTC
              </span>
            </div>
            <p className="text-text-secondary text-sm leading-relaxed">{d.summary.interpretation}</p>
          </div>
        </div>
      </div>

      {/* Alertas de ballenas */}
      {d.alerts.length > 0 && (
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-accent-yellow" /> Movimientos Recientes
          </h3>
          <div className="space-y-3">
            {d.alerts.map((a, i) => (
              <div key={i} className={clsx("p-3 rounded-lg border", a.type === "outflow" ? "border-accent-green/20 bg-accent-green/5" : "border-accent-red/20 bg-accent-red/5")}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {a.type === "outflow"
                      ? <ArrowUpRight size={14} className="text-accent-green" />
                      : <ArrowDownRight size={14} className="text-accent-red" />
                    }
                    <span className="text-white font-semibold text-sm">{a.amount} {a.token}</span>
                    <span className="text-text-muted text-xs">{a.from} → {a.to}</span>
                  </div>
                  <span className="text-text-muted text-xs">{a.time}</span>
                </div>
                <p className="text-text-secondary text-xs">{a.interpretation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flujos por exchange */}
      <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Flujos de Exchanges (24h)</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-text-muted text-xs uppercase border-b border-gray-800">
              <th className="px-5 py-3 text-left">Exchange</th>
              <th className="px-5 py-3 text-right">Entradas (BTC)</th>
              <th className="px-5 py-3 text-right">Salidas (BTC)</th>
              <th className="px-5 py-3 text-right">Flujo Neto</th>
              <th className="px-5 py-3 text-center">Señal</th>
              <th className="px-5 py-3 text-left">Interpretación</th>
            </tr>
          </thead>
          <tbody>
            {d.flows.map((f) => (
              <tr key={f.exchange} className="border-b border-gray-800/30 hover:bg-bg-hover transition-colors">
                <td className="px-5 py-3 text-white font-medium">{f.exchange}</td>
                <td className="px-5 py-3 text-right font-mono text-accent-red text-sm">{f.btcInflow24h.toLocaleString()}</td>
                <td className="px-5 py-3 text-right font-mono text-accent-green text-sm">{f.btcOutflow24h.toLocaleString()}</td>
                <td className={clsx("px-5 py-3 text-right font-mono text-sm font-bold", f.netFlow < 0 ? "text-accent-green" : f.netFlow > 0 ? "text-accent-red" : "text-text-muted")}>
                  {f.netFlow > 0 ? "+" : ""}{f.netFlow.toLocaleString()}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full border",
                    f.signal === "ALCISTA" ? "bg-accent-green/15 text-accent-green border-accent-green/30" :
                    f.signal === "BAJISTA" ? "bg-accent-red/15 text-accent-red border-accent-red/30" :
                    "bg-gray-700/50 text-text-muted border-gray-600"
                  )}>{f.signal}</span>
                </td>
                <td className="px-5 py-3 text-text-secondary text-xs max-w-[250px]">{f.interpretation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Leyenda educativa */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">¿Cómo interpretar los flujos?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <ArrowUpRight size={16} className="text-accent-green mt-0.5 shrink-0" />
            <div>
              <span className="text-accent-green font-medium">Salidas de exchange (alcista):</span>
              <span className="text-text-secondary"> Los inversores retiran cripto a wallets personales. No planean vender pronto. Señal de confianza.</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <ArrowDownRight size={16} className="text-accent-red mt-0.5 shrink-0" />
            <div>
              <span className="text-accent-red font-medium">Entradas a exchange (bajista):</span>
              <span className="text-text-secondary"> Los inversores depositan cripto en exchanges. Posiblemente para vender. Señal de precaución.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
