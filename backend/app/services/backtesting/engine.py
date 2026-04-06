"""
Backtesting Engine: Simula estrategias sobre datos históricos.
Calcula ROI, win rate, max drawdown, Sharpe ratio y más.
"""
import math
from dataclasses import dataclass, field
from datetime import datetime
import numpy as np
import pandas as pd
from loguru import logger

from app.services.strategies.engine import StrategyEngine
from app.services.decision.meta_score import DecisionEngine


@dataclass
class BacktestTrade:
    """Un trade individual del backtest."""
    entry_time: datetime
    exit_time: datetime | None
    symbol: str
    side: str
    entry_price: float
    exit_price: float
    quantity: float
    pnl: float
    pnl_pct: float
    strategy: str
    confidence: float


@dataclass
class BacktestResult:
    """Resultado completo de un backtest."""
    symbol: str
    timeframe: str
    period_start: str
    period_end: str
    initial_capital: float
    final_capital: float
    total_return: float
    total_return_pct: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    avg_win: float
    avg_loss: float
    largest_win: float
    largest_loss: float
    max_drawdown: float
    max_drawdown_pct: float
    sharpe_ratio: float
    profit_factor: float
    avg_trade_duration: float  # en barras
    equity_curve: list[float] = field(default_factory=list)
    trades: list[dict] = field(default_factory=list)
    monthly_returns: dict[str, float] = field(default_factory=dict)


