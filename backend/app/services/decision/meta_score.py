"""
Decision Engine: Combina todas las estrategias en un Meta Score unificado.
Este es el cerebro del sistema — toma la decisión final de trading.
"""
from dataclasses import dataclass, field
from loguru import logger
from app.services.strategies.base import StrategySignal


@dataclass
class TradingDecision:
    """Decisión final de trading con todos los parámetros necesarios."""
    symbol: str
    timeframe: str
    signal: str  # BUY, SELL, HOLD
    meta_score: float  # -100 a +100
    confidence: float  # 0-100 (probabilidad de éxito)
    entry_price: float
    stop_loss: float
    take_profit: float
    risk_reward_ratio: float
    position_size_pct: float  # % del portfolio a asignar
    strategy_signals: dict[str, dict] = field(default_factory=dict)
    reasoning: list[str] = field(default_factory=list)


# Pesos de cada estrategia en el meta score
STRATEGY_WEIGHTS = {
    "trend_following": 0.40,  # Mayor peso: tendencia es la más confiable
    "mean_reversion": 0.30,  # Reversión a la media
    "breakout": 0.30,        # Breakouts
}

# Pesos de timeframe para análisis multi-timeframe
TIMEFRAME_WEIGHTS = {
    "1m": 0.05,
    "5m": 0.10,
    "15m": 0.15,
    "1h": 0.25,
    "4h": 0.25,
    "1d": 0.20,
}


