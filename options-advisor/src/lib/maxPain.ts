/**
 * Max Pain, Put/Call Ratio, Volatility Smile.
 * Uses OptionContract from gateio.ts. Local expiry parser to avoid circular imports.
 */
import type { OptionContract } from "./gateio";

// Local helper — avoids circular import from gateio.ts
function gateRawToTimestamp(raw: string): number {
  const y = parseInt(raw.slice(0, 4));
  const m = parseInt(raw.slice(4, 6)) - 1;
  const d = parseInt(raw.slice(6, 8));
  return Date.UTC(y, m, d, 8, 0, 0);
}

export interface MaxPainResult {
  maxPainStrike: number;
  distancePct: number;
  painByStrike: { strike: number; pain: number }[];
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
  otmCallIV: number;
  otmPutIV: number;
}

export function calcMaxPain(options: OptionContract[], spot: number): MaxPainResult {
  const strikes = [...new Set(options.map((o) => o.strike))].sort((a, b) => a - b);
  if (strikes.length === 0) return { maxPainStrike: spot, distancePct: 0, painByStrike: [] };

  const painByStrike: { strike: number; pain: number }[] = [];
  let minPain = Infinity, best = spot;

  for (const K of strikes) {
    let pain = 0;
    for (const o of options) {
      pain += o.type === "C"
        ? o.openInterest * Math.max(0, K - o.strike)
        : o.openInterest * Math.max(0, o.strike - K);
    }
    painByStrike.push({ strike: K, pain });
    if (pain < minPain) { minPain = pain; best = K; }
  }

  return {
    maxPainStrike: best,
    distancePct: spot > 0 ? Math.round(((best - spot) / spot) * 10000) / 100 : 0,
    painByStrike,
  };
}

export function calcPCR(options: OptionContract[]): PCRResult {
  let cOI = 0, pOI = 0, cVol = 0, pVol = 0;
  for (const o of options) {
    if (o.type === "C") { cOI += o.openInterest; cVol += o.volume; }
    else { pOI += o.openInterest; pVol += o.volume; }
  }
  return {
    pcrOI: cOI > 0 ? Math.round((pOI / cOI) * 100) / 100 : 0,
    pcrVol: cVol > 0 ? Math.round((pVol / cVol) * 100) / 100 : 0,
  };
}

export function calcVolSmile(options: OptionContract[], expiryRaw: string, spot: number): SmileResult {
  const filtered = options.filter((o) => o.expiryRaw === expiryRaw && o.markIV > 0);
  const map = new Map<number, { callIV: number | null; putIV: number | null }>();

  for (const o of filtered) {
    if (!map.has(o.strike)) map.set(o.strike, { callIV: null, putIV: null });
    const e = map.get(o.strike)!;
    if (o.type === "C") e.callIV = o.markIV; else e.putIV = o.markIV;
  }

  const smileData = [...map.entries()]
    .map(([strike, iv]) => ({ strike, ...iv }))
    .sort((a, b) => a.strike - b.strike);

  let atmIV = 0, minDist = Infinity;
  for (const p of smileData) {
    const d = Math.abs(p.strike - spot);
    if (d < minDist) { minDist = d; atmIV = p.callIV || p.putIV || 0; }
  }

  const otmPutPt = smileData.find((p) => p.strike < spot * 0.95 && p.putIV !== null);
  const otmCallPt = smileData.find((p) => p.strike > spot * 1.05 && p.callIV !== null);
  const otmPutIV = otmPutPt?.putIV || atmIV;
  const otmCallIV = otmCallPt?.callIV || atmIV;

  return {
    smileData,
    atmIV: Math.round(atmIV * 10) / 10,
    skew: Math.round((otmPutIV - otmCallIV) * 10) / 10,
    otmCallIV: Math.round(otmCallIV * 10) / 10,
    otmPutIV: Math.round(otmPutIV * 10) / 10,
  };
}

export function getNearestExpiries(options: OptionContract[], n: number = 3): string[] {
  const now = Date.now();
  const raws = [...new Set(options.map((o) => o.expiryRaw))]
    .filter((r) => gateRawToTimestamp(r) > now)
    .sort((a, b) => gateRawToTimestamp(a) - gateRawToTimestamp(b));
  return raws.slice(0, n);
}
