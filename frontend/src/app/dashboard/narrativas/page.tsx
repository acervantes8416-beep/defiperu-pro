"use client";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import CountdownBadge from "@/components/common/CountdownBadge";
import { Layers, TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Zap, Star } from "lucide-react";
import clsx from "clsx";

interface Narrative {
  name: string;
  change_24h: number;
  market_cap: number;
  volume_24h: number;
  strength: "FUERTE" | "MODERADA" | "DÉBIL";
  signal: "ACUMULAR" | "NEUTRAL" | "EVITAR";
  top_coins_images: string[];
}

interface NarrativeData {
  narratives: Narrative[];
  dominant: Narrative | null;
  alerts: { category: string; change_24h: number; message: string }[];
  capital_rotation: { flowing_into: string[]; flowing_out: string[] };
}

async function fetchNarratives(): Promise<NarrativeData> {
  try {
    const resp = await fetch("https://api.coingecko.com/api/v3/coins/categories?order=market_cap_change_24h_desc");
    const categories = await resp.json();

    const narratives: Narrative[] = [];
    const alerts: { category: string; change_24h: number; message: string }[] = [];

    for (const cat of categories.slice(0, 10)) {
      const ch = cat.market_cap_change_24h || 0;
      let strength: "FUERTE" | "MODERADA" | "DÉBIL" = "DÉBIL";
      if (Math.abs(ch) > 10) strength = "FUERTE";
      else if (Math.abs(ch) > 5) strength = "MODERADA";

      let signal: "ACUMULAR" | "NEUTRAL" | "EVITAR" = "NEUTRAL";
      if (ch > 5) signal = "ACUMULAR";
      else if (ch < -5) signal = "EVITAR";

      if (ch > 15) {
        alerts.push({ category: cat.name, change_24h: Math.round(ch * 100) / 100, message: `${cat.name} sube +${ch.toFixed(1)}% en 24h` });
      }

      narratives.push({
        name: cat.name || "",
        change_24h: Math.round(ch * 100) / 100,
        market_cap: cat.market_cap || 0,
        volume_24h: cat.volume_24h || 0,
        strength,
        signal,
        top_coins_images: (cat.top_3_coins || []).slice(0, 5),
      });
    }

    const gaining = narratives.filter((n) => n.change_24h > 2).map((n) => n.name).slice(0, 3);
    const losing = narratives.filter((n) => n.change_24h < -2).map((n) => n.name).slice(0, 3);

    return {
      narratives,
      dominant: narratives[0] || null,
      alerts,
      capital_rotation: { flowing_into: gaining, flowing_out: losing },
    };
  } catch {
    return { narratives: [], dominant: null, alerts: [], capital_rotation: { flowing_into: [], flowing_out: [] } };
  }
}

function formatCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export default function NarrativasPage() {
  const { data, countdown, loading, refresh } = useAutoRefresh(fetchNarratives, 60);
  const d = data || { narratives: [], dominant: null, alerts: [], capital_rotation: { flowing_into: [], flowing_out: [] } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Layers size={24} /> Narrativas de Mercado
        </h1>
        <CountdownBadge countdown={countdown} loading={loading} onRefresh={refresh} />
      </div>

      {/* Alertas de narrativas que suben >15% */}
      {d.alerts.length > 0 && (
        <div className="space-y-2">
          {d.alerts.map((a, i) => (
            <div key={i} className="bg-accent-yellow/10 border border-accent-yellow/30 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-accent-yellow shrink-0" />
              <div className="flex-1">
                <span className="text-accent-yellow font-semibold text-sm">{a.message}</span>
                <span className="text-text-muted text-xs ml-2">— Narrativa muy activa, considerar investigar</span>
              </div>
              <span className="text-accent-yellow font-mono font-bold">+{a.change_24h}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Narrativa dominante */}
      {d.dominant && (
        <div className="bg-bg-card border border-accent-blue/30 rounded-xl p-6 glow-green">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center">
              <Star size={24} className="text-accent-blue" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-white">Narrativa Dominante: {d.dominant.name}</h2>
                <span className={clsx("font-mono font-bold text-sm", d.dominant.change_24h >= 0 ? "text-accent-green" : "text-accent-red")}>
                  {d.dominant.change_24h >= 0 ? "+" : ""}{d.dominant.change_24h}%
                </span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed mb-2">
                {d.dominant.change_24h > 10
                  ? `${d.dominant.name} lidera el mercado con un crecimiento excepcional. Los inversores están rotando capital hacia este sector, lo que indica fuerte interés institucional y retail. Considerar posiciones en tokens líderes de esta categoría.`
                  : d.dominant.change_24h > 5
                  ? `${d.dominant.name} muestra momentum positivo por encima del promedio del mercado. El flujo de capital es consistente y los volúmenes confirman la tendencia. Oportunidad de acumulación selectiva.`
                  : d.dominant.change_24h > 0
                  ? `${d.dominant.name} se mantiene como la narrativa más activa con crecimiento moderado. El interés del mercado es estable sin señales de euforia.`
                  : `${d.dominant.name} lidera en actividad pero con rendimiento negativo. Posible corrección saludable tras periodo alcista. Monitorear para oportunidades.`
                }
              </p>
              <div className="flex items-center gap-2 text-xs">
                <Zap size={12} className="text-accent-blue" />
                <span className="text-accent-blue font-medium">
                  Señal: {d.dominant.signal} · Fuerza: {d.dominant.strength}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rotación de capital */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-accent-green" /> Capital entrando
          </h3>
          {d.capital_rotation.flowing_into.length > 0 ? (
            <div className="space-y-2">
              {d.capital_rotation.flowing_into.map((name, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <ArrowRight size={14} className="text-accent-green" />
                  <span className="text-text-primary">{name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">Sin flujos significativos detectados</p>
          )}
        </div>
        <div className="bg-bg-card border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <TrendingDown size={16} className="text-accent-red" /> Capital saliendo
          </h3>
          {d.capital_rotation.flowing_out.length > 0 ? (
            <div className="space-y-2">
              {d.capital_rotation.flowing_out.map((name, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <ArrowRight size={14} className="text-accent-red" />
                  <span className="text-text-primary">{name}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">Sin flujos significativos detectados</p>
          )}
        </div>
      </div>

      {/* Tabla de narrativas */}
      <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Top 10 Narrativas por Rendimiento</h3>
        </div>
        <div className="divide-y divide-gray-800/30">
          {d.narratives.map((n, i) => (
            <div key={n.name} className="px-5 py-4 hover:bg-bg-hover transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-text-muted font-mono text-sm w-6">{i + 1}</span>
                  <div>
                    <span className="text-white font-medium">{n.name}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {n.top_coins_images.map((img, j) => (
                        img && <img key={j} src={img} alt="" className="w-4 h-4 rounded-full" loading="lazy" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Cambio 24h */}
                  <div className="text-right">
                    <div className="text-[10px] text-text-muted">24h</div>
                    <span className={clsx("font-mono text-sm font-bold", n.change_24h >= 0 ? "text-accent-green" : "text-accent-red")}>
                      {n.change_24h >= 0 ? "+" : ""}{n.change_24h}%
                    </span>
                  </div>

                  {/* Market Cap */}
                  <div className="text-right min-w-[80px]">
                    <div className="text-[10px] text-text-muted">M. Cap</div>
                    <span className="font-mono text-xs text-text-secondary">{formatCap(n.market_cap)}</span>
                  </div>

                  {/* Fuerza */}
                  <span className={clsx(
                    "text-xs font-bold px-2 py-0.5 rounded-full border min-w-[80px] text-center",
                    n.strength === "FUERTE" ? "bg-accent-green/15 text-accent-green border-accent-green/30" :
                    n.strength === "MODERADA" ? "bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30" :
                    "bg-gray-700/50 text-text-muted border-gray-600"
                  )}>
                    {n.strength}
                  </span>

                  {/* Señal */}
                  <span className={clsx(
                    "text-xs font-bold px-2 py-0.5 rounded-full border min-w-[80px] text-center",
                    n.signal === "ACUMULAR" ? "bg-accent-green/15 text-accent-green border-accent-green/30" :
                    n.signal === "EVITAR" ? "bg-accent-red/15 text-accent-red border-accent-red/30" :
                    "bg-gray-700/50 text-text-muted border-gray-600"
                  )}>
                    {n.signal}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {d.narratives.length === 0 && (
            <div className="px-5 py-10 text-center text-text-muted">
              Cargando narrativas de mercado...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
