import { useMarketStore } from "@/store/marketStore";
import { calcGreeks, calcTimeToExpiryGate, calcDTEGate } from "@/lib/blackScholes";

export default function GreeksTable() {
  const { options, spot } = useMarketStore();

  const nearATM = options
    .filter((o) => {
      const dte = calcDTEGate(o.expiryRaw);
      return dte <= 60 && dte >= 0 && o.openInterest > 5 && Math.abs(o.strike - spot) / spot < 0.15;
    })
    .sort((a, b) => b.openInterest - a.openInterest)
    .slice(0, 10);

  return (
    <div className="bg-bg-surface border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-white font-display font-bold text-sm">GREEKS — NEAR ATM</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] font-mono">
          <thead>
            <tr className="text-text-muted uppercase border-b border-gray-800">
              <th className="px-2.5 py-2 text-left">Instrument</th>
              <th className="px-2.5 py-2 text-right">Strike</th>
              <th className="px-2.5 py-2 text-right">DTE</th>
              <th className="px-2.5 py-2 text-right">IV%</th>
              <th className="px-2.5 py-2 text-right">Δ</th>
              <th className="px-2.5 py-2 text-right">Γ</th>
              <th className="px-2.5 py-2 text-right">Θ/d</th>
              <th className="px-2.5 py-2 text-right">ν/1%</th>
              <th className="px-2.5 py-2 text-right">OI</th>
              <th className="px-2.5 py-2 text-right">Sprd%</th>
            </tr>
          </thead>
          <tbody>
            {nearATM.map((o) => {
              const dte = calcDTEGate(o.expiryRaw);
              const T = calcTimeToExpiryGate(o.expiryRaw);
              const bs = calcGreeks(spot, o.strike, T, o.markIV / 100, o.type);
              const d = o.delta ?? bs.delta;
              const g = o.gamma ?? bs.gamma;
              const t = o.theta ?? bs.theta;
              const v = o.vega ?? bs.vega;
              // Short display name
              const shortName = o.instrumentName.replace(`${o.instrumentName.split("-")[0]}-`, "");
              return (
                <tr key={o.instrumentName} className="border-b border-gray-800/30 hover:bg-bg-hover transition-colors">
                  <td className="px-2.5 py-1.5 text-text-primary">{shortName}</td>
                  <td className="px-2.5 py-1.5 text-right text-white">${o.strike.toLocaleString()}</td>
                  <td className="px-2.5 py-1.5 text-right">{dte}d</td>
                  <td className="px-2.5 py-1.5 text-right text-accent-yellow">{o.markIV.toFixed(1)}</td>
                  <td className="px-2.5 py-1.5 text-right">{d.toFixed(3)}</td>
                  <td className="px-2.5 py-1.5 text-right">{g.toFixed(6)}</td>
                  <td className="px-2.5 py-1.5 text-right text-accent-red">{t.toFixed(1)}</td>
                  <td className="px-2.5 py-1.5 text-right text-accent-blue">{v.toFixed(1)}</td>
                  <td className="px-2.5 py-1.5 text-right">{o.openInterest.toLocaleString()}</td>
                  <td className="px-2.5 py-1.5 text-right">{o.spreadPct.toFixed(1)}%</td>
                </tr>
              );
            })}
            {nearATM.length === 0 && (
              <tr><td colSpan={10} className="px-3 py-6 text-center text-text-muted">Loading options data...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
