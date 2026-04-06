"use client";
import { useStore } from "@/store";
import type { RiskProfileType } from "@/types";
import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import clsx from "clsx";

const profiles: {
  type: RiskProfileType;
  name: string;
  icon: typeof Shield;
  color: string;
  borderColor: string;
  bgActive: string;
  description: string;
  maxDD: string;
  assets: string;
}[] = [
  {
    type: "conservador",
    name: "Conservador",
    icon: ShieldCheck,
    color: "text-accent-green",
    borderColor: "border-accent-green/40",
    bgActive: "bg-accent-green/10",
    description: "Máxima seguridad. BTC + ETH + reserva USDT.",
    maxDD: "10%",
    assets: "BTC 50% · ETH 30% · USDT 20%",
  },
  {
    type: "moderado",
    name: "Moderado",
    icon: Shield,
    color: "text-accent-blue",
    borderColor: "border-accent-blue/40",
    bgActive: "bg-accent-blue/10",
    description: "Balance riesgo/retorno. Diversificación inteligente.",
    maxDD: "20%",
    assets: "BTC 35% · ETH 25% · SOL 20% · BNB 10% · USDT 10%",
  },
  {
    type: "agresivo",
    name: "Agresivo",
    icon: ShieldAlert,
    color: "text-accent-purple",
    borderColor: "border-accent-purple/40",
    bgActive: "bg-accent-purple/10",
    description: "Máximo rendimiento. Exposición amplia con altcoins.",
    maxDD: "35%",
    assets: "BTC 25% · ETH 20% · SOL 20% · Alts 25% · USDT 10%",
  },
];

export default function RiskProfileSelector() {
  const { riskProfile, setRiskProfile } = useStore();

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-base">Perfil de Riesgo — SPOT</h3>
        <span className="text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded-full">
          Solo Spot
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {profiles.map((p) => {
          const active = riskProfile === p.type;
          const Icon = p.icon;
          return (
            <button
              key={p.type}
              onClick={() => setRiskProfile(p.type)}
              className={clsx(
                "relative text-left rounded-xl border p-4 transition-all duration-200",
                active
                  ? `${p.borderColor} ${p.bgActive} ring-1 ring-${p.color.replace("text-", "")}/20`
                  : "border-gray-700 hover:border-gray-600 bg-bg/30"
              )}
            >
              {/* Indicador activo */}
              {active && (
                <div className={clsx("absolute top-3 right-3 w-2.5 h-2.5 rounded-full signal-pulse", p.color.replace("text-", "bg-"))} />
              )}

              <div className="flex items-center gap-2.5 mb-2">
                <Icon size={20} className={active ? p.color : "text-text-muted"} />
                <span className={clsx("font-semibold", active ? p.color : "text-text-primary")}>{p.name}</span>
              </div>

              <p className="text-text-muted text-xs leading-relaxed mb-3">{p.description}</p>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Máx. Drawdown</span>
                  <span className={active ? p.color : "text-text-secondary"}>{p.maxDD}</span>
                </div>
                <div className="text-xs text-text-muted">
                  <span className="text-text-secondary">{p.assets}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
