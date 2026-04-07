/**
 * Decision Engine: genera señales de trading de opciones
 * basadas en indicadores técnicos + datos de opciones.
 */
import { calcGreeks } from "./blackScholes";
import type { OptionContract } from "./maxPain";

export interface Signal {
  action: "BUY CALL" | "BUY PUT" | "SELL CALL" | "SELL PUT";
  instrument: string;
  strike: number;
  expiry: string;
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
}

/** Parse expiry string like "25APR25" to DTE */
function parseDTE(expiry: string): number {
  const months: Record<string, number> = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const day = parseInt(expiry.slice(0, 2));
  const monthStr = expiry.slice(2, 5);
  const year = 2000 + parseInt(expiry.slice(5, 7));
  const month = months[monthStr];
  if (isNaN(day) || month === undefined || isNaN(year)) return 0;
  const expiryDate = new Date(Date.UTC(year, month, day, 8, 0, 0)); // Deribit expires 8:00 UTC
  return Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / 86400000));
}

export function runEngine(input: EngineInput): Signal[] {
  const { spot, rsi, ema9, ema21, ema55, pcrOI, maxPainStrike, skew, options, capital } = input;

  // ── Score CALL vs PUT ──
  let callScore = 0;
  let putScore = 0;

  if (rsi !== null) {
    if (rsi < 35) callScore += 20;
    if (rsi > 65) putScore += 20;
  }
  if (ema9 !== null && ema21 !== null) {
    if (ema9 > ema21) callScore += 20;
    if (ema9 < ema21) putScore += 20;
  }
  if (ema21 !== null && ema55 !== null) {
    if (ema21 > ema55) callScore += 15;
    if (ema21 < ema55) putScore += 15;
  }
  if (pcrOI > 1.1) callScore += 20;
  if (pcrOI < 0.8) putScore += 20;
  if (spot < maxPainStrike) callScore += 15;
  if (spot > maxPainStrike) putScore += 15;
  if (skew > 5) callScore += 10;
  if (skew < -5) putScore += 10;

  // ── Filter valid contracts ──
  const validOptions = options.filter((o) => {
    const dte = parseDTE(o.expiry);
    if (dte < 10 || dte > 35) return false;
    if (o.open_interest < 100) return false;
    const spread = o.ask_price - o.bid_price;
    if (o.mark_price > 0 && spread / o.mark_price > 0.15) return false;
    return true;
  });

  // ── Select best contracts ──
  function selectBest(type: "C" | "P", score: number): Signal | null {
    const contracts = validOptions.filter((o) => o.type === type);
    if (contracts.length === 0) return null;

    // Calcular delta para cada contrato y filtrar delta 0.25-0.45
    const withGreeks = contracts.map((o) => {
      const dte = parseDTE(o.expiry);
      const T = dte / 365;
      const g = calcGreeks(spot, o.strike, T, o.mark_iv / 100, type);
      return { ...o, dte, T, greeks: g, absDelta: Math.abs(g.delta) };
    }).filter((o) => o.absDelta >= 0.2 && o.absDelta <= 0.5);

    if (withGreeks.length === 0) return null;

    // Target delta ~0.35, prefer highest OI
    withGreeks.sort((a, b) => {
      const deltaScore = Math.abs(a.absDelta - 0.35) - Math.abs(b.absDelta - 0.35);
      if (Math.abs(deltaScore) > 0.05) return deltaScore;
      return b.open_interest - a.open_interest;
    });

    const best = withGreeks[0];
    const entryUSD = best.mark_price * spot;
    const breakeven = type === "C" ? best.strike + entryUSD : best.strike - entryUSD;

    // Target yield: subyacente mueve 8% en dirección favorable
    const moveSpot = spot * (type === "C" ? 1.08 : 0.92);
    const exitGreeks = calcGreeks(moveSpot, best.strike, Math.max(0, best.T - 7 / 365), best.mark_iv / 100, type);
    const targetPct = entryUSD > 0 ? ((exitGreeks.price - entryUSD) / entryUSD * 100) : 0;

    // Contracts suggested: 2% of capital
    const maxRisk = capital * 0.02;
    const suggestedContracts = Math.max(0.1, Math.min(10, Math.floor((maxRisk / entryUSD) * 10) / 10));

    const action = score > 50 ? (type === "C" ? "BUY CALL" : "BUY PUT") : (type === "C" ? "SELL PUT" : "SELL CALL");
    const riskLevel = score > 70 ? "LOW" : score > 40 ? "MEDIUM" : "HIGH";
    const confidence = score > 70 ? "HIGH" : score > 40 ? "MEDIUM" : "LOW";

    const rationale = buildRationale(type, rsi, ema9, ema21, pcrOI, maxPainStrike, spot, skew);

    return {
      action: action as Signal["action"],
      instrument: best.instrument_name,
      strike: best.strike,
      expiry: best.expiry,
      dte: best.dte,
      entryUSD: Math.round(entryUSD * 100) / 100,
      breakeven: Math.round(breakeven),
      targetYield: `+${Math.round(targetPct)}%`,
      maxLoss: action.startsWith("BUY") ? `$${Math.round(entryUSD * suggestedContracts)} prima pagada` : "Ilimitada (venta)",
      maxGain: action.includes("CALL") && action.startsWith("BUY") ? "Ilimitado > breakeven" : `$${Math.round(entryUSD * suggestedContracts)} prima cobrada`,
      greeks: {
        delta: Math.round(best.greeks.delta * 1000) / 1000,
        gamma: Math.round(best.greeks.gamma * 1000000) / 1000000,
        theta: Math.round(best.greeks.theta * 100) / 100,
        vega: Math.round(best.greeks.vega * 100) / 100,
        iv: best.mark_iv,
      },
      rationale,
      riskLevel,
      confidence,
      keyRisks: [
        "Theta decay (pérdida de valor temporal)",
        "IV crush post-evento",
        "Gap de precio nocturno",
      ],
      timeframe: `${best.dte} días`,
      strength: score,
    };
  }

  const signals: Signal[] = [];

  const callSignal = selectBest("C", callScore);
  if (callSignal) signals.push(callSignal);

  const putSignal = selectBest("P", putScore);
  if (putSignal) signals.push(putSignal);

  // Mixed signal: la más fuerte entre SELL opciones
  if (callScore > putScore && putScore > 30) {
    const sellPut = selectBest("P", putScore);
    if (sellPut) {
      sellPut.action = "SELL PUT";
      sellPut.rationale = "Venta de put — cobrar prima esperando que el subyacente no baje del strike. " + sellPut.rationale;
      signals.push(sellPut);
    }
  } else if (putScore > callScore && callScore > 30) {
    const sellCall = selectBest("C", callScore);
    if (sellCall) {
      sellCall.action = "SELL CALL";
      sellCall.rationale = "Venta de call — cobrar prima esperando que el subyacente no suba del strike. " + sellCall.rationale;
      signals.push(sellCall);
    }
  }

  // Asegurar exactamente 3 señales (rellenar o recortar)
  while (signals.length < 3 && signals.length > 0) {
    signals.push({ ...signals[signals.length - 1], strength: signals[signals.length - 1].strength - 10 });
  }

  return signals.slice(0, 3).sort((a, b) => b.strength - a.strength);
}

