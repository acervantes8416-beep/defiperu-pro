/**
 * Black-Scholes pricing + Greeks. Zero external dependencies.
 * Uses erf() approximation for normCDF.
 */

// Error function approximation (Abramowitz & Stegun 7.1.26)
function erf(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function normPDF(x: number): number {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
}

export interface Greeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number; // USD/day
  vega: number;  // USD per 1% IV change
}

/**
 * Black-Scholes pricing + full Greeks.
 * @param S     Spot price
 * @param K     Strike price
 * @param T     Time to expiry in years
 * @param sigma IV as decimal (e.g. 0.72 = 72%)
 * @param type  'C' or 'P'
 * @param r     Risk-free rate (default 5%)
 */
export function calcGreeks(
  S: number, K: number, T: number, sigma: number, type: "C" | "P", r: number = 0.05
): Greeks {
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    const intrinsic = type === "C" ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: type === "C" ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, theta: 0, vega: 0 };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;
  const discountK = K * Math.exp(-r * T);

  let price: number, delta: number;
  if (type === "C") {
    price = S * normCDF(d1) - discountK * normCDF(d2);
    delta = normCDF(d1);
  } else {
    price = discountK * normCDF(-d2) - S * normCDF(-d1);
    delta = normCDF(d1) - 1;
  }

  const gamma = normPDF(d1) / (S * sigma * sqrtT);

  const commonTheta = -(S * normPDF(d1) * sigma) / (2 * sqrtT);
  const theta = type === "C"
    ? (commonTheta - r * discountK * normCDF(d2)) / 365
    : (commonTheta + r * discountK * normCDF(-d2)) / 365;

  const vega = S * sqrtT * normPDF(d1) / 100;

  return { price, delta, gamma, theta, vega };
}

/** Convert Gate.io raw expiry "20250425" → time to expiry in years. Expires 08:00 UTC. */
export function calcTimeToExpiryGate(expiryRaw: string): number {
  const ms = gateRawToMs(expiryRaw) - Date.now();
  return Math.max(0, ms / (365.25 * 24 * 60 * 60 * 1000));
}

/** Convert Gate.io raw expiry "20250425" → days to expiry */
export function calcDTEGate(expiryRaw: string): number {
  const ms = gateRawToMs(expiryRaw) - Date.now();
  return Math.max(0, Math.floor(ms / 86400000));
}

function gateRawToMs(expiryRaw: string): number {
  const y = parseInt(expiryRaw.slice(0, 4));
  const m = parseInt(expiryRaw.slice(4, 6)) - 1;
  const d = parseInt(expiryRaw.slice(6, 8));
  return Date.UTC(y, m, d, 8, 0, 0);
}
