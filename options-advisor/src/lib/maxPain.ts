/**
 * Max Pain, Put/Call Ratio, y Volatility Smile.
 */

export interface OptionContract {
  instrument_name: string;
  strike: number;
  expiry: string;       // "25APR25"
  type: "C" | "P";
  mark_iv: number;      // % (ej: 72.4)
  bid_price: number;    // en BTC/ETH
  ask_price: number;
  mark_price: number;
  open_interest: number;
  volume: number;
}

export interface MaxPainResult {
  maxPainStrike: number;
  distancePct: number;
}

export interface PCRResult {
  pcrOI: number;
  pcrVol: number;
}

export interface SmilePoint {
  strike: number;
  callIV: number | null;
  putIV: number | null;
}

export interface SmileResult {
  smileData: SmilePoint[];
  atmIV: number;
  skew: number;
}

/** Calcular Max Pain strike */
export function calcMaxPain(options: OptionContract[], spot: number): MaxPainResult {
  const strikes = [...new Set(options.map((o) => o.strike))].sort((a, b) => a - b);
  if (strikes.length === 0) return { maxPainStrike: spot, distancePct: 0 };

  let minPain = Infinity;
  let maxPainStrike = spot;

  for (const K of strikes) {
    let pain = 0;
    for (const opt of options) {
      if (opt.type === "C") {
        pain += opt.open_interest * Math.max(0, K - opt.strike);
      } else {
        pain += opt.open_interest * Math.max(0, opt.strike - K);
      }
    }
    if (pain < minPain) {
      minPain = pain;
      maxPainStrike = K;
    }
  }

  const distancePct = spot > 0 ? ((maxPainStrike - spot) / spot) * 100 : 0;
  return { maxPainStrike, distancePct: Math.round(distancePct * 100) / 100 };
}

/** Put/Call Ratio por OI y volumen */
export function calcPCR(options: OptionContract[]): PCRResult {
  let callOI = 0, putOI = 0, callVol = 0, putVol = 0;
  for (const o of options) {
    if (o.type === "C") { callOI += o.open_interest; callVol += o.volume; }
    else { putOI += o.open_interest; putVol += o.volume; }
  }
  return {
    pcrOI: callOI > 0 ? Math.round((putOI / callOI) * 100) / 100 : 0,
    pcrVol: callVol > 0 ? Math.round((putVol / callVol) * 100) / 100 : 0,
  };
}

/** Volatility Smile para un vencimiento dado */
export function calcVolSmile(options: OptionContract[], expiry: string, spot: number): SmileResult {
  const filtered = options.filter((o) => o.expiry === expiry && o.mark_iv > 0);

  // Agrupar por strike
  const strikeMap = new Map<number, { callIV: number | null; putIV: number | null }>();
  for (const o of filtered) {
    if (!strikeMap.has(o.strike)) strikeMap.set(o.strike, { callIV: null, putIV: null });
    const entry = strikeMap.get(o.strike)!;
    if (o.type === "C") entry.callIV = o.mark_iv;
    else entry.putIV = o.mark_iv;
  }

  const smileData: SmilePoint[] = [...strikeMap.entries()]
    .map(([strike, ivs]) => ({ strike, ...ivs }))
    .sort((a, b) => a.strike - b.strike);

  // ATM IV: strike más cercano al spot
  let atmIV = 0;
  let minDist = Infinity;
  for (const pt of smileData) {
    const dist = Math.abs(pt.strike - spot);
    if (dist < minDist) {
      minDist = dist;
      atmIV = pt.callIV || pt.putIV || 0;
    }
  }

  // OTM IVs para skew
  const otmPut = smileData.find((p) => p.strike < spot * 0.95 && p.putIV !== null);
  const otmCall = smileData.find((p) => p.strike > spot * 1.05 && p.callIV !== null);
  const skew = (otmPut?.putIV || atmIV) - (otmCall?.callIV || atmIV);

  return { smileData, atmIV: Math.round(atmIV * 10) / 10, skew: Math.round(skew * 10) / 10 };
}
