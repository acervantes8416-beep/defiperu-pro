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

  // Market Global
  getFearGreed: () => fetchAPI("/market-global/fear-greed"),
  getGlobalData: () => fetchAPI("/market-global/global"),
  getMarketPhase: () => fetchAPI("/market-global/market-phase"),
  getTop100: (page = 1) => fetchAPI(`/market-global/top100?page=${page}`),
  getNarratives: () => fetchAPI("/market-global/narratives"),
  getHistorical: (coinId: string, days = 30) => fetchAPI(`/market-global/historical/${coinId}?days=${days}`),
  getSimulation: (profile: string, days = 30) => fetchAPI(`/market-global/simulation/${profile}?days=${days}`),

  // Signals
  analyze: (symbol: string, timeframe = "1h") =>
    fetchAPI(`/signals/analyze/${symbol}?timeframe=${timeframe}`),
  scan: (timeframe = "1h") => fetchAPI(`/signals/scan?timeframe=${timeframe}`),
  getIndicators: (symbol: string, timeframe = "1h") =>
    fetchAPI(`/signals/indicators/${symbol}?timeframe=${timeframe}`),

  // Portfolio
  getPortfolio: () => fetchAPI("/portfolio/overview"),
  getProfiles: () => fetchAPI("/portfolio/profiles"),
  setProfile: (profile: string) =>
    fetchAPI("/portfolio/profile", { method: "POST", body: JSON.stringify({ profile }) }),
  getRebalance: (profile: string, value = 10000) =>
    fetchAPI(`/portfolio/rebalance?profile=${profile}&portfolio_value=${value}`),
  setMode: (mode: string) =>
    fetchAPI("/portfolio/mode", { method: "POST", body: JSON.stringify({ mode }) }),
  getPendingTrades: () => fetchAPI("/portfolio/pending-trades"),
  approveTrade: (symbol: string) =>
    fetchAPI("/portfolio/approve-trade", { method: "POST", body: JSON.stringify({ symbol }) }),
};
