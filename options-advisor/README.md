# Options Advisor — BTC/ETH

Real-time options trading advisor for Deribit. No API keys required — uses public endpoints.

## Setup

```bash
cd options-advisor
npm install
npm run dev
# Open http://localhost:5173
```

## Architecture

| Module | Description |
|--------|-------------|
| `blackScholes.ts` | Black-Scholes pricing + Greeks (Δ, Γ, Θ, ν) |
| `indicators.ts` | RSI(14), EMA(9/21/55), trend detection, cross detection |
| `maxPain.ts` | Max Pain calculation, Put/Call Ratio, Volatility Smile |
| `deribit.ts` | REST client for option chain + historical candles |
| `useDeribit.ts` | WebSocket hook with auto-reconnect (exponential backoff) |
| `decisionEngine.ts` | Signal generator: combines TA + options data → BUY/SELL signals |
| `marketStore.ts` | Zustand store — global state + data pipeline |

## Data Sources

- **Spot price**: Deribit WebSocket (`deribit_price_index`) — real-time
- **Option chain**: Deribit REST (`get_book_summary_by_currency`) — every 5 min
- **Historical**: Deribit TradingView endpoint (`get_tradingview_chart_data`) — 14 days 1h candles
- **No API keys needed** — all public endpoints

## Signals Logic

Scores 0-100 based on 6 factors per direction (CALL/PUT):
- RSI levels, EMA alignment, EMA cross
- Put/Call Ratio, Max Pain distance, IV Skew

Filters: OI > 100, spread < 15%, delta 0.25-0.45, DTE 10-35 days.
