"""
Portfolio Manager: Distribución de capital, diversificación y rebalanceo.
Solo operaciones SPOT — sin futuros ni apalancamiento.
"""
import math
from datetime import datetime, timezone
from dataclasses import dataclass, field
from loguru import logger


@dataclass
class AllocationTarget:
    """Objetivo de asignación para un activo."""
    symbol: str
    target_pct: float  # % del portfolio
    current_pct: float
    action: str  # "increase", "decrease", "hold"
    delta_pct: float  # diferencia


@dataclass
class PortfolioState:
    """Estado actual del portfolio."""
    total_value: float
    cash: float
    positions: dict  # symbol -> {value, pct, pnl}
    pnl_total: float
    pnl_pct: float
    max_drawdown: float
    sharpe_ratio: float
    allocations: list[AllocationTarget] = field(default_factory=list)


# Distribución target por categoría de activo
ASSET_CATEGORIES = {
    "major": {
        "symbols": ["BTC/USDT", "ETH/USDT"],
        "max_allocation": 0.50,  # Máximo 50% en majors
        "per_asset_max": 0.30,   # Máximo 30% por asset
    },
    "large_cap": {
        "symbols": ["SOL/USDT", "BNB/USDT", "XRP/USDT"],
        "max_allocation": 0.30,
        "per_asset_max": 0.15,
    },
    "mid_cap": {
        "symbols": ["ADA/USDT", "AVAX/USDT", "DOT/USDT", "MATIC/USDT", "LINK/USDT"],
        "max_allocation": 0.20,
        "per_asset_max": 0.08,
    },
}


class PortfolioManager:
    """Gestiona la distribución de capital y rebalanceo del portfolio."""

    def __init__(self, initial_capital: float = 10000.0, max_risk_per_trade: float = 0.02):
        self.initial_capital = initial_capital
        self.max_risk = max_risk_per_trade
        self._peak_value = initial_capital
        self._returns: list[float] = []

    def compute_allocation_targets(
        self,
        current_positions: dict[str, float],  # symbol -> current_value
        decisions: dict[str, dict],  # symbol -> TradingDecision as dict
        total_value: float,
    ) -> list[AllocationTarget]:
        """
        Calcula la asignación óptima basada en señales y diversificación.
        """
        targets = []

        for category in ASSET_CATEGORIES.values():
            for symbol in category["symbols"]:
                decision = decisions.get(symbol, {})
                signal = decision.get("signal", "HOLD")
                confidence = decision.get("confidence", 0)
                position_pct = decision.get("position_size_pct", 0)

                current_value = current_positions.get(symbol, 0)
                current_pct = current_value / total_value if total_value > 0 else 0

                # Target basado en señal
                if signal == "BUY":
                    target_pct = min(position_pct, category["per_asset_max"])
                    # Ajustar por confianza
                    target_pct *= (confidence / 100)
                elif signal == "SELL":
                    target_pct = 0.0
                else:
                    target_pct = current_pct * 0.9  # Reducir lentamente posiciones sin señal

                # Limitar al máximo por categoría
                target_pct = min(target_pct, category["per_asset_max"])

                delta = target_pct - current_pct
                if abs(delta) < 0.005:  # Ignorar cambios < 0.5%
                    action = "hold"
                elif delta > 0:
                    action = "increase"
                else:
                    action = "decrease"

                targets.append(AllocationTarget(
                    symbol=symbol,
                    target_pct=target_pct,
                    current_pct=current_pct,
                    action=action,
                    delta_pct=delta,
                ))

        # Verificar que la asignación total no exceda 100%
        total_target = sum(t.target_pct for t in targets)
        if total_target > 0.95:
            scale = 0.95 / total_target
            for t in targets:
                t.target_pct *= scale
                t.delta_pct = t.target_pct - t.current_pct

        return targets

    def compute_drawdown(self, current_value: float) -> float:
        """Calcula el max drawdown actual."""
        if current_value > self._peak_value:
            self._peak_value = current_value
        if self._peak_value == 0:
            return 0
        return (self._peak_value - current_value) / self._peak_value

    def compute_sharpe_ratio(self, risk_free_rate: float = 0.02) -> float:
        """Calcula el Sharpe Ratio anualizado."""
        if len(self._returns) < 2:
            return 0.0

        import numpy as np
        returns = np.array(self._returns)
        excess = returns - (risk_free_rate / 365)
        if returns.std() == 0:
            return 0.0
        return float((excess.mean() / returns.std()) * math.sqrt(365))

    def add_daily_return(self, daily_return: float):
        """Registra un retorno diario para cálculos de Sharpe."""
        self._returns.append(daily_return)
        if len(self._returns) > 365:
            self._returns = self._returns[-365:]

    def should_rebalance(self, last_rebalance: datetime, interval_hours: int = 168) -> bool:
        """Determina si es momento de rebalancear (default: semanal)."""
        now = datetime.now(timezone.utc)
        delta = now - last_rebalance
        return delta.total_seconds() / 3600 >= interval_hours

    def validate_trade(
        self,
        portfolio_value: float,
        entry_price: float,
        stop_loss: float,
        quantity: float,
    ) -> tuple[bool, str]:
        """Valida que un trade respete los límites de riesgo."""
        risk_per_unit = abs(entry_price - stop_loss)
        total_risk = risk_per_unit * quantity
        risk_pct = total_risk / portfolio_value if portfolio_value > 0 else 1

        if risk_pct > self.max_risk:
            return False, f"Riesgo ({risk_pct:.1%}) excede máximo ({self.max_risk:.1%})"

        position_value = entry_price * quantity
        if position_value > portfolio_value * 0.15:
            return False, f"Posición ({position_value:.0f}) excede 15% del portfolio"

        return True, "Trade válido"


# Singleton
portfolio_manager = PortfolioManager()
