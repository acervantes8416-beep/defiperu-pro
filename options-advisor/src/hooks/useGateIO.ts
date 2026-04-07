/**
 * Hook: Gate.io data flow via REST polling only.
 * Spot price every 3s, options chain every 5min, engine every 30s.
 */
import { useEffect, useRef } from "react";
import { useMarketStore } from "@/store/marketStore";
import { fetchSpotPrice, fetchOptionsChain, fetchCandles, assetToUnderlying } from "@/lib/gateio";

export function useGateIO() {
  const asset = useMarketStore((s) => s.asset);
  const spotRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chainRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear previous timers
    if (spotRef.current) clearInterval(spotRef.current);
    if (chainRef.current) clearInterval(chainRef.current);
    if (engineRef.current) clearInterval(engineRef.current);

    const store = useMarketStore.getState;

    // ── Spot price polling every 3s ──
    const pollSpot = () => {
      fetchSpotPrice(asset)
        .then((p) => { if (p > 0) store().setSpot(p); })
        .catch(() => {});
    };
    pollSpot(); // immediate
    spotRef.current = setInterval(pollSpot, 3000);

    // ── Load options chain + candles ──
    const loadData = async () => {
      const s = store();
      s.setLoading(true);
      s.setError(null);

      const underlying = assetToUnderlying(asset);
      const [optRes, candlesRes] = await Promise.allSettled([
        fetchOptionsChain(asset),
        fetchCandles(underlying, "1h", 14),
      ]);

      if (optRes.status === "fulfilled") {
        store().setOptions(optRes.value);
      } else {
        store().setError("Error cargando opciones: " + (optRes.reason?.message || "desconocido"));
      }

      if (candlesRes.status === "fulfilled" && candlesRes.value.length > 0) {
        store().setCloses(candlesRes.value);
      }

      store().setLoading(false);
    };

    loadData();
    chainRef.current = setInterval(loadData, 5 * 60 * 1000); // every 5 min

    // ── Engine refresh every 30s ──
    engineRef.current = setInterval(() => {
      store().runEngine();
    }, 30000);

    return () => {
      if (spotRef.current) clearInterval(spotRef.current);
      if (chainRef.current) clearInterval(chainRef.current);
      if (engineRef.current) clearInterval(engineRef.current);
    };
  }, [asset]);
}
