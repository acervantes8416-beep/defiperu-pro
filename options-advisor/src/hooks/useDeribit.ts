/**
 * Hook de conexión WebSocket a Deribit con reconnect automático (exponential backoff).
 */
import { useEffect, useRef, useCallback, useState } from "react";

const WS_URL = "wss://www.deribit.com/ws/api/v2";

interface UseDeribitReturn {
  connected: boolean;
  spot: number;
  error: string | null;
}

export function useDeribit(
  asset: "BTC" | "ETH",
  onSpotUpdate: (price: number) => void
): UseDeribitReturn {
  const [connected, setConnected] = useState(false);
  const [spot, setSpot] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setError(null);
        retryRef.current = 0;

        // Subscribe to price index
        const channel = `deribit_price_index.${asset.toLowerCase()}_usd`;
        ws.send(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "public/subscribe",
          params: { channels: [channel] },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.params?.channel?.includes("deribit_price_index")) {
            const price = msg.params.data?.price;
            if (typeof price === "number" && price > 0) {
              setSpot(price);
              onSpotUpdate(price);
            }
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setConnected(false);
        // Exponential backoff: 1s, 2s, 4s, 8s... max 30s
        const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30000);
        retryRef.current++;
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        setError("Error de conexión WebSocket");
        ws.close();
      };
    } catch (e) {
      setError("No se pudo conectar a Deribit");
    }
  }, [asset, onSpotUpdate]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { connected, spot, error };
}
