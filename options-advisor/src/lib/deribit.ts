/**
 * Deribit REST API helpers (public endpoints, no auth needed).
 */
import type { OptionContract } from "./maxPain";

const REST_BASE = "https://www.deribit.com/api/v2/public";

/** Parse instrument name like BTC-25APR25-87000-C */
function parseInstrument(name: string): { strike: number; expiry: string; type: "C" | "P" } | null {
  const parts = name.split("-");
  if (parts.length !== 4) return null;
  return {
    expiry: parts[1],
    strike: parseInt(parts[2]),
    type: parts[3] as "C" | "P",
  };
}

/** Fetch option chain for a currency */
export async function fetchOptionChain(currency: "BTC" | "ETH"): Promise<OptionContract[]> {
  const resp = await fetch(`${REST_BASE}/get_book_summary_by_currency?currency=${currency}&kind=option`, {
    signal: AbortSignal.timeout(10000),
  });
  const data = await resp.json();
  const items: any[] = data.result || [];

  const options: OptionContract[] = [];
  for (const item of items) {
    const parsed = parseInstrument(item.instrument_name || "");
    if (!parsed) continue;
    // Solo opciones con datos válidos
    if (!item.mark_iv || item.mark_iv <= 0) continue;

    options.push({
      instrument_name: item.instrument_name,
      strike: parsed.strike,
      expiry: parsed.expiry,
      type: parsed.type,
      mark_iv: item.mark_iv || 0,
      bid_price: item.bid_price || 0,
      ask_price: item.ask_price || 0,
      mark_price: item.mark_price || 0,
      open_interest: item.open_interest || 0,
      volume: item.volume_usd || item.volume || 0,
    });
  }
  return options;
}

/** Fetch 1h candles for RSI/EMA calculation (14 days) */
export async function fetchCandles(instrument: string, days: number = 14): Promise<number[]> {
  const now = Date.now();
  const start = now - days * 24 * 60 * 60 * 1000;
  const resp = await fetch(
    `${REST_BASE}/get_tradingview_chart_data?instrument_name=${instrument}&resolution=60&start_timestamp=${start}&end_timestamp=${now}`,
    { signal: AbortSignal.timeout(10000) }
  );
  const data = await resp.json();
  return (data.result?.close || []) as number[];
}
