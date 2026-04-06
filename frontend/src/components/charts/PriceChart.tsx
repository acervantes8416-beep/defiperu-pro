"use client";
import { useEffect, useRef, memo } from "react";

interface Props {
  symbol: string;
  timeframe?: string;
  height?: number;
}

/**
 * TradingView Advanced Chart widget embebido.
 * Muestra velas con EMA 50 y EMA 200 preconfiguradas.
 */
function PriceChartInner({ symbol, timeframe = "60", height = 500 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Convertir símbolo del formato interno al formato TradingView
  const tvSymbol = `BINANCE:${symbol.replace("/", "").replace("-", "")}`;

  // Mapear timeframes internos a TradingView intervals
  const intervalMap: Record<string, string> = {
    "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1d": "D",
  };
  const interval = intervalMap[timeframe] || timeframe;

  useEffect(() => {
    if (!containerRef.current) return;

    // Limpiar widget anterior
    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.style.height = `${height}px`;
    widgetContainer.style.width = "100%";

    const widgetInner = document.createElement("div");
    widgetInner.className = "tradingview-widget-container__widget";
    widgetInner.style.height = "100%";
    widgetInner.style.width = "100%";
    widgetContainer.appendChild(widgetInner);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1", // Candlestick
      locale: "es",
      backgroundColor: "#111827",
      gridColor: "#1f293780",
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: true,
      hide_volume: false,
      // Estudios: EMA 50 (azul) y EMA 200 (naranja)
      studies: [
        { id: "MAExp@tv-basicstudies", inputs: { length: 50 } },
        { id: "MAExp@tv-basicstudies", inputs: { length: 200 } },
      ],
      // Colores personalizados
      overrides: {
        "mainSeriesProperties.candleStyle.upColor": "#00d4aa",
        "mainSeriesProperties.candleStyle.downColor": "#ff4757",
        "mainSeriesProperties.candleStyle.borderUpColor": "#00d4aa",
        "mainSeriesProperties.candleStyle.borderDownColor": "#ff4757",
        "mainSeriesProperties.candleStyle.wickUpColor": "#00d4aa",
        "mainSeriesProperties.candleStyle.wickDownColor": "#ff4757",
      },
    });

    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);
    scriptRef.current = script;

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [tvSymbol, interval, height]);

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold">{symbol}</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-blue-400 rounded-full inline-block" />
              <span className="text-text-muted">EMA 50</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-orange-400 rounded-full inline-block" />
              <span className="text-text-muted">EMA 200</span>
            </span>
          </div>
        </div>
        <span className="text-xs text-text-muted">Powered by TradingView</span>
      </div>
      <div ref={containerRef} style={{ height: `${height}px` }} className="w-full" />
    </div>
  );
}

const PriceChart = memo(PriceChartInner);
export default PriceChart;
