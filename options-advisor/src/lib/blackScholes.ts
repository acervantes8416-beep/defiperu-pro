/**
 * Black-Scholes pricing model + Greeks.
 * Distribución normal acumulada vía aproximación de Abramowitz & Stegun.
 */

// Distribución normal estándar acumulada N(x)
function normCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + p * Math.abs(x));
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x / 2);
  return 0.5 * (1 + sign * y);
}

// Densidad normal estándar N'(x)
function normPDF(x: number): number {
  return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
}

export interface Greeks {
  price: number;
  delta: number;
  gamma: number;
  theta: number;  // USD/día
  vega: number;   // USD por 1% de cambio en IV
  iv: number;
}

/**
 * Calcula precio teórico y Greeks de una opción.
 * @param S   Spot price del subyacente
 * @param K   Strike price
 * @param T   Tiempo al vencimiento en años
 * @param sigma Volatilidad implícita (decimal, ej: 0.72 = 72%)
 * @param type  'C' para call, 'P' para put
 * @param r   Tasa libre de riesgo anual (default 5%)
 */
export function calcGreeks(
  S: number, K: number, T: number, sigma: number, type: "C" | "P", r: number = 0.05
): Greeks {
  // Evitar divisiones por cero
  if (T <= 0 || sigma <= 0 || S <= 0 || K <= 0) {
    const intrinsic = type === "C" ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: type === "C" ? (S > K ? 1 : 0) : (S < K ? -1 : 0), gamma: 0, theta: 0, vega: 0, iv: sigma };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + sigma * sigma / 2) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  let price: number;
  let delta: number;

  if (type === "C") {
    price = S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
    delta = normCDF(d1);
  } else {
    price = K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
    delta = normCDF(d1) - 1;
  }

  // Gamma: igual para call y put
  const gamma = normPDF(d1) / (S * sigma * sqrtT);

  // Theta: decaimiento diario en USD
  const thetaAnnual = -(S * normPDF(d1) * sigma) / (2 * sqrtT)
    - r * K * Math.exp(-r * T) * (type === "C" ? normCDF(d2) : normCDF(-d2))
    * (type === "C" ? 1 : -1);
  // Simplificación más estable:
  const thetaCall = -(S * normPDF(d1) * sigma) / (2 * sqrtT) - r * K * Math.exp(-r * T) * normCDF(d2);
  const thetaPut = -(S * normPDF(d1) * sigma) / (2 * sqrtT) + r * K * Math.exp(-r * T) * normCDF(-d2);
  const theta = (type === "C" ? thetaCall : thetaPut) / 365; // por día

  // Vega: cambio de precio por 1% de cambio en IV
  const vega = S * sqrtT * normPDF(d1) / 100; // dividir por 100 para "por punto porcentual"

  return { price, delta, gamma, theta, vega, iv: sigma };
}