class BacktestEngine:
    """Motor de backtesting event-driven."""

    def __init__(self, initial_capital: float = 10000.0, commission: float = 0.001):
        self.initial_capital = initial_capital
        self.commission = commission  # 0.1% por trade (Binance)
        self.strategy_engine = StrategyEngine()
        self.decision_engine = DecisionEngine()

    def run(
        self,
        df: pd.DataFrame,
        symbol: str,
        timeframe: str,
        min_confidence: float = 40.0,
        lookback: int = 200,
    ) -> BacktestResult:
        """
        Ejecuta un backtest completo sobre datos históricos.

        Args:
            df: DataFrame OHLCV con al menos 'lookback' velas
            symbol: Símbolo a testear
            timeframe: Timeframe
            min_confidence: Confianza mínima para entrar en trade
            lookback: Velas necesarias para calcular indicadores
        """
        capital = self.initial_capital
        peak_capital = capital
        position = None  # {side, entry_price, quantity, sl, tp, entry_idx}
        trades: list[BacktestTrade] = []
        equity_curve = []
        daily_returns = []

        logger.info(f"Backtesting {symbol} {timeframe} | {len(df)} velas | Capital: ${capital:.0f}")

        for i in range(lookback, len(df)):
            window = df.iloc[i - lookback:i + 1]
            current_price = df["close"].iloc[i]
            current_time = df.index[i]

            # Actualizar equity con posición actual
            if position:
                if position["side"] == "buy":
                    unrealized = (current_price - position["entry_price"]) * position["quantity"]
                else:
                    unrealized = (position["entry_price"] - current_price) * position["quantity"]
                current_equity = capital + unrealized
            else:
                current_equity = capital

            equity_curve.append(current_equity)

            # Calcular daily return
            if len(equity_curve) > 1:
                prev = equity_curve[-2]
                daily_returns.append((current_equity - prev) / prev if prev > 0 else 0)

            # Verificar SL/TP de posición abierta
            if position:
                hit_sl = False
                hit_tp = False

                if position["side"] == "buy":
                    hit_sl = df["low"].iloc[i] <= position["sl"]
                    hit_tp = df["high"].iloc[i] >= position["tp"]
                else:
                    hit_sl = df["high"].iloc[i] >= position["sl"]
                    hit_tp = df["low"].iloc[i] <= position["tp"]

                if hit_sl or hit_tp:
                    exit_price = position["sl"] if hit_sl else position["tp"]
                    if position["side"] == "buy":
                        pnl = (exit_price - position["entry_price"]) * position["quantity"]
                    else:
                        pnl = (position["entry_price"] - exit_price) * position["quantity"]

                    # Comisión
                    pnl -= exit_price * position["quantity"] * self.commission

                    capital += pnl + (position["entry_price"] * position["quantity"])
                    pnl_pct = pnl / (position["entry_price"] * position["quantity"]) * 100

                    trades.append(BacktestTrade(
                        entry_time=position["entry_time"],
                        exit_time=current_time,
                        symbol=symbol,
                        side=position["side"],
                        entry_price=position["entry_price"],
                        exit_price=exit_price,
                        quantity=position["quantity"],
                        pnl=pnl,
                        pnl_pct=pnl_pct,
                        strategy=position["strategy"],
                        confidence=position["confidence"],
                    ))
                    position = None
                    continue

            # Solo analizar si no hay posición abierta
            if position is not None:
                continue

            # Generar señales
            try:
                strategy_signals = self.strategy_engine.analyze_symbol(window)
                decision = self.decision_engine.decide(symbol, timeframe, strategy_signals, capital)
            except Exception:
                continue

            # Entrar en trade si hay señal con suficiente confianza
            if decision.signal == "HOLD" or decision.confidence < min_confidence:
                continue

            # Calcular cantidad
            position_value = capital * decision.position_size_pct
            quantity = position_value / current_price
            if quantity <= 0 or position_value < 10:
                continue

            # Comisión de entrada
            capital -= current_price * quantity * self.commission
            capital -= position_value

            position = {
                "side": "buy" if decision.signal == "BUY" else "sell",
                "entry_price": current_price,
                "quantity": quantity,
                "sl": decision.stop_loss,
                "tp": decision.take_profit,
                "entry_time": current_time,
                "strategy": max(
                    decision.strategy_signals.items(),
                    key=lambda x: x[1].get("confidence", 0),
                )[0] if decision.strategy_signals else "combined",
                "confidence": decision.confidence,
            }

        # Cerrar posición abierta al final
        if position:
            final_price = df["close"].iloc[-1]
            if position["side"] == "buy":
                pnl = (final_price - position["entry_price"]) * position["quantity"]
            else:
                pnl = (position["entry_price"] - final_price) * position["quantity"]
            pnl -= final_price * position["quantity"] * self.commission
            capital += pnl + (position["entry_price"] * position["quantity"])

            trades.append(BacktestTrade(
                entry_time=position["entry_time"],
                exit_time=df.index[-1],
                symbol=symbol,
                side=position["side"],
                entry_price=position["entry_price"],
                exit_price=final_price,
                quantity=position["quantity"],
                pnl=pnl,
                pnl_pct=pnl / (position["entry_price"] * position["quantity"]) * 100,
                strategy=position["strategy"],
                confidence=position["confidence"],
            ))

        return self._compile_results(symbol, timeframe, df, capital, trades, equity_curve, daily_returns)

    def _compile_results(
        self, symbol, timeframe, df, final_capital, trades, equity_curve, daily_returns
    ) -> BacktestResult:
        """Compila estadísticas del backtest."""
        wins = [t for t in trades if t.pnl > 0]
        losses = [t for t in trades if t.pnl <= 0]

        # Max drawdown
        peak = self.initial_capital
        max_dd = 0
        max_dd_pct = 0
        for eq in equity_curve:
            if eq > peak:
                peak = eq
            dd = peak - eq
            dd_pct = dd / peak if peak > 0 else 0
            if dd > max_dd:
                max_dd = dd
                max_dd_pct = dd_pct

        # Sharpe ratio
        if len(daily_returns) > 1:
            ret_arr = np.array(daily_returns)
            sharpe = float((ret_arr.mean() / ret_arr.std()) * math.sqrt(365)) if ret_arr.std() > 0 else 0
        else:
            sharpe = 0

        # Profit factor
        gross_profit = sum(t.pnl for t in wins)
        gross_loss = abs(sum(t.pnl for t in losses))
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float("inf") if gross_profit > 0 else 0

        # Monthly returns
        monthly = {}
        for t in trades:
            month = t.entry_time.strftime("%Y-%m")
            monthly[month] = monthly.get(month, 0) + t.pnl

        total_return = final_capital - self.initial_capital

        return BacktestResult(
            symbol=symbol,
            timeframe=timeframe,
            period_start=str(df.index[0]),
            period_end=str(df.index[-1]),
            initial_capital=self.initial_capital,
            final_capital=final_capital,
            total_return=total_return,
            total_return_pct=(total_return / self.initial_capital) * 100,
            total_trades=len(trades),
            winning_trades=len(wins),
            losing_trades=len(losses),
            win_rate=len(wins) / len(trades) * 100 if trades else 0,
            avg_win=np.mean([t.pnl for t in wins]) if wins else 0,
            avg_loss=np.mean([t.pnl for t in losses]) if losses else 0,
            largest_win=max((t.pnl for t in wins), default=0),
            largest_loss=min((t.pnl for t in losses), default=0),
            max_drawdown=max_dd,
            max_drawdown_pct=max_dd_pct * 100,
            sharpe_ratio=sharpe,
            profit_factor=profit_factor,
            avg_trade_duration=0,  # Simplificado
            equity_curve=equity_curve[-500:],  # Últimas 500 velas
            trades=[
                {
                    "entry_time": str(t.entry_time),
                    "exit_time": str(t.exit_time),
                    "side": t.side,
                    "entry_price": t.entry_price,
                    "exit_price": t.exit_price,
                    "pnl": round(t.pnl, 2),
                    "pnl_pct": round(t.pnl_pct, 2),
                    "strategy": t.strategy,
                    "confidence": t.confidence,
                }
                for t in trades[-100:]  # Últimos 100 trades
            ],
            monthly_returns={k: round(v, 2) for k, v in monthly.items()},
        )


# Singleton
backtest_engine = BacktestEngine()
