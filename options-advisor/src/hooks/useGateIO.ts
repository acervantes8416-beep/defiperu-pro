import { useEffect, useRef } from "react";
import { fetchOptionsChain } from "@/lib/gateio";
import { useMarketStore } from "@/store/marketStore";

export function useGateIO() {
  const asset = useMarketStore((s) => s.asset);
  const setSpot = useMarketStore((s) => s.setSpot);
  const setOptions = useMarketStore((s) => s.setOptions);
  const setCloses = useMarketStore((s) => s.setCloses);
  const runEngine = useMarketStore((s) => s.runEngine);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);

  const stop = () => {
    timers.current.forEach(clearInterval);
    timers.current = [];
  };

  const getSpot = async () => {
    try {
      const sym = asset === "BTC" ? "BTCUSDT" : "ETHUSDT";
      const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=" + sym);
      const dat = await res.json();
      const p = parseFloat(dat.price);
      if (p > 0) setSpot(p);
    } catch (e) {
      console.log("spot error", e);
    }
  };

  const getCandles = async () => {
    try {
      const sym = asset === "BTC" ? "BTCUSDT" : "ETHUSDT";
      const res = await fetch("https://api.binance.com/api/v3/klines?symbol=" + sym + "&interval=1h&limit=200");
      const dat = await res.json();
      const closes = dat.map((k: any[]) => parseFloat(k[4])).filter((v: number) => v > 0);
      if (closes.length > 0) setCloses(closes);
    } catch (e) {
      console.log("candles error", e);
    }
  };

  const getOptions = async () => {
    try {
      const opts = await fetchOptionsChain(asset);
      if (opts.length > 0) setOptions(opts);
    } catch (e) {
      console.log("options error", e);
    }
  };

  useEffect(() => {
    stop();
    useMarketStore.getState().setConnected(true);

    getSpot();
    getCandles();
    getOptions();

    timers.current.push(setInterval(getSpot, 3000));
    timers.current.push(setInterval(getOptions, 300000));
    timers.current.push(setInterval(runEngine, 30000));

    return stop;
  }, [asset]);
}
