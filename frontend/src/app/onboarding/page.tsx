"use client";
import { useState } from "react";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import type { RiskProfileType } from "@/types";
import { User, ShieldCheck, Settings2, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

export default function OnboardingPage() {
  const { completeOnboarding } = useStore();
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [name, setName] = useState("");
  const [capital, setCapital] = useState("1000");
  const [experience, setExperience] = useState<"principiante" | "intermedio" | "avanzado">("principiante");

  // Step 2 — cuestionario
  const [q1, setQ1] = useState(0); // 1=conservador, 2=moderado, 3=agresivo
  const [q2, setQ2] = useState(0);
  const [q3, setQ3] = useState(0);

  // Step 3
  const [timeHorizon, setTimeHorizon] = useState<"corto" | "medio" | "largo">("medio");
  const [maxLoss, setMaxLoss] = useState("20");
  const [diversification, setDiversification] = useState<"pocos" | "diversificado">("diversificado");

  const riskScore = q1 + q2 + q3;
  const assignedProfile: RiskProfileType =
    riskScore <= 4 ? "conservador" : riskScore <= 6 ? "moderado" : "agresivo";

  const profileDescriptions: Record<RiskProfileType, { name: string; desc: string; assets: string; color: string }> = {
    conservador: { name: "Conservador", desc: "Prioriza la seguridad del capital. Ideal si prefieres dormir tranquilo.", assets: "BTC 50% · ETH 30% · USDT 20%", color: "text-accent-green" },
    moderado: { name: "Moderado", desc: "Balance entre crecimiento y protección. El camino del medio.", assets: "BTC 35% · ETH 25% · SOL 20% · BNB 10% · LINK 5% · USDT 5%", color: "text-accent-blue" },
    agresivo: { name: "Agresivo", desc: "Máximo potencial de retorno. Para quienes aceptan alta volatilidad.", assets: "BTC 25% · ETH 20% · SOL 15% · TAO 15% · Alts 15% · USDT 10%", color: "text-accent-purple" },
  };

  const finish = () => {
    completeOnboarding({
      name: name || "Inversor",
      capital: parseFloat(capital) || 1000,
      experience,
      riskScore,
      timeHorizon,
      maxLoss: parseFloat(maxLoss) || 20,
      diversification,
    }, assignedProfile);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">
            Bienvenido a DeFiPerú Pro
          </h1>
          <p className="text-text-secondary mt-2">Vamos a personalizar tu experiencia en 3 pasos rápidos</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                step >= s ? "bg-accent-blue text-white" : "bg-gray-700 text-text-muted"
              )}>
                {step > s ? <CheckCircle2 size={16} /> : s}
              </div>
              {s < 3 && <div className={clsx("w-12 h-0.5 rounded", step > s ? "bg-accent-blue" : "bg-gray-700")} />}
            </div>
          ))}
        </div>

        <div className="bg-bg-card border border-gray-800 rounded-2xl p-8">
          {/* ── PASO 1: Perfil ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <User size={20} className="text-accent-blue" />
                <h2 className="text-lg font-semibold text-white">Tu Perfil de Inversor</h2>
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-1">¿Cómo te llamas?</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2.5 text-white" placeholder="Tu nombre" />
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-1">¿Cuánto capital tienes disponible? (USD)</label>
                <input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2.5 text-white" min="100" />
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-2">Experiencia en cripto</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["principiante", "intermedio", "avanzado"] as const).map((e) => (
                    <button key={e} onClick={() => setExperience(e)}
                      className={clsx("p-3 rounded-xl border text-center text-sm transition-all capitalize",
                        experience === e ? "border-accent-blue bg-accent-blue/10 text-white" : "border-gray-700 text-text-secondary hover:border-gray-600"
                      )}>{e}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── PASO 2: Cuestionario de riesgo ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={20} className="text-accent-blue" />
                <h2 className="text-lg font-semibold text-white">Tolerancia al Riesgo</h2>
              </div>

              <div>
                <p className="text-text-secondary text-sm mb-3">Si tu portafolio baja un 20% en una semana, ¿qué haces?</p>
                <div className="space-y-2">
                  {[
                    { v: 1, label: "Vendo todo para no perder más" },
                    { v: 2, label: "Espero a que se recupere" },
                    { v: 3, label: "Compro más porque los precios están baratos" },
                  ].map((o) => (
                    <button key={o.v} onClick={() => setQ1(o.v)}
                      className={clsx("w-full text-left p-3 rounded-lg border text-sm transition-all",
                        q1 === o.v ? "border-accent-blue bg-accent-blue/10 text-white" : "border-gray-700 text-text-secondary hover:border-gray-600"
                      )}>{o.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-text-secondary text-sm mb-3">¿Qué prefieres?</p>
                <div className="space-y-2">
                  {[
                    { v: 1, label: "Ganar poco pero seguro" },
                    { v: 2, label: "Ganar regular con riesgo moderado" },
                    { v: 3, label: "Ganar mucho aunque pueda perder mucho" },
                  ].map((o) => (
                    <button key={o.v} onClick={() => setQ2(o.v)}
                      className={clsx("w-full text-left p-3 rounded-lg border text-sm transition-all",
                        q2 === o.v ? "border-accent-blue bg-accent-blue/10 text-white" : "border-gray-700 text-text-secondary hover:border-gray-600"
                      )}>{o.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-text-secondary text-sm mb-3">¿Cuánto conoces de criptomonedas?</p>
                <div className="space-y-2">
                  {[
                    { v: 1, label: "Solo conozco Bitcoin" },
                    { v: 2, label: "Conozco BTC, ETH y algunas más" },
                    { v: 3, label: "Conozco DeFi, altcoins, IA tokens y más" },
                  ].map((o) => (
                    <button key={o.v} onClick={() => setQ3(o.v)}
                      className={clsx("w-full text-left p-3 rounded-lg border text-sm transition-all",
                        q3 === o.v ? "border-accent-blue bg-accent-blue/10 text-white" : "border-gray-700 text-text-secondary hover:border-gray-600"
                      )}>{o.label}</button>
                  ))}
                </div>
              </div>

              {q1 > 0 && q2 > 0 && q3 > 0 && (
                <div className={clsx("p-4 rounded-xl border", `border-${assignedProfile === "conservador" ? "accent-green" : assignedProfile === "moderado" ? "accent-blue" : "accent-purple"}/30`)}>
                  <div className="text-text-muted text-xs mb-1">Perfil recomendado:</div>
                  <div className={clsx("text-lg font-bold", profileDescriptions[assignedProfile].color)}>
                    {profileDescriptions[assignedProfile].name}
                  </div>
                  <p className="text-text-secondary text-sm">{profileDescriptions[assignedProfile].desc}</p>
                </div>
              )}
            </div>
          )}

          {/* ── PASO 3: Criterios personales ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 size={20} className="text-accent-blue" />
                <h2 className="text-lg font-semibold text-white">Criterios Personales</h2>
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-2">¿Cuánto tiempo puedes dejar tu dinero invertido?</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "corto" as const, label: "< 3 meses" },
                    { v: "medio" as const, label: "3-12 meses" },
                    { v: "largo" as const, label: "> 1 año" },
                  ]).map((o) => (
                    <button key={o.v} onClick={() => setTimeHorizon(o.v)}
                      className={clsx("p-3 rounded-xl border text-center text-sm transition-all",
                        timeHorizon === o.v ? "border-accent-blue bg-accent-blue/10 text-white" : "border-gray-700 text-text-secondary hover:border-gray-600"
                      )}>{o.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-1">¿Qué % máximo podrías perder sin que te afecte?</label>
                <div className="flex items-center gap-3">
                  <input type="range" min="5" max="50" step="5" value={maxLoss} onChange={(e) => setMaxLoss(e.target.value)}
                    className="flex-1 accent-accent-blue" />
                  <span className="text-white font-mono font-bold w-12 text-right">{maxLoss}%</span>
                </div>
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-2">¿Prefieres pocos activos o diversificado?</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "pocos" as const, label: "Pocos activos (2-3)", desc: "Más simple" },
                    { v: "diversificado" as const, label: "Diversificado (5-7)", desc: "Menos riesgo" },
                  ]).map((o) => (
                    <button key={o.v} onClick={() => setDiversification(o.v)}
                      className={clsx("p-4 rounded-xl border text-left transition-all",
                        diversification === o.v ? "border-accent-blue bg-accent-blue/10" : "border-gray-700 hover:border-gray-600"
                      )}>
                      <div className="text-white text-sm font-medium">{o.label}</div>
                      <div className="text-text-muted text-xs">{o.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resultado final */}
              <div className="bg-bg/50 border border-gray-700 rounded-xl p-5 mt-4">
                <h3 className="text-white font-semibold mb-3">Tu Portafolio Personalizado</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-secondary">Perfil</span><span className={clsx("font-bold", profileDescriptions[assignedProfile].color)}>{profileDescriptions[assignedProfile].name}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Capital</span><span className="text-white font-mono">${parseFloat(capital || "0").toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Distribución</span><span className="text-text-primary text-xs">{profileDescriptions[assignedProfile].assets}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Horizonte</span><span className="text-white capitalize">{timeHorizon}</span></div>
                  <div className="flex justify-between"><span className="text-text-secondary">Pérdida máx.</span><span className="text-accent-red font-mono">{maxLoss}%</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Navegación */}
          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-text-secondary hover:text-white text-sm">
                <ArrowLeft size={16} /> Anterior
              </button>
            ) : <div />}

            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} disabled={step === 2 && (q1 === 0 || q2 === 0 || q3 === 0)}
                className="flex items-center gap-1 bg-accent-blue text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40">
                Siguiente <ArrowRight size={16} />
              </button>
            ) : (
              <button onClick={finish}
                className="flex items-center gap-1 bg-gradient-to-r from-accent-green to-accent-blue text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90">
                <CheckCircle2 size={16} /> Comenzar a Invertir
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
