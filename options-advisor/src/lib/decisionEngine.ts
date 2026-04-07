/**
 * Decision Engine — generates 3 options trading signals based on TA + options data.
 */
import { calcGreeks, calcTimeToExpiryGate, calcDTEGate } from "./blackScholes";
import type { OptionContract } from "./gateio";

export type DTERange = "1d" | "3d" | "5d" | "7d" | "14d" | "30d" | "auto";

export interface Signal {
  action: "BUY CALL" | "BUY PUT" | "SELL CALL" | "SELL PUT";
  instrument: string;
  strike: number;
  expiry: string;
  expiryRaw: string;
  dte: number;
  entryUSD: number;
  breakeven: number;
  targetYield: string;
  maxLoss: string;
  maxGain: string;
  greeks: { delta: number; gamma: number; theta: number; vega: number; iv: number };
  rationale: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  confidence: "LOW" | "MEDIUM" | "HIGH";
  keyRisks: string[];
  timeframe: string;
  strength: number;
  contracts: number;
}

interface EngineInput {
  spot: number;
  rsi: number | null;
  ema9: number | null;
  ema21: number | null;
  ema55: number | null;
  pcrOI: number;
  maxPainStrike: number;
  skew: number;
  options: OptionContract[];
  capital: number;
  dteRange: DTERange;
}

// DTE filter configs
const DTE_CONFIGS: Record<DTERange, { minOI: number; maxSpread: number; minDTE: number; maxDTE: number }> = {
  "1d":   { minOI: 10,  maxSpread: 30, minDTE: 0,  maxDTE: 2 },
  "3d":   { minOI: 10,  maxSpread: 25, minDTE: 1,  maxDTE: 4 },
  "5d":   { minOI: 20,  maxSpread: 20, minDTE: 3,  maxDTE: 7 },
  "7d":   { minOI: 30,  maxSpread: 20, minDTE: 5,  maxDTE: 10 },
  "14d":  { minOI: 50,  maxSpread: 15, minDTE: 10, maxDTE: 17 },
  "30d":  { minOI: 50,  maxSpread: 15, minDTE: 20, maxDTE: 35 },
  "auto": { minOI: 50,  maxSpread: 20, minDTE: 3,  maxDTE: 45 },
};

