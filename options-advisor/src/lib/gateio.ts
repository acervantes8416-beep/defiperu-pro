/**
 * Data layer: Binance (spot + candles, CORS open) + Gate.io (options via Vite proxy).
 * No API keys required.
 */

// Gate.io options: proxied in dev, direct in prod
const GATE_REST = import.meta.env.DEV ? "/gateapi" : "https://api.gateio.ws/api/v4";

// Binance: CORS open, works directly from browser
const BINANCE = "https://api.binance.com/api/v3";

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

function assetToBinanceSymbol(asset: "BTC" | "ETH"): string {
  return asset === "BTC" ? "BTCUSDT" : "ETHUSDT";
}

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function rawToDisplay(raw: string): string {
  const d = raw.slice(6, 8);
  const m = MONTHS[parseInt(raw.slice(4, 6)) - 1] || "???";
  const y = raw.slice(2, 4);
  return `${d}${m}${y}`;
}

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

export function gateExpiryToTimestamp(raw: string): number {
  const y = parseInt(raw.slice(0, 4));
  const m = parseInt(raw.slice(4, 6)) - 1;
  const d = parseInt(raw.slice(6, 8));
  return Date.UTC(y, m, d, 8, 0, 0);
}

// ── Binance: Spot Price (CORS open) ──

export async function fetchSpotPrice(asset: "BTC" | "ETH"): Promise<number> {
  const symbol = assetToBinanceSymbol(asset);
  const resp = await fetch(`${BINANCE}/ticker/price?symbol=${symbol}`);
  if (!resp.ok) throw new Error(`Binance spot: ${resp.status}`);
  const data = await resp.json();
  return parseFloat(data.price ?? "0") || 0;
}

// ── Binance: Candles for RSI/EMA (CORS open) ──

export async function fetchCandles(asset: "BTC" | "ETH", interval: string = "1h", limit: number = 200): Promise<number[]> {
  const symbol = assetToBinanceSymbol(asset);
  const resp = await fetch(`${BINANCE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  if (!resp.ok) throw new Error(`Binance klines: ${resp.status}`);
  const data: any[] = await resp.json();
  // Binance klines: each element is array, index 4 = close price
  return data.map((k: any[]) => parseFloat(k[4]));
}

// No WebSocket — pure REST polling to avoid all CORS/WS issues.
// Spot + candles from Binance (CORS open), options from Gate.io (via Vite proxy).

// ── Gate.io: Options Chain (via Vite proxy) ──

export async function fetchOptionsChain(asset: "BTC" | "ETH"): Promise<OptionContract[]> {
  const underlying = assetToUnderlying(asset);
  const resp = await fetch(`${GATE_REST}/options/tickers?underlying=${underlying}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`Gate.io options: ${resp.status}`);
  const items: any[] = await resp.json();

  const contracts: OptionContract[] = [];
  for (const item of items) {
    const parsed = parseGateContract(item.name || "");
    if (!parsed) continue;

    const markIV = (parseFloat(item.mark_iv) || 0) * 100;
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