function buildRationale(type: "C" | "P", rsi: number | null, ema9: number | null, ema21: number | null, pcr: number, mp: number, spot: number, skew: number): string {
  const parts: string[] = [];
  if (type === "C") {
    if (rsi !== null && rsi < 40) parts.push(`RSI en ${rsi.toFixed(0)} (zona de sobreventa)`);
    if (ema9 && ema21 && ema9 > ema21) parts.push("EMA9 cruzó EMA21 al alza (momentum positivo)");
    if (pcr > 1.1) parts.push(`PCR ${pcr.toFixed(2)} (exceso de puts — posible rebote)`);
    if (spot < mp) parts.push(`Spot por debajo del Max Pain $${mp.toLocaleString()}`);
    if (skew > 3) parts.push(`Skew +${skew.toFixed(1)} (puts caros, oportunidad en calls)`);
  } else {
    if (rsi !== null && rsi > 60) parts.push(`RSI en ${rsi.toFixed(0)} (zona de sobrecompra)`);
    if (ema9 && ema21 && ema9 < ema21) parts.push("EMA9 cruzó EMA21 a la baja (momentum negativo)");
    if (pcr < 0.8) parts.push(`PCR ${pcr.toFixed(2)} (exceso de calls — posible caída)`);
    if (spot > mp) parts.push(`Spot por encima del Max Pain $${mp.toLocaleString()}`);
  }
  return parts.join(". ") + ".";
}
