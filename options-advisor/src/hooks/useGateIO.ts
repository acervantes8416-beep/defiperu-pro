/**
 * Hook: Binance WS for spot price + REST polling backup.
 * Options chain from Gate.io (via Vite proxy). Candles from Binance.
 */
import { useEffect, useRef } from "react";
import { useMarketStore } from "@/store/marketStore";
import { BinanceWS, fetchSpotPrice, fetchOptionsChain, fetchCandles } from "@/lib/gateio";

export function useGateIO() {
  const asset = useMarketStore((s) => s.asset);
  const wsRef = useRef<BinanceWS | null>(null);
  const spotRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chainRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const engineRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Cleanup
    wsRef.current?.close();
    if (spotRef.current) clearInterval(spotRef.current);
    if (chainRef.current) clearInterval(chainRef.current);
    if (engineRef.current) clearInterval(engineRef.current);

    const store = useMarketStore.getState;

    // ── 1. Binance WebSocket for real-time spot price ──
    const ws = new BinanceWS(
      asset,
      (price) => store().setSpot(price),
      (connected) => store().setConnected(connected),
    );
    ws.connect();
    wsRef.current = ws;

    // ── 2. Immediate REST spot fetch (before WS connects) ──
    fetchSpotPrice(asset)
      .then((p) => { if (p > 0) store().setSpot(p); })
      .catch(() => {});

    // ── 3. REST backup polling every 5s ──
    spotRef.current = setInterval(() => {
      fetchSpotPrice(asset)
        .then((p) => { if (p > 0) store().setSpot(p); })
        .catch(() => {});
    }, 5000);

    // ── 4. Load options chain (Gate.io) + candles (Binance) ──
    const loadData = async () => {
      const s = store();
      s.setLoading(true);
      s.setError(null);

      const [optRes, candlesRes] = await Promise.allSettled([
        fetchOptionsChain(asset),
        fetchCandles(asset, "1h", 200),
      ]);

      if (optRes.status === "fulfilled") {
        store().setOptions(optRes.value);
      } else {
        store().setError("Error opciones: " + (optRes.reason?.message || "desconocido"));
      }

      if (candlesRes.status === "fulfilled" && candlesRes.value.length > 0) {
        store().setCloses(candlesRes.value);
      }

      store().setLoading(false);
    };

    loadData();
    chainRef.current = setInterval(loadData, 5 * 60 * 1000);

    // ── 5. Engine refresh every 30s ──
    engineRef.current = setInterval(() => store().runEngine(), 30000);

    return () => {
      ws.close();
      if (spotRef.current) clearInterval(spotRef.current);
      if (chainRef.current) clearInterval(chainRef.current);
      if (engineRef.current) clearInterval(engineRef.current);
    };
  }, [asset]);
}
