/**
 * Decision Engine — generates 3 options trading signals based on TA + options data.
 * Relaxed filters for Gate.io's lower liquidity vs Deribit.
 */
import { calcGreeks, calcTimeToExpiryGate } from "./blackScholes";
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

// DTE bounds per range
function dteRangeToBounds(r: DTERange): [number, number] {
  switch (r) {
    case "1d": return [0, 2];
    case "3d": return [0, 4];
    case "5d": return [0, 7];
    case "7d": return [0, 10];
    case "14d": return [5, 17];
    case "30d": return [14, 45];
    case "auto": return [0, 90];
  }
}

/** Filter options with relaxed criteria for Gate.io */
function filterQuality(opts: OptionContract[], spot: number, dteRange: DTERange): OptionContract[] {
  const [minDTE, maxDTE] = dteRangeToBounds(dteRange);

  const filtered = opts.filter((o) => {
    const T = calcTimeToExpiryGate(o.expiryRaw);
    const dte = T * 365;
    return dte >= minDTE && dte <= maxDTE && o.markPrice > 0;
  });

  // If less than 4 contracts pass, relax to DTE 0-90 with markPrice > 0
  if (filtered.length < 4) {
    const relaxed = opts.filter((o) => {
      const T = calcTimeToExpiryGate(o.expiryRaw);
      const dte = T * 365;
      return dte >= 0 && dte <= 90 && o.markPrice > 0;
    });
    if (relaxed.length > filtered.length) return relaxed;
  }

  return filtered;
}

export function runEngine(input: EngineInput): Signal[] {
  const { spot, rsi, ema9, ema21, ema55, pcrOI, maxPainStrike, skew, options, capital, dteRange } = input;
  if (spot <= 0 || options.length === 0) {
    console.log("[Engine] Skip: spot=", spot, "options=", options.length);
    return [];
  }

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

  // Ensure minimum score so signals generate even with neutral indicators
  if (callScore === 0 && putScore === 0) { callScore = 25; putScore = 25; }

  const valid = filterQuality(options, spot, dteRange);
  console.log("[Engine] valid contracts after filter:", valid.length, "dteRange:", dteRange, "callScore:", callScore, "putScore:", putScore);

  function make(type: "C" | "P", score: number, targetDelta: number): Signal | null {
    const pool = valid.filter((o) => o.type === type);
    if (pool.length === 0) return null;

    // Compute delta for each; use default IV=50% if markIV===0
    const withDelta = pool.map((o) => {
      const T = calcTimeToExpiryGate(o.expiryRaw);
      const dte = Math.round(T * 365);
      const iv = o.markIV > 0 ? o.markIV / 100 : 0.50; // default 50% IV
      const bsGreeks = calcGreeks(spot, o.strike, T, iv, type);
      const delta = o.delta ?? bsGreeks.delta;
      // Use BS price if markPrice is 0
      const effectivePrice = o.markPrice > 0 ? o.markPrice : bsGreeks.price;
      return { ...o, dte, T, iv: iv * 100, delta, absDelta: Math.abs(delta), bsGreeks, effectivePrice };
    }).filter((o) => o.effectivePrice > 0);

    if (withDelta.length === 0) return null;

    // Pick by delta: prefer contracts with delta closest to target
    // NO hard filter on delta range — just sort by proximity
    const absTgt = Math.abs(targetDelta);
    withDelta.sort((a, b) => {
      const dd = Math.abs(a.absDelta - absTgt) - Math.abs(b.absDelta - absTgt);
      if (Math.abs(dd) > 0.05) return dd;
      return b.openInterest - a.openInterest;
    });

    const best = withDelta[0];
    const entryUSD = best.effectivePrice;
    const breakeven = type === "C" ? best.strike + entryUSD : best.strike - entryUSD;

    // Target yield: 8% move in favorable direction
    const moveSpot = spot * (type === "C" ? 1.08 : 0.92);
    const exitT = Math.max(0.001, best.T - 7 / 365);
    const exitGreeks = calcGreeks(moveSpot, best.strike, exitT, best.iv / 100, type);
    const targetPct = entryUSD > 0 ? ((exitGreeks.price - entryUSD) / entryUSD * 100) : 0;

    // Contracts: 2% of capital
    const maxRisk = capital * 0.02;
    const contracts = Math.max(0.1, Math.min(10, Math.floor((maxRisk / entryUSD) * 10) / 10));

    const isBuy = score > 30;
    const action: Signal["action"] = isBuy
      ? (type === "C" ? "BUY CALL" : "BUY PUT")
      : (type === "C" ? "SELL CALL" : "SELL PUT");

    const riskLevel: Signal["riskLevel"] = score > 70 ? "LOW" : score > 40 ? "MEDIUM" : "HIGH";
    const confidence: Signal["confidence"] = score > 70 ? "HIGH" : score > 40 ? "MEDIUM" : "LOW";

    const g = best.bsGreeks;

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
      maxLoss: isBuy ? `$${Math.round(entryUSD * contracts)} (prima)` : "Ilimitada",
      maxGain: isBuy ? (type === "C" ? "Ilimitado" : `$${Math.round((best.strike - entryUSD) * contracts)}`) : `$${Math.round(entryUSD * contracts)} (prima)`,
      greeks: {
        delta: Math.round((best.delta ?? g.delta) * 1000) / 1000,
        gamma: Math.round((best.gamma ?? g.gamma) * 1e6) / 1e6,
        theta: Math.round((best.theta ?? g.theta) * 100) / 100,
        vega: Math.round((best.vega ?? g.vega) * 100) / 100,
        iv: best.iv,
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
  const callSig = make("C", callScore, 0.35);
  if (callSig) signals.push(callSig);

  const putSig = make("P", putScore, -0.35);
  if (putSig) signals.push(putSig);

  // Mixed: dominant type, different delta target
  const domType = callScore >= putScore ? "C" : "P";
  const domScore = Math.max(callScore, putScore);
  const mixedSig = make(domType as "C" | "P", domScore, domType === "C" ? 0.28 : -0.28);
  if (mixedSig) {
    if (domScore <= 30) {
      mixedSig.action = domType === "C" ? "SELL PUT" : "SELL CALL";
      mixedSig.rationale = `Venta de ${domType === "C" ? "put" : "call"} — cobrar prima. ` + mixedSig.rationale;
    }
    signals.push(mixedSig);
  }

  // Pad to 3 if needed
  while (signals.length < 3 && signals.length > 0) {
    const last = signals[signals.length - 1];
    signals.push({ ...last, strength: Math.max(0, last.strength - 10), instrument: last.instrument + "*" });
  }

  console.log("[Engine] Generated", signals.length, "signals");
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
