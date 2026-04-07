/**
 * Gate.io REST client for options data.
 * All public endpoints — no API keys required.
 * Uses Vite proxy (/gateapi → api.gateio.ws) to bypass browser CORS.
 */

// In dev: Vite proxy rewrites /gateapi → https://api.gateio.ws/api/v4
// In prod: use direct URL (deploy behind own CORS proxy or same-origin)
const REST = import.meta.env.DEV ? "/gateapi" : "https://api.gateio.ws/api/v4";

// ── Types ──

export interface OptionContract {
  instrumentName: string;
  underlying: string;
  strike: number;
  expiry: string;      // display: "25APR25"
  expiryRaw: string;   // raw: "20250425"
  type: "C" | "P";
  markIV: number;      // percentage (72.4)
  bidPrice: number;     // USDT
  askPrice: number;     // USDT
  markPrice: number;    // USDT
  openInterest: number;
  volume: number;
  spreadPct: number;
  delta: number | null;
  gamma: number | null;
  vega: number | null;
  theta: number | null;
}

// ── Helpers ──

export function assetToUnderlying(asset: "BTC" | "ETH"): string {
  return `${asset}_USDT`;
}

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

/** "20250425" → "25APR25" */
function rawToDisplay(raw: string): string {
  const d = raw.slice(6, 8);
  const m = MONTHS[parseInt(raw.slice(4, 6)) - 1] || "???";
  const y = raw.slice(2, 4);
  return `${d}${m}${y}`;
}

/** Parse "BTC_USDT-20250425-87000-C" → { underlying, expiryRaw, strike, type } */
export function parseGateContract(name: string) {
  const parts = name.split("-");
  if (parts.length !== 4) return null;
  return {
    underlying: parts[0],
    expiryRaw: parts[1],
    strike: parseFloat(parts[2]),
    type: parts[3] as "C" | "P",
  };
}

/** "20250425" → UTC milliseconds at 08:00 */
export function gateExpiryToTimestamp(raw: string): number {
  const y = parseInt(raw.slice(0, 4));
  const m = parseInt(raw.slice(4, 6)) - 1;
  const d = parseInt(raw.slice(6, 8));
  return Date.UTC(y, m, d, 8, 0, 0);
}

// ── REST ──

export async function fetchOptionsChain(asset: "BTC" | "ETH"): Promise<OptionContract[]> {
  const underlying = assetToUnderlying(asset);
  const resp = await fetch(`${REST}/options/tickers?underlying=${underlying}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`Options chain: ${resp.status}`);
  const items: any[] = await resp.json();

  const contracts: OptionContract[] = [];
  for (const item of items) {
    const parsed = parseGateContract(item.name || "");
    if (!parsed) continue;

    const markIV = (parseFloat(item.mark_iv) || 0) * 100; // 0.724 → 72.4
    const bidPrice = parseFloat(item.bid1_price) || 0;
    const askPrice = parseFloat(item.ask1_price) || 0;
    const markPrice = parseFloat(item.mark_price) || 0;
    if (markIV <= 0 && markPrice <= 0) continue;

    const spread = markPrice > 0 ? ((askPrice - bidPrice) / markPrice) * 100 : 999;

    contracts.push({
      instrumentName: item.name,
      underlying: parsed.underlying,
      strike: parsed.strike,
      expiry: rawToDisplay(parsed.expiryRaw),
      expiryRaw: parsed.expiryRaw,
      type: parsed.type,
      markIV,
      bidPrice,
      askPrice,
      markPrice,
      openInterest: parseFloat(item.position_size) || parseFloat(item.open_interest) || 0,
      volume: parseFloat(item.volume_24h) || 0,
      spreadPct: Math.round(spread * 10) / 10,
      delta: item.delta != null ? parseFloat(item.delta) : null,
      gamma: item.gamma != null ? parseFloat(item.gamma) : null,
      vega: item.vega != null ? parseFloat(item.vega) : null,
      theta: item.theta != null ? parseFloat(item.theta) : null,
    });
  }
  return contracts;
}

export async function fetchCandles(
  underlying: string, intervalStr: string = "1h", daysBack: number = 14
): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - daysBack * 86400;

  // Try options candles first
  try {
    const resp = await fetch(
      `${REST}/options/underlying/candlesticks?underlying=${underlying}&interval=${intervalStr}&from=${from}&to=${now}`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (resp.ok) {
      const data: any[] = await resp.json();
      if (data.length > 0) {
        return data.map((c: any) => parseFloat(c.c || c[4]) || 0).filter(Boolean);
      }
    }
  } catch { /* fallback */ }

  // Fallback to spot candles
  const pair = underlying.replace("_", "_");
  const resp = await fetch(
    `${REST}/spot/candlesticks?currency_pair=${pair}&interval=${intervalStr}&from=${from}&to=${now}`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!resp.ok) throw new Error(`Candles: ${resp.status}`);
  const data: any[] = await resp.json();
  return data.map((c: any) => parseFloat(c[2]) || 0).filter(Boolean); // [2] = close
}

export async function fetchSpotPrice(asset: "BTC" | "ETH"): Promise<number> {
  const pair = `${asset}_USDT`;
  const resp = await fetch(`${REST}/spot/tickers?currency_pair=${pair}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`Spot: ${resp.status}`);
  const data = await resp.json();
  const last = parseFloat(data[0]?.last) || 0;
  return last;
}

// WebSocket removed — browser CORS blocks Gate.io WS.
// All data via REST polling (fetchSpotPrice every 3s).
