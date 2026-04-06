"""
Estrategia: Mean Reversion (RSI + Bollinger Bands)
Identifica condiciones de sobrecompra/sobreventa para reversión a la media.
"""
import pandas as pd
from app.services.strategies.base import BaseStrategy, StrategySignal


class MeanReversionStrategy(BaseStrategy):
    name = "mean_reversion"
    description = "Reversión a la media usando RSI extremos + Bollinger Bands"

    def analyze(self, df: pd.DataFrame, indicators: dict) -> StrategySignal:
        rsi_result = indicators["rsi"]
        bb_result = indicators["bollinger"]
        atr_result = indicators["atr"]
        vol_result = indicators["volume"]

        price = df["close"].iloc[-1]
        atr_val = atr_result.values["atr"].iloc[-1]
        reasoning = []
        score = 0

        # ── RSI extremo (peso: 40%) ──
        rsi = rsi_result.values["rsi"].iloc[-1]
        rsi_prev = rsi_result.values["rsi"].iloc[-2] if len(rsi_result.values["rsi"]) > 1 else 50

        if rsi < 25:
            score += 40
            reasoning.append(f"RSI extremadamente sobrevendido ({rsi:.1f})")
        elif rsi < 30:
            score += 30
            reasoning.append(f"RSI sobrevendido ({rsi:.1f})")
        elif rsi < 35 and rsi > rsi_prev:
            score += 15
            reasoning.append(f"RSI recuperándose desde sobreventa ({rsi:.1f})")
        elif rsi > 75:
            score -= 40
            reasoning.append(f"RSI extremadamente sobrecomprado ({rsi:.1f})")
        elif rsi > 70:
            score -= 30
            reasoning.append(f"RSI sobrecomprado ({rsi:.1f})")
        elif rsi > 65 and rsi < rsi_prev:
            score -= 15
            reasoning.append(f"RSI cayendo desde sobrecompra ({rsi:.1f})")
        else:
            reasoning.append(f"RSI neutral ({rsi:.1f})")

        # ── Divergencia RSI (peso extra: 15%) ──
        if len(df) > 14:
            price_higher = df["close"].iloc[-1] > df["close"].iloc[-14]
            rsi_lower = rsi < rsi_result.values["rsi"].iloc[-14]
            price_lower = df["close"].iloc[-1] < df["close"].iloc[-14]
            rsi_higher = rsi > rsi_result.values["rsi"].iloc[-14]

            if price_higher and rsi_lower:
                score -= 15
                reasoning.append("Divergencia bajista RSI (precio sube, RSI baja)")
            elif price_lower and rsi_higher:
                score += 15
                reasoning.append("Divergencia alcista RSI (precio baja, RSI sube)")

        # ── Bollinger Bands (peso: 35%) ──
        upper = bb_result.values["upper"].iloc[-1]
        lower = bb_result.values["lower"].iloc[-1]
        middle = bb_result.values["middle"].iloc[-1]
        band_range = upper - lower

        if band_range > 0:
            pct_b = (price - lower) / band_range
        else:
            pct_b = 0.5

        if pct_b < 0.05:
            score += 35
            reasoning.append(f"Precio en/bajo banda inferior Bollinger (%B: {pct_b:.2f})")
        elif pct_b < 0.15:
            score += 25
            reasoning.append(f"Precio cerca de banda inferior (%B: {pct_b:.2f})")
        elif pct_b > 0.95:
            score -= 35
            reasoning.append(f"Precio en/sobre banda superior Bollinger (%B: {pct_b:.2f})")
        elif pct_b > 0.85:
            score -= 25
            reasoning.append(f"Precio cerca de banda superior (%B: {pct_b:.2f})")
        else:
            reasoning.append(f"Precio dentro de Bollinger Bands (%B: {pct_b:.2f})")

        # ── Squeeze detection (banda estrecha → expansión inminente) ──
        bandwidth = bb_result.values["bandwidth"].iloc[-1]
        avg_bandwidth = bb_result.values["bandwidth"].rolling(50).mean().iloc[-1] if len(df) > 50 else bandwidth
        if bandwidth < avg_bandwidth * 0.5:
            score = int(score * 0.6)  # Squeeze: reducir confianza en mean reversion
            reasoning.append("Bollinger Squeeze detectado: posible breakout, no mean reversion")

        # ── Volume decay confirma reversión (peso: 10%) ──
        vol_ratio = vol_result.values["volume_ratio"].iloc[-1]
        if vol_ratio < 0.8 and abs(score) > 20:
            add = 10 if score > 0 else -10
            score += add
            reasoning.append("Volumen decreciente confirma agotamiento del movimiento")

        # ── Generar señal ──
        confidence = min(100, abs(score))
        if score >= 25:
            signal = "BUY"
        elif score <= -25:
            signal = "SELL"
        else:
            signal = "HOLD"
            confidence = max(10, 50 - abs(score))

        # Mean reversion usa targets más conservadores
        sl, tp, rr = self._calc_stop_take(price, atr_val, signal, risk_mult=1.0, reward_mult=2.0)

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
