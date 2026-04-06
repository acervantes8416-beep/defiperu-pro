"""
Estrategia: Breakout (Volumen + Soporte/Resistencia + Ichimoku)
Detecta rupturas de niveles clave con confirmación de volumen.
"""
import pandas as pd
from app.services.strategies.base import BaseStrategy, StrategySignal
from app.services.indicators.technical import TechnicalIndicators


class BreakoutStrategy(BaseStrategy):
    name = "breakout"
    description = "Detecta breakouts con confirmación de volumen y niveles S/R"

    def analyze(self, df: pd.DataFrame, indicators: dict) -> StrategySignal:
        atr_result = indicators["atr"]
        vol_result = indicators["volume"]
        ichimoku_result = indicators["ichimoku"]

        price = df["close"].iloc[-1]
        prev_price = df["close"].iloc[-2]
        atr_val = atr_result.values["atr"].iloc[-1]
        reasoning = []
        score = 0

        # ── Soporte/Resistencia ──
        sr = TechnicalIndicators.support_resistance(df)
        nearest_resistance = sr["nearest_resistance"]
        nearest_support = sr["nearest_support"]

        # Breakout alcista: precio rompe resistencia
        if price > nearest_resistance and prev_price <= nearest_resistance:
            score += 30
            reasoning.append(f"Breakout alcista sobre resistencia {nearest_resistance:.2f}")
        elif price > nearest_resistance:
            dist_pct = (price - nearest_resistance) / nearest_resistance * 100
            if dist_pct < 1.5:  # Dentro del 1.5% del breakout
                score += 20
                reasoning.append(f"Precio {dist_pct:.1f}% sobre resistencia reciente")

        # Breakout bajista: precio rompe soporte
        if price < nearest_support and prev_price >= nearest_support:
            score -= 30
            reasoning.append(f"Breakdown bajista bajo soporte {nearest_support:.2f}")
        elif price < nearest_support:
            dist_pct = (nearest_support - price) / nearest_support * 100
            if dist_pct < 1.5:
                score -= 20
                reasoning.append(f"Precio {dist_pct:.1f}% bajo soporte reciente")

        # ── Volumen (peso crítico para breakouts: 35%) ──
        vol_ratio = vol_result.values["volume_ratio"].iloc[-1]
        if vol_ratio > 2.5:
            vol_score = 35
            reasoning.append(f"Volumen excepcional ({vol_ratio:.1f}x promedio)")
        elif vol_ratio > 2.0:
            vol_score = 28
            reasoning.append(f"Volumen muy alto ({vol_ratio:.1f}x promedio)")
        elif vol_ratio > 1.5:
            vol_score = 20
            reasoning.append(f"Volumen elevado ({vol_ratio:.1f}x promedio)")
        elif vol_ratio > 1.2:
            vol_score = 10
            reasoning.append(f"Volumen ligeramente elevado ({vol_ratio:.1f}x)")
        else:
            vol_score = 0
            reasoning.append(f"Volumen insuficiente para breakout ({vol_ratio:.1f}x)")

        if score > 0:
            score += vol_score
        elif score < 0:
            score -= vol_score
        else:
            # Sin breakout de nivel, pero volumen alto con precio fuerte
            price_change = (price - prev_price) / prev_price * 100
            if vol_ratio > 2.0 and abs(price_change) > 1.0:
                if price_change > 0:
                    score += vol_score
                    reasoning.append(f"Movimiento alcista fuerte (+{price_change:.1f}%) con volumen")
                else:
                    score -= vol_score
                    reasoning.append(f"Movimiento bajista fuerte ({price_change:.1f}%) con volumen")

        # ── Ichimoku Cloud Breakout (peso: 25%) ──
        span_a = ichimoku_result.values["senkou_span_a"].iloc[-1]
        span_b = ichimoku_result.values["senkou_span_b"].iloc[-1]
        cloud_top = max(span_a, span_b) if not (pd.isna(span_a) or pd.isna(span_b)) else price
        cloud_bottom = min(span_a, span_b) if not (pd.isna(span_a) or pd.isna(span_b)) else price

        if price > cloud_top and prev_price <= cloud_top:
            score += 25
            reasoning.append("Breakout por encima del Ichimoku Cloud")
        elif price < cloud_bottom and prev_price >= cloud_bottom:
            score -= 25
            reasoning.append("Breakdown por debajo del Ichimoku Cloud")
        elif price > cloud_top:
            score += 10
            reasoning.append("Precio sobre Ichimoku Cloud")
        elif price < cloud_bottom:
            score -= 10
            reasoning.append("Precio bajo Ichimoku Cloud")

        # ── ATR expansion (peso: 10%) ──
        atr_pct = atr_result.values["atr_pct"].iloc[-1]
        atr_pct_prev = atr_result.values["atr_pct"].iloc[-5] if len(df) > 5 else atr_pct
        if atr_pct > atr_pct_prev * 1.3:
            add = 10 if score > 0 else -10 if score < 0 else 0
            score += add
            reasoning.append("Expansión de volatilidad (ATR creciente)")

        # ── Generar señal ──
        # Breakout necesita confirmación fuerte
        confidence = min(100, abs(score))

        if score >= 35:
            signal = "BUY"
        elif score <= -35:
            signal = "SELL"
        else:
            signal = "HOLD"
            confidence = max(10, 50 - abs(score))

        # Breakouts usan stops más ajustados y targets más agresivos
        sl, tp, rr = self._calc_stop_take(price, atr_val, signal, risk_mult=1.2, reward_mult=3.5)

        return StrategySignal(
            strategy_name=self.name,
            signal=signal,
            confidence=confidence,
            entry_price=price,
            stop_loss=sl,
            take_profit=tp,
            risk_reward=rr,
            reasoning=reasoning,
        )
