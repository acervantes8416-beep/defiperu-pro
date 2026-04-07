/**
 * Indicadores técnicos: RSI, EMA, detección de tendencia y cruces.
 * Todas las funciones reciben array de closes (number[]).
 */

/** RSI con smoothing de Wilder */
export function calcRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  // Primer cálculo: SMA de gains/losses
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder smoothing para el resto
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** EMA con seed = SMA de los primeros `period` valores */
export function calcEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;

  const k = 2 / (period + 1);

  // Seed: SMA del primer periodo
  let ema = 0;
  for (let i = 0; i < period; i++) ema += closes[i];
  ema /= period;

  // Iterar con EMA
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }

  return ema;
}

/** Detectar tendencia basada en alineación de EMAs */
export function detectTrend(
  e9: number | null, e21: number | null, e55: number | null
): "BULLISH" | "BEARISH" | "NEUTRAL" {
  if (e9 === null || e21 === null || e55 === null) return "NEUTRAL";
  if (e9 > e21 && e21 > e55) return "BULLISH";
  if (e9 < e21 && e21 < e55) return "BEARISH";
  return "NEUTRAL";
}

/** Detectar cruce EMA9/EMA21 en las últimas 3 velas */
export function detectCross(closes: number[]): "GOLDEN" | "DEATH" | null {
  if (closes.length < 22) return null;

  // Calcular EMA9 y EMA21 para las últimas 2 posiciones
  const calcEmaAt = (data: number[], period: number): number => {
    const k = 2 / (period + 1);
    let ema = 0;
    for (let i = 0; i < period; i++) ema += data[i];
    ema /= period;
    for (let i = period; i < data.length; i++) ema = data[i] * k + ema * (1 - k);
    return ema;
  };

  const prev = closes.slice(0, -1);
  const curr = closes;

  const e9prev = calcEmaAt(prev, 9);
  const e21prev = calcEmaAt(prev, 21);
  const e9curr = calcEmaAt(curr, 9);
  const e21curr = calcEmaAt(curr, 21);

  if (e9prev <= e21prev && e9curr > e21curr) return "GOLDEN";
  if (e9prev >= e21prev && e9curr < e21curr) return "DEATH";
  return null;
}