class DecisionEngine:
    """Motor de decisión que combina señales en un Meta Score."""

    def __init__(self, max_risk_per_trade: float = 0.02):
        self.max_risk = max_risk_per_trade

    def compute_meta_score(
        self,
        strategy_signals: dict[str, StrategySignal],
    ) -> float:
        """
        Calcula el Meta Score combinando todas las estrategias.
        Rango: -100 (venta fuerte) a +100 (compra fuerte).
        """
        weighted_score = 0.0
        total_weight = 0.0

        for name, signal in strategy_signals.items():
            weight = STRATEGY_WEIGHTS.get(name, 0.2)

            # Convertir señal a valor numérico
            if signal.signal == "BUY":
                direction = 1.0
            elif signal.signal == "SELL":
                direction = -1.0
            else:
                direction = 0.0

            # Score = dirección × confianza × peso
            weighted_score += direction * signal.confidence * weight
            total_weight += weight

        if total_weight > 0:
            return weighted_score / total_weight
        return 0.0

    def compute_confidence(
        self, strategy_signals: dict[str, StrategySignal], meta_score: float
    ) -> float:
        """
        Calcula la probabilidad de éxito basada en:
        1. Consenso entre estrategias (todas de acuerdo = más confianza)
        2. Fuerza individual de cada señal
        3. Magnitud del meta score
        """
        signals = [s.signal for s in strategy_signals.values()]
        buy_count = signals.count("BUY")
        sell_count = signals.count("SELL")
        total = len(signals)

        # Consenso: ratio de estrategias que están de acuerdo
        if meta_score > 0:
            consensus = buy_count / total
        elif meta_score < 0:
            consensus = sell_count / total
        else:
            consensus = 0.3

        # Confianza promedio de las señales que están de acuerdo
        agreeing = [
            s.confidence for s in strategy_signals.values()
            if (s.signal == "BUY" and meta_score > 0) or (s.signal == "SELL" and meta_score < 0)
        ]
        avg_confidence = sum(agreeing) / len(agreeing) if agreeing else 30

        # Combinar factores
        raw = (consensus * 0.4 + avg_confidence / 100 * 0.3 + abs(meta_score) / 100 * 0.3) * 100

        return min(95, max(5, raw))

    def compute_optimal_levels(
        self, strategy_signals: dict[str, StrategySignal], signal: str
    ) -> tuple[float, float, float, float]:
        """
        Calcula entry, SL, TP y R/R óptimos promediando las estrategias.
        """
        entries, sls, tps = [], [], []

        for s in strategy_signals.values():
            if s.signal == signal and s.confidence > 20:
                entries.append(s.entry_price)
                sls.append(s.stop_loss)
                tps.append(s.take_profit)

        if not entries:
            # Fallback: usar primera señal disponible
            first = next(iter(strategy_signals.values()))
            return first.entry_price, first.stop_loss, first.take_profit, first.risk_reward

        entry = sum(entries) / len(entries)
        sl = sum(sls) / len(sls)
        tp = sum(tps) / len(tps)

        risk = abs(entry - sl)
        reward = abs(tp - entry)
        rr = reward / risk if risk > 0 else 0

        return entry, sl, tp, rr

    def compute_position_size(
        self,
        portfolio_value: float,
        entry_price: float,
        stop_loss: float,
        confidence: float,
    ) -> float:
        """
        Calcula el tamaño de posición basado en:
        - Máximo riesgo por trade (default 2%)
        - Confianza de la señal (ajusta el riesgo)
        - Distancia al stop loss
        """
        risk_per_unit = abs(entry_price - stop_loss)
        if risk_per_unit == 0:
            return 0.01  # Mínimo

        # Ajustar riesgo por confianza: alta confianza → más cerca del max_risk
        confidence_factor = confidence / 100
        adjusted_risk = self.max_risk * (0.5 + 0.5 * confidence_factor)

        # Capital en riesgo
        risk_capital = portfolio_value * adjusted_risk

        # Cantidad de unidades
        position_value = risk_capital / (risk_per_unit / entry_price)

        # Limitar al 15% del portfolio
        max_position = portfolio_value * 0.15
        position_value = min(position_value, max_position)

        return position_value / portfolio_value  # Retornar como % del portfolio

    def decide(
        self,
        symbol: str,
        timeframe: str,
        strategy_signals: dict[str, StrategySignal],
        portfolio_value: float = 10000.0,
    ) -> TradingDecision:
        """
        Toma la decisión final de trading combinando todas las señales.
        """
        meta_score = self.compute_meta_score(strategy_signals)
        confidence = self.compute_confidence(strategy_signals, meta_score)

        # Determinar señal final
        if meta_score > 15 and confidence > 40:
            signal = "BUY"
        elif meta_score < -15 and confidence > 40:
            signal = "SELL"
        else:
            signal = "HOLD"

        # Calcular niveles
        entry, sl, tp, rr = self.compute_optimal_levels(strategy_signals, signal)

        # Position sizing
        position_pct = self.compute_position_size(portfolio_value, entry, sl, confidence)
        if signal == "HOLD":
            position_pct = 0.0

        # Compilar razonamiento
        reasoning = []
        for name, sig in strategy_signals.items():
            reasoning.append(f"[{name}] {sig.signal} (confianza: {sig.confidence:.0f}%)")
            reasoning.extend([f"  → {r}" for r in sig.reasoning[:3]])

        reasoning.append(f"\nMeta Score: {meta_score:.1f} | Confianza: {confidence:.1f}%")
        reasoning.append(f"Decisión: {signal} | R/R: {rr:.2f} | Posición: {position_pct*100:.1f}%")

        # Serializar señales para almacenamiento
        strategy_details = {
            name: {
                "signal": s.signal,
                "confidence": s.confidence,
                "entry": s.entry_price,
                "sl": s.stop_loss,
                "tp": s.take_profit,
                "rr": s.risk_reward,
                "reasoning": s.reasoning,
            }
            for name, s in strategy_signals.items()
        }

        return TradingDecision(
            symbol=symbol,
            timeframe=timeframe,
            signal=signal,
            meta_score=meta_score,
            confidence=confidence,
            entry_price=entry,
            stop_loss=sl,
            take_profit=tp,
            risk_reward_ratio=rr,
            position_size_pct=position_pct,
            strategy_signals=strategy_details,
            reasoning=reasoning,
        )

    def decide_multi_timeframe(
        self,
        symbol: str,
        decisions_by_tf: dict[str, TradingDecision],
    ) -> TradingDecision:
        """
        Combina decisiones de múltiples timeframes en una decisión final.
        Timeframes mayores tienen más peso.
        """
        weighted_meta = 0.0
        total_weight = 0.0
        all_reasoning = []

        for tf, decision in decisions_by_tf.items():
            weight = TIMEFRAME_WEIGHTS.get(tf, 0.1)
            weighted_meta += decision.meta_score * weight
            total_weight += weight
            all_reasoning.append(f"[{tf}] {decision.signal} (meta: {decision.meta_score:.1f})")

        if total_weight > 0:
            final_meta = weighted_meta / total_weight
        else:
            final_meta = 0

        # Usar la decisión del timeframe más relevante (1h o 4h) como base
        base_tf = "4h" if "4h" in decisions_by_tf else "1h" if "1h" in decisions_by_tf else next(iter(decisions_by_tf))
        base = decisions_by_tf[base_tf]

        if final_meta > 15:
            signal = "BUY"
        elif final_meta < -15:
            signal = "SELL"
        else:
            signal = "HOLD"

        confidence = self.compute_confidence(
            {k: type("S", (), {"signal": d.signal, "confidence": d.confidence})()
             for k, d in decisions_by_tf.items()},
            final_meta,
        )

        all_reasoning.append(f"\nMulti-TF Meta Score: {final_meta:.1f}")

        return TradingDecision(
            symbol=symbol,
            timeframe="multi",
            signal=signal,
            meta_score=final_meta,
            confidence=confidence,
            entry_price=base.entry_price,
            stop_loss=base.stop_loss,
            take_profit=base.take_profit,
            risk_reward_ratio=base.risk_reward_ratio,
            position_size_pct=base.position_size_pct if signal != "HOLD" else 0,
            strategy_signals=base.strategy_signals,
            reasoning=all_reasoning,
        )


# Singleton
decision_engine = DecisionEngine()
