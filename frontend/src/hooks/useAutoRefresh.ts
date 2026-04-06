"use client";
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook para actualización automática con countdown visible.
 * @param fetchFn — función async que obtiene los datos
 * @param intervalSec — intervalo en segundos (default 60)
 */
export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
  intervalSec: number = 60,
) {
  const [data, setData] = useState<T | null>(null);
  const [countdown, setCountdown] = useState(intervalSec);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetchRef.current();
      setData(result);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Error de conexión");
    } finally {
      setLoading(false);
      setCountdown(intervalSec);
    }
  }, [intervalSec]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refresh();
          return intervalSec;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [intervalSec, refresh]);

  return { data, countdown, loading, error, refresh };
}
