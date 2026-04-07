/**
 * Zustand global state — market data pipeline.
 */
import { create } from "zustand";
import type { OptionContract } from "@/lib/gateio";
import type { Signal, DTERange } from "@/lib/decisionEngine";
import { calcRSI, calcEMA, detectTrend, detectCross } from "@/lib/indicators";
import { calcMaxPain, calcPCR, calcVolSmile, getNearestExpiries } from "@/lib/maxPain";
import { runEngine } from "@/lib/decisionEngine";

interface MarketState {
  asset: "BTC" | "ETH";
  spot: number;
  options: OptionContract[];
  closes: number[];
  connected: boolean; // true = REST polling active
  error: string | null;
  rsi14: number | null;
  ema9: number | null;
  ema21: number | null;
  ema55: number | null;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  cross: "GOLDEN" | "DEATH" | null;
  pcr: { pcrOI: number; pcrVol: number };
  maxPain: { maxPainStrike: number; distancePct: number; painByStrike: { strike: number; pain: number }[] };
  smile: { smileData: any[]; atmIV: number; skew: number; otmCallIV: number; otmPutIV: number };
  nearExpiries: string[];
  signals: Signal[];
  capital: number;
  dteRange: DTERange;
  lastUpdated: Date | null;
  loading: boolean;

  setAsset: (a: "BTC" | "ETH") => void;
  setSpot: (s: number) => void;
  setOptions: (o: OptionContract[]) => void;
  setCloses: (c: number[]) => void;
  setConnected: (c: boolean) => void;
  setCapital: (c: number) => void;
  setDteRange: (r: DTERange) => void;
  setLoading: (l: boolean) => void;
  setError: (e: string | null) => void;
  updateMarketData: () => void;
  runEngine: () => void;
}

export const useMarketStore = create<MarketState>((set, get) => ({
  asset: "BTC",
  spot: 0,
  options: [],
  closes: [],
  connected: true, // REST polling — always "connected"
  error: null,
  rsi14: null,
  ema9: null,
  ema21: null,
  ema55: null,
  trend: "NEUTRAL",
  cross: null,
  pcr: { pcrOI: 0, pcrVol: 0 },
  maxPain: { maxPainStrike: 0, distancePct: 0, painByStrike: [] },
  smile: { smileData: [], atmIV: 0, skew: 0, otmCallIV: 0, otmPutIV: 0 },
  nearExpiries: [],
  signals: [],
  capital: 10000,
  dteRange: "auto",
  lastUpdated: null,
  loading: false,

  setAsset: (asset) => {
    set({ asset, options: [], closes: [], signals: [], spot: 0, error: null });
  },

  setSpot: (spot) => {
    set({ spot });
    const s = get();
    if (s.options.length > 0) s.updateMarketData();
  },

  setOptions: (options) => {
    console.log("[Store] setOptions:", options.length, "contracts loaded");
    set({ options });
    get().updateMarketData();
    // Retry engine after 2s to ensure spot + indicators are ready
    setTimeout(() => {
      const s = get();
      if (s.options.length > 0 && s.signals.length === 0) {
        console.log("[Store] Retrying engine after 2s delay...");
        s.runEngine();
      }
    }, 2000);
  },

  setCloses: (closes) => {
    const rsi14 = calcRSI(closes, 14);
    const ema9 = calcEMA(closes, 9);
    const ema21 = calcEMA(closes, 21);
    const ema55 = calcEMA(closes, 55);
    const trend = detectTrend(ema9, ema21, ema55);
    const cross = detectCross(closes);
    set({ closes, rsi14, ema9, ema21, ema55, trend, cross });
    get().runEngine();
  },

  setConnected: (connected) => set({ connected }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  setCapital: (capital) => {
    set({ capital });
    get().runEngine();
  },

  setDteRange: (dteRange) => {
    set({ dteRange });
    get().runEngine();
  },

  updateMarketData: () => {
    const s = get();
    if (s.options.length === 0 || s.spot <= 0) return;

    const pcr = calcPCR(s.options);
    const maxPain = calcMaxPain(s.options, s.spot);
    let nearExpiries = getNearestExpiries(s.options, 3);

    // Fallback: if no future expiries found, use any available expiryRaw
    if (nearExpiries.length === 0) {
      const allExpiries = [...new Set(s.options.map((o) => o.expiryRaw))].sort();
      nearExpiries = allExpiries.slice(0, 3);
      console.log("[Store] Using fallback expiries:", nearExpiries);
    }

    const smile = nearExpiries.length > 0
      ? calcVolSmile(s.options, nearExpiries[0], s.spot)
      : { smileData: [], atmIV: 0, skew: 0, otmCallIV: 0, otmPutIV: 0 };

    set({ pcr, maxPain, smile, nearExpiries, lastUpdated: new Date() });
    s.runEngine();
  },

  runEngine: () => {
    const s = get();
    if (s.options.length === 0 || s.spot <= 0) {
      console.log("[Store] runEngine skip — spot:", s.spot, "options:", s.options.length);
      return;
    }

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
      dteRange: s.dteRange,
    });

    set({ signals });
  },
}));
