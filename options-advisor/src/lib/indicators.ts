/**
 * Technical indicators: RSI (Wilder), EMA, trend/cross detection.
 */

export function calcRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function calcEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = 0;
  for (let i = 0; i < period; i++) ema += closes[i];
  ema /= period;
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return ema;
}

export function detectTrend(e9: number | null, e21: number | null, e55: number | null): "BULLISH" | "BEARISH" | "NEUTRAL" {
  if (e9 == null || e21 == null || e55 == null) return "NEUTRAL";
  if (e9 > e21 && e21 > e55) return "BULLISH";
  if (e9 < e21 && e21 < e55) return "BEARISH";
  return "NEUTRAL";
}

export function detectCross(closes: number[]): "GOLDEN" | "DEATH" | null {
  if (closes.length < 22) return null;
  const ema = (data: number[], p: number) => {
    const k = 2 / (p + 1);
    let e = 0;
    for (let i = 0; i < p; i++) e += data[i];
    e /= p;
    for (let i = p; i < data.length; i++) e = data[i] * k + e * (1 - k);
    return e;
  };
  const prev = closes.slice(0, -1);
  const e9p = ema(prev, 9), e21p = ema(prev, 21);
  const e9c = ema(closes, 9), e21c = ema(closes, 21);
  if (e9p <= e21p && e9c > e21c) return "GOLDEN";
  if (e9p >= e21p && e9c < e21c) return "DEATH";
  return null;
}

export function calcAllIndicators(closes: number[]) {
  return {
    rsi14: calcRSI(closes, 14),
    ema9: calcEMA(closes, 9),
    ema21: calcEMA(closes, 21),
    ema55: calcEMA(closes, 55),
  };
}
