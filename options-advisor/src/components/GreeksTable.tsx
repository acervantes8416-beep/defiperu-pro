import { useMarketStore } from "@/store/marketStore";
import { calcGreeks } from "@/lib/blackScholes";

function parseDTE(expiry: string): number {
  const months: Record<string, number> = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
  const d = parseInt(expiry.slice(0, 2));
  const m = months[expiry.slice(2, 5)];
  const y = 2000 + parseInt(expiry.slice(5));
  if (isNaN(d) || m === undefined || isNaN(y)) return 0;
  return Math.max(0, Math.floor((Date.UTC(y, m, d, 8) - Date.now()) / 86400000));
}

export default function GreeksTable() {
  const { options, spot } = useMarketStore();

  // 10 contracts nearest ATM with highest OI
  const nearATM = options
    .filter((o) => Math.abs(o.strike - spot) / spot < 0.15 && o.open_interest > 50)
    .sort((a, b) => b.open_interest - a.open_interest)
    .slice(0, 10);

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800">
        <h3 className="text-white font-semibold text-sm">Greeks — Near ATM</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-text-muted uppercase border-b border-gray-800">
              <th className="px-3 py-2 text-left">Instrument</th>
              <th className="px-3 py-2 text-right">Strike</th>
              <th className="px-3 py-2 text-right">DTE</th>
              <th className="px-3 py-2 text-right">IV%</th>
              <th className="px-3 py-2 text-right">Δ</th>
              <th className="px-3 py-2 text-right">Γ</th>
              <th className="px-3 py-2 text-right">Θ/d</th>
              <th className="px-3 py-2 text-right">ν/1%</th>
              <th className="px-3 py-2 text-right">OI</th>
              <th className="px-3 py-2 text-right">Spread%</th>
            </tr>
          </thead>
          <tbody>
            {nearATM.map((o) => {
              const dte = parseDTE(o.expiry);
              const T = dte / 365;
              const g = calcGreeks(spot, o.strike, T, o.mark_iv / 100, o.type);
              const spread = o.mark_price > 0 ? ((o.ask_price - o.bid_price) / o.mark_price * 100) : 0;

              return (
                <tr key={o.instrument_name} className="border-b border-gray-800/30 hover:bg-bg-hover">
                  <td className="px-3 py-2 text-text-primary font-mono">{o.instrument_name.replace(`${o.instrument_name.split("-")[0]}-`, "")}</td>
                  <td className="px-3 py-2 text-right font-mono text-white">${o.strike.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{dte}d</td>
                  <td className="px-3 py-2 text-right font-mono text-accent-yellow">{o.mark_iv.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono">{g.delta.toFixed(3)}</td>
                  <td className="px-3 py-2 text-right font-mono">{g.gamma.toFixed(6)}</td>
                  <td className="px-3 py-2 text-right font-mono text-accent-red">{g.theta.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono text-accent-blue">{g.vega.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono">{o.open_interest.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono">{spread.toFixed(1)}%</td>
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
