/**
 * Zustand store — estado global del mercado y señales.
 */
import { create } from "zustand";
import type { OptionContract } from "@/lib/maxPain";
import type { Signal } from "@/lib/decisionEngine";
import { calcRSI, calcEMA, detectTrend } from "@/lib/indicators";
import { calcMaxPain, calcPCR, calcVolSmile } from "@/lib/maxPain";
import { runEngine } from "@/lib/decisionEngine";
import { fetchOptionChain, fetchCandles } from "@/lib/deribit";

interface MarketState {
  asset: "BTC" | "ETH";
  spot: number;
  options: OptionContract[];
  closes: number[];
  connected: boolean;
  rsi14: number | null;
  ema9: number | null;
  ema21: number | null;
  ema55: number | null;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  pcr: { pcrOI: number; pcrVol: number };
  maxPain: { maxPainStrike: number; distancePct: number };
  smile: { smileData: any[]; atmIV: number; skew: number };
  signals: Signal[];
  capital: number;
  lastUpdated: Date | null;
  loading: boolean;
  error: string | null;
  expiries: string[];

  // Actions
  setAsset: (a: "BTC" | "ETH") => void;
  setSpot: (s: number) => void;
  setConnected: (c: boolean) => void;
  setCapital: (c: number) => void;
  fetchData: () => Promise<void>;
  runSignals: () => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  asset: "BTC",
  spot: 0,
  options: [],
  closes: [],
  connected: false,
  rsi14: null,
  ema9: null,
  ema21: null,
  ema55: null,
  trend: "NEUTRAL",
  pcr: { pcrOI: 0, pcrVol: 0 },
  maxPain: { maxPainStrike: 0, distancePct: 0 },
  smile: { smileData: [], atmIV: 0, skew: 0 },
  signals: [],
  capital: 5000,
  lastUpdated: null,
  loading: false,
  error: null,
  expiries: [],

  setAsset: (asset) => {
    set({ asset, options: [], closes: [], signals: [], spot: 0 });
    get().fetchData();
  },

  setSpot: (spot) => set({ spot }),
  setConnected: (connected) => set({ connected }),
  setCapital: (capital) => {
    set({ capital });
    get().runSignals();
  },

  fetchData: async () => {
    const { asset } = get();
    set({ loading: true, error: null });

    try {
      const [options, closes] = await Promise.all([
        fetchOptionChain(asset),
        fetchCandles(`${asset}-PERPETUAL`, 14),
      ]);

      const spot = get().spot || (closes.length > 0 ? closes[closes.length - 1] : 0);

      // Calculate indicators
      const rsi14 = calcRSI(closes, 14);
      const ema9 = calcEMA(closes, 9);
      const ema21 = calcEMA(closes, 21);
      const ema55 = calcEMA(closes, 55);
      const trend = detectTrend(ema9, ema21, ema55);

      // Options analytics
      const pcr = calcPCR(options);
      const maxPain = calcMaxPain(options, spot);

      // Get unique expiries
      const expiries = [...new Set(options.map((o) => o.expiry))].sort();
      const nearestExpiry = expiries[0] || "";
      const smile = calcVolSmile(options, nearestExpiry, spot);

      set({
        options, closes, rsi14, ema9, ema21, ema55, trend,
        pcr, maxPain, smile, expiries, loading: false, lastUpdated: new Date(),
      });

      get().runSignals();
    } catch (e: any) {
      set({ loading: false, error: e.message || "Error fetching data" });
    }
  },

  runSignals: () => {
    const s = get();
    if (s.options.length === 0 || s.spot === 0) return;

    const signals = runEngine({
      spot: s.spot,
      rsi: s.rsi14,
      ema9: s.ema9,
      ema21: s.ema21,
      ema55: s.ema55,
      pcrOI: s.pcr.pcrOI,
      maxPainStrike: s.maxPain.maxPainStrike,
      skew: s.smile.skew,
      options: s.options,
      capital: s.capital,
    });

    set({ signals });
  },
}));
