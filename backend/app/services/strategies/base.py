"""Base abstracta para todas las estrategias de trading."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import pandas as pd


@dataclass
class StrategySignal:
    """Señal generada por una estrategia."""
    strategy_name: str
    signal: str  # BUY, SELL, HOLD
    confidence: float  # 0-100
    entry_price: float = 0.0
    stop_loss: float = 0.0
    take_profit: float = 0.0
    risk_reward: float = 0.0
    reasoning: list[str] = field(default_factory=list)


class BaseStrategy(ABC):
    """Clase base para estrategias de trading."""

    name: str = "base"
    description: str = ""

    @abstractmethod
    def analyze(self, df: pd.DataFrame, indicators: dict) -> StrategySignal:
        """Analiza datos y genera señal."""
        ...

    def _calc_stop_take(
        self, price: float, atr: float, signal: str, risk_mult: float = 1.5, reward_mult: float = 3.0
    ) -> tuple[float, float, float]:
        """Calcula SL, TP y R/R basado en ATR."""
        if signal == "BUY":
            sl = price - (atr * risk_mult)
            tp = price + (atr * reward_mult)
        elif signal == "SELL":
            sl = price + (atr * risk_mult)
            tp = price - (atr * reward_mult)
        else:
            return price * 0.98, price * 1.02, 1.0

        risk = abs(price - sl)
        reward = abs(tp - price)
        rr = reward / risk if risk > 0 else 0
        return sl, tp, rr