export function runEngine(input: EngineInput): Signal[] {
  const { spot, rsi, ema9, ema21, ema55, pcrOI, maxPainStrike, skew, options, capital, dteRange } = input;
  if (spot <= 0 || options.length === 0) return [];

  // Scoring
  let callScore = 0, putScore = 0;
  if (rsi != null && rsi < 35) callScore += 20;
  if (rsi != null && rsi > 65) putScore += 20;
  if (ema9 != null && ema21 != null && ema9 > ema21) callScore += 20;
  if (ema9 != null && ema21 != null && ema9 < ema21) putScore += 20;
  if (ema21 != null && ema55 != null && ema21 > ema55) callScore += 15;
  if (ema21 != null && ema55 != null && ema21 < ema55) putScore += 15;
  if (pcrOI > 1.1) callScore += 20;
  if (pcrOI < 0.8) putScore += 20;
  if (spot < maxPainStrike) callScore += 15;
  if (spot > maxPainStrike) putScore += 15;
  if (skew > 5) callScore += 10;
  if (skew < -5) putScore += 10;

  const cfg = DTE_CONFIGS[dteRange];

  // Filter valid contracts
  const valid = options.filter((o) => {
    const dte = calcDTEGate(o.expiryRaw);
    return dte >= cfg.minDTE && dte <= cfg.maxDTE
      && o.openInterest >= cfg.minOI
      && o.spreadPct <= cfg.maxSpread;
  });

  function selectBest(type: "C" | "P", score: number, targetDelta: number): Signal | null {
    const pool = valid.filter((o) => o.type === type && o.markPrice > 0);
    if (pool.length === 0) return null;

    // Compute delta for each contract
    const withDelta = pool.map((o) => {
      const dte = calcDTEGate(o.expiryRaw);
      const T = calcTimeToExpiryGate(o.expiryRaw);
      // Use native delta if available, else BS
      let delta = o.delta;
      let bsGreeks = calcGreeks(spot, o.strike, T, o.markIV / 100, type);
      if (delta == null) delta = bsGreeks.delta;
      return { ...o, dte, T, delta: delta!, absDelta: Math.abs(delta!), bsGreeks };
    }).filter((o) => o.absDelta >= 0.15 && o.absDelta <= 0.55);

    if (withDelta.length === 0) return null;

    // Sort by proximity to target delta, then OI
    const absTgt = Math.abs(targetDelta);
    withDelta.sort((a, b) => {
      const dd = Math.abs(a.absDelta - absTgt) - Math.abs(b.absDelta - absTgt);
      if (Math.abs(dd) > 0.03) return dd;
      return b.openInterest - a.openInterest;
    });

    const best = withDelta[0];
    const entryUSD = best.markPrice;
    const breakeven = type === "C" ? best.strike + entryUSD : best.strike - entryUSD;

    // Target yield: 8% move in favorable direction
    const moveSpot = spot * (type === "C" ? 1.08 : 0.92);
    const exitT = Math.max(0, best.T - 7 / 365);
    const exitGreeks = calcGreeks(moveSpot, best.strike, exitT, best.markIV / 100, type);
    const targetPct = entryUSD > 0 ? ((exitGreeks.price - entryUSD) / entryUSD * 100) : 0;

    // Contracts: 2% of capital
    const maxRisk = capital * 0.02;
    const contracts = Math.max(0.1, Math.min(10, Math.floor((maxRisk / entryUSD) * 10) / 10));

    const isBuy = score > 40;
    const action: Signal["action"] = isBuy
      ? (type === "C" ? "BUY CALL" : "BUY PUT")
      : (type === "C" ? "SELL CALL" : "SELL PUT");

    const riskLevel: Signal["riskLevel"] = score > 70 ? "LOW" : score > 40 ? "MEDIUM" : "HIGH";
    const confidence: Signal["confidence"] = score > 70 ? "HIGH" : score > 40 ? "MEDIUM" : "LOW";

    const g = best.bsGreeks;
    const nativeDelta = best.delta ?? g.delta;
    const nativeGamma = best.gamma ?? g.gamma;
    const nativeTheta = best.theta ?? g.theta;
    const nativeVega = best.vega ?? g.vega;

    return {
      action,
      instrument: best.instrumentName,
      strike: best.strike,
      expiry: best.expiry,
      expiryRaw: best.expiryRaw,
      dte: best.dte,
      entryUSD: Math.round(entryUSD * 100) / 100,
      breakeven: Math.round(breakeven * 100) / 100,
      targetYield: `+${Math.round(Math.max(0, targetPct))}%`,
      maxLoss: isBuy ? `$${Math.round(entryUSD * contracts)} (prima)` : `Ilimitada`,
      maxGain: isBuy ? (type === "C" ? "Ilimitado" : `$${Math.round((best.strike - entryUSD) * contracts)}`) : `$${Math.round(entryUSD * contracts)} (prima)`,
      greeks: {
        delta: Math.round(nativeDelta * 1000) / 1000,
        gamma: Math.round(nativeGamma * 1e6) / 1e6,
        theta: Math.round(nativeTheta * 100) / 100,
        vega: Math.round(nativeVega * 100) / 100,
        iv: best.markIV,
      },
      rationale: buildRationale(type, rsi, ema9, ema21, pcrOI, maxPainStrike, spot, skew),
      riskLevel,
      confidence,
      keyRisks: ["Theta decay", "IV crush post-evento", "Gap de precio"],
      timeframe: `${best.dte}d`,
      strength: score,
      contracts,
    };
  }

  const signals: Signal[] = [];
  const callSig = selectBest("C", callScore, 0.35);
  if (callSig) signals.push(callSig);

  const putSig = selectBest("P", putScore, -0.35);
  if (putSig) signals.push(putSig);

  // Mixed: dominant type, different delta
  const domType = callScore >= putScore ? "C" : "P";
  const domScore = Math.max(callScore, putScore);
  const mixedSig = selectBest(domType as "C" | "P", domScore, domType === "C" ? 0.28 : -0.28);
  if (mixedSig) {
    if (domScore <= 40) {
      mixedSig.action = domType === "C" ? "SELL PUT" : "SELL CALL";
      mixedSig.rationale = `Venta de ${domType === "C" ? "put" : "call"} — cobrar prima. ` + mixedSig.rationale;
    }
    signals.push(mixedSig);
  }

  // Ensure exactly 3
  while (signals.length < 3 && signals.length > 0) {
    const last = signals[signals.length - 1];
    signals.push({ ...last, strength: last.strength - 10, instrument: last.instrument + "*" });
  }

  return signals.slice(0, 3).sort((a, b) => b.strength - a.strength);
}

function buildRationale(type: "C" | "P", rsi: number | null, ema9: number | null, ema21: number | null, pcr: number, mp: number, spot: number, skew: number): string {
  const p: string[] = [];
  if (type === "C") {
    if (rsi != null && rsi < 40) p.push(`RSI ${rsi.toFixed(0)} — zona de sobreventa`);
    if (ema9 && ema21 && ema9 > ema21) p.push("EMA9 > EMA21 — momentum alcista");
    if (pcr > 1.1) p.push(`PCR ${pcr.toFixed(2)} — exceso de puts`);
    if (spot < mp) p.push(`Spot bajo Max Pain $${mp.toLocaleString()}`);
    if (skew > 3) p.push(`Skew +${skew.toFixed(1)} — puts caros`);
  } else {
    if (rsi != null && rsi > 60) p.push(`RSI ${rsi.toFixed(0)} — zona de sobrecompra`);
    if (ema9 && ema21 && ema9 < ema21) p.push("EMA9 < EMA21 — momentum bajista");
    if (pcr < 0.8) p.push(`PCR ${pcr.toFixed(2)} — exceso de calls`);
    if (spot > mp) p.push(`Spot sobre Max Pain $${mp.toLocaleString()}`);
    if (skew < -3) p.push(`Skew ${skew.toFixed(1)} — calls caros`);
  }
  return p.length > 0 ? p.join(". ") + "." : "Análisis basado en múltiples indicadores.";
}
