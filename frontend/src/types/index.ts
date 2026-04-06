export interface Ticker {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  volume: number;
  change_24h: number;
  timestamp: string;
}

export interface Signal {
  symbol: string;
  signal: "BUY" | "SELL" | "HOLD";
  meta_score: number;
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward: number;
}

export interface Decision {
  signal: string;
  meta_score: number;
  confidence: number;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  risk_reward: number;
  position_size_pct: number;
}

export interface AnalysisResult {
  symbol: string;
  timeframe: string;
  decision: Decision;
  strategies: Record<string, StrategyDetail>;
  reasoning: string[];
}

export interface StrategyDetail {
  signal: string;
  confidence: number;
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  reasoning: string[];
}

export interface BacktestResult {
  symbol: string;
  timeframe: string;
  period: { start: string; end: string };
  performance: {
    initial_capital: number;
    final_capital: number;
    total_return: number;
    total_return_pct: number;
    max_drawdown_pct: number;
    sharpe_ratio: number;
    profit_factor: number;
  };
  trades: {
    total: number;
    winning: number;
    losing: number;
    win_rate: number;
    avg_win: number;
    avg_loss: number;
    largest_win: number;
    largest_loss: number;
  };
  equity_curve: number[];
  trade_history: TradeRecord[];
  monthly_returns: Record<string, number>;
}

export interface TradeRecord {
  entry_time: string;
  exit_time: string;
  side: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  pnl_pct: number;
  strategy: string;
  confidence: number;
}

export interface PortfolioOverview {
  total_value: number;
  cash: number;
  pnl_total: number;
  pnl_pct: number;
  max_drawdown: number;
  sharpe_ratio: number;
  trading_mode: string;
  positions: Position[];
}

export interface Position {
  symbol: string;
  side: string;
  entry_price: number;
  current_price: number;
  quantity: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
  allocation_pct: number;
}

// ── Perfiles de riesgo (SPOT) ────────────────────────────

export type RiskProfileType = "conservador" | "moderado" | "agresivo";

export interface AssetAllocation {
  symbol: string;
  target_pct: number;
  category: string;
}

export interface RiskProfile {
  type: RiskProfileType;
  name: string;
  description: string;
  max_drawdown_pct: number;
  max_risk_per_trade_pct: number;
  rebalance_threshold_pct: number;
  allocations: AssetAllocation[];
  cash_pct: number;
}

export interface RebalanceOrder {
  symbol: string;
  category: string;
  action: "comprar" | "vender" | "mantener" | "liberar" | "invertir";
  target_pct: number;
  current_pct: number;
  delta_pct: number;
  target_value_usd: number;
  current_value_usd: number;
  delta_usd: number;
  quantity: number;
  price: number;
}
