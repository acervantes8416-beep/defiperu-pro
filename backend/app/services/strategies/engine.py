"""
Strategy Engine: Orquesta todas las estrategias y genera señales unificadas.
"""
import pandas as pd
from loguru import logger
from app.services.indicators.technical import TechnicalIndicators
from app.services.strategies.base import StrategySignal
from app.services.strategies.trend_following import TrendFollowingStrategy
from app.services.strategies.mean_reversion import MeanReversionStrategy
from app.services.strategies.breakout import BreakoutStrategy


class StrategyEngine:
    """Motor que ejecuta todas las estrategias sobre datos de mercado."""

    def __init__(self):
        self.strategies = [
            TrendFollowingStrategy(),
            MeanReversionStrategy(),
            BreakoutStrategy(),
        ]

    def analyze_symbol(self, df: pd.DataFrame) -> dict[str, StrategySignal]:
        """Ejecuta todas las estrategias para un símbolo y timeframe."""
        if len(df) < 200:
            logger.warning(f"Datos insuficientes ({len(df)} velas), se requieren ≥200")

        # Calcular indicadores una vez
        indicators = TechnicalIndicators.compute_all(df)

        # Ejecutar cada estrategia
        results = {}
        for strategy in self.strategies:
            try:
                results[strategy.name] = strategy.analyze(df, indicators)
            except Exception as e:
                logger.error(f"Error en estrategia {strategy.name}: {e}")
                results[strategy.name] = StrategySignal(
                    strategy_name=strategy.name,
                    signal="HOLD",
                    confidence=0,
                    reasoning=[f"Error: {str(e)}"],
                )

        return results

    def get_indicators(self, df: pd.DataFrame) -> dict:
        """Retorna los indicadores calculados (para visualización)."""
        return TechnicalIndicators.compute_all(df)


# Singleton
strategy_engine = StrategyEngine()
