"use client";
import { useStore } from "@/store";
import MetricCard from "@/components/dashboard/MetricCard";
import RiskProfileSelector from "@/components/dashboard/RiskProfileSelector";
import AllocationPanel from "@/components/dashboard/AllocationPanel";
import PnLByAsset from "@/components/dashboard/PnLByAsset";
import { Wallet, RefreshCcw, ShieldCheck } from "lucide-react";
import type { RiskProfileType } from "@/types";

const modes = [
  { id: "manual", label: "Manual", desc: "Solo muestra señales, tú decides" },
  { id: "semi_auto", label: "Semi-Auto", desc: "Propone operaciones, tú apruebas" },
  { id: "full_auto", label: "Automático", desc: "Ejecuta operaciones automáticamente" },
];

const profileMetrics: Record<RiskProfileType, { value: number; cash: number; invested: number; pnl: number; positions: number }> = {
  conservador: { value: 10485, cash: 2097, invested: 8388, pnl: 293, positions: 2 },
  moderado: { value: 10815, cash: 1082, invested: 9733, pnl: 515, positions: 4 },
  agresivo: { value: 11282, cash: 1128, invested: 10154, pnl: 883, positions: 7 },
};

export default function PortfolioPage() {
  const { riskProfile } = useStore();
  const m = profileMetrics[riskProfile];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wallet size={24} /> Gestión de Portfolio
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 px-2.5 py-1 rounded-full flex items-center gap-1">
            <ShieldCheck size={12} /> Solo Spot
          </span>
          <button className="flex items-center gap-2 text-sm text-accent-blue hover:text-white transition-colors bg-accent-blue/10 border border-accent-blue/20 px-3 py-1.5 rounded-lg">
            <RefreshCcw size={14} /> Rebalancear
          </button>
        </div>
      </div>

      {/* Perfil de riesgo */}
      <RiskProfileSelector />

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Valor Total" value={m.value} format="currency" change={(m.pnl / 10000) * 100} />
        <MetricCard title="PnL No Realizado" value={m.pnl} format="currency" />
        <MetricCard title="Invertido" value={m.invested} format="currency" />
        <MetricCard title="Cash Disponible" value={m.cash} format="currency" />
        <MetricCard title="Posiciones Abiertas" value={m.positions} />
      </div>

      {/* Modo de trading */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Modo de Operación (Spot)</h3>
        <div className="grid grid-cols-3 gap-3">
          {modes.map((mo) => (
            <button
              key={mo.id}
              className="p-4 rounded-xl border border-gray-700 hover:border-gray-600 text-left transition-all"
            >
              <div className="text-white font-semibold mb-1">{mo.label}</div>
              <div className="text-text-muted text-sm">{mo.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* PnL por activo */}
      <PnLByAsset />

      {/* Allocación actual vs objetivo */}
      <AllocationPanel />

      {/* Gestión automática: acciones específicas */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Gestión Automática — Acciones Recomendadas</h3>
        <p className="text-text-muted text-sm mb-4">
          Para alcanzar la distribución objetivo del perfil <span className="text-white font-semibold capitalize">{riskProfile}</span>, el sistema recomienda las siguientes operaciones Spot:
        </p>

        {riskProfile === "conservador" && (
          <div className="space-y-2">
            <ActionItem action="comprar" symbol="BTC" amount={2000} price={98450} qty="0.02032" />
            <ActionItem action="comprar" symbol="ETH" amount={1000} price={3420} qty="0.29240" />
            <ActionItem action="reservar" symbol="USDT" amount={2000} note="Mantener como reserva de seguridad (20%)" />
          </div>
        )}
        {riskProfile === "moderado" && (
          <div className="space-y-2">
            <ActionItem action="comprar" symbol="BTC" amount={500} price={98450} qty="0.00508" />
            <ActionItem action="comprar" symbol="ETH" amount={500} price={3420} qty="0.14620" />
            <ActionItem action="comprar" symbol="SOL" amount={1500} price={185.40} qty="8.09061" />
            <ActionItem action="comprar" symbol="BNB" amount={1000} price={612} qty="1.63400" />
            <ActionItem action="reservar" symbol="USDT" amount={1000} note="Mantener como reserva (10%)" />
          </div>
        )}
        {riskProfile === "agresivo" && (
          <div className="space-y-2">
            <ActionItem action="comprar" symbol="SOL" amount={1500} price={185.40} qty="8.09061" />
            <ActionItem action="comprar" symbol="AVAX" amount={800} price={38.70} qty="20.67180" />
            <ActionItem action="comprar" symbol="LINK" amount={700} price={18.50} qty="37.83784" />
            <ActionItem action="comprar" symbol="DOT" amount={500} price={7.80} qty="64.10256" />
            <ActionItem action="comprar" symbol="ADA" amount={500} price={0.72} qty="694.44" />
            <ActionItem action="vender" symbol="BTC" amount={500} price={98450} qty="0.00508" note="Reducir BTC del 30% al 25%" />
            <ActionItem action="reservar" symbol="USDT" amount={1000} note="Mantener como reserva (10%)" />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionItem({ action, symbol, amount, price, qty, note }: {
  action: "comprar" | "vender" | "reservar";
  symbol: string;
  amount: number;
  price?: number;
  qty?: string;
  note?: string;
}) {
  const colors = {
    comprar: "border-accent-green/20 bg-accent-green/5",
    vender: "border-accent-red/20 bg-accent-red/5",
    reservar: "border-accent-yellow/20 bg-accent-yellow/5",
  };
  const textColors = {
    comprar: "text-accent-green",
    vender: "text-accent-red",
    reservar: "text-accent-yellow",
  };
  const labels = {
    comprar: "COMPRAR",
    vender: "VENDER",
    reservar: "RESERVAR",
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${colors[action]}`}>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${textColors[action]} bg-black/20`}>
          {labels[action]}
        </span>
        <span className="text-white font-medium">{symbol}</span>
        {note && <span className="text-text-muted text-xs">{note}</span>}
      </div>
      <div className="flex items-center gap-4 text-sm">
        {price && qty && (
          <span className="text-text-secondary font-mono">
            {qty} @ ${price.toLocaleString()}
          </span>
        )}
        <span className={`font-mono font-semibold ${textColors[action]}`}>
          ${amount.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
