const API_BASE = "/api/v1";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API Error");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    fetchAPI("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username, password }),
    }),
  register: (email: string, username: string, password: string) =>
    fetchAPI("/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) }),

  // Market
  getTicker: (symbol: string) => fetchAPI(`/market/ticker/${symbol}`),
  getTickers: () => fetchAPI("/market/tickers"),
  getOHLCV: (symbol: string, timeframe = "1h", limit = 200) =>
    fetchAPI(`/market/ohlcv/${symbol}?timeframe=${timeframe}&limit=${limit}`),

  // Signals
  analyze: (symbol: string, timeframe = "1h") =>
    fetchAPI(`/signals/analyze/${symbol}?timeframe=${timeframe}`),
  scan: (timeframe = "1h") => fetchAPI(`/signals/scan?timeframe=${timeframe}`),
  getIndicators: (symbol: string, timeframe = "1h") =>
    fetchAPI(`/signals/indicators/${symbol}?timeframe=${timeframe}`),

  // Portfolio
  getPortfolio: () => fetchAPI("/portfolio/overview"),
  setMode: (mode: string) =>
    fetchAPI("/portfolio/mode", { method: "POST", body: JSON.stringify({ mode }) }),
  getPendingTrades: () => fetchAPI("/portfolio/pending-trades"),
  approveTrade: (symbol: string) =>
    fetchAPI("/portfolio/approve-trade", { method: "POST", body: JSON.stringify({ symbol }) }),

  // Backtest
  runBacktest: (symbol: string, timeframe: string, capital: number, confidence: number) =>
    fetchAPI("/backtest/run", {
      method: "POST",
      body: JSON.stringify({ symbol, timeframe, initial_capital: capital, min_confidence: confidence }),
    }),

  // Social
  getLeaderboard: () => fetchAPI("/social/leaderboard"),
  getStrategyRanking: () => fetchAPI("/social/strategy-ranking"),
  startCopyTrading: (leaderId: string) =>
    fetchAPI("/social/copy", { method: "POST", body: JSON.stringify({ leader_id: leaderId }) }),
};
