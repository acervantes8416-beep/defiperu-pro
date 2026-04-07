/**
 * Hook that manages Gate.io data flow: WS + REST polling + engine refresh.
 */
import { useEffect, useRef } from "react";
import { useMarketStore } from "@/store/marketStore";
import { GateIOWS, fetchSpotPrice, fetchOptionsChain, fetchCandles, assetToUnderlying } from "@/lib/gateio";

export function useGateIO() {
  const store = useMarketStore();
  const wsRef = useRef<GateIOWS | null>(null);
  const spotPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chainPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enginePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const asset = store.asset;

  useEffect(() => {
    // Cleanup previous
    wsRef.current?.close();
    if (spotPollRef.current) clearInterval(spotPollRef.current);
    if (chainPollRef.current) clearInterval(chainPollRef.current);
    if (enginePollRef.current) clearInterval(enginePollRef.current);

    // 1. WebSocket for real-time spot
    const ws = new GateIOWS(
      asset,
      (price) => useMarketStore.getState().setSpot(price),
      (connected) => useMarketStore.getState().setConnected(connected),
    );
    ws.connect();
    wsRef.current = ws;

    // 2. Immediate REST spot fetch (before WS connects)
    fetchSpotPrice(asset)
      .then((p) => { if (p > 0) useMarketStore.getState().setSpot(p); })
      .catch(() => {});

    // 3. Load options chain + candles
    const loadData = async () => {
      const s = useMarketStore.getState();
      s.setLoading(true);
      s.setError(null);

      const underlying = assetToUnderlying(asset);
      const [optRes, candlesRes] = await Promise.allSettled([
        fetchOptionsChain(asset),
        fetchCandles(underlying, "1h", 14),
      ]);

      if (optRes.status === "fulfilled") {
        useMarketStore.getState().setOptions(optRes.value);
      } else {
        useMarketStore.getState().setError("Error cargando opciones: " + (optRes.reason?.message || "unknown"));
      }

      if (candlesRes.status === "fulfilled" && candlesRes.value.length > 0) {
        useMarketStore.getState().setCloses(candlesRes.value);
      }

      useMarketStore.getState().setLoading(false);
    };

    loadData();

    // 4. Spot REST polling every 8s — always runs as backup for WS
    spotPollRef.current = setInterval(() => {
      fetchSpotPrice(asset)
        .then((p) => { if (p > 0) useMarketStore.getState().setSpot(p); })
        .catch(() => {});
    }, 8000);

    // 5. Refresh chain every 5 min
    chainPollRef.current = setInterval(loadData, 300000);

    // 6. Engine refresh every 30s
    enginePollRef.current = setInterval(() => {
      useMarketStore.getState().runEngine();
    }, 30000);

    return () => {
      ws.close();
      if (spotPollRef.current) clearInterval(spotPollRef.current);
      if (chainPollRef.current) clearInterval(chainPollRef.current);
      if (enginePollRef.current) clearInterval(enginePollRef.current);
    };
  }, [asset]);
}
