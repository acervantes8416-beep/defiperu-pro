"""
Estrategia: Trend Following (EMA Cross + MACD)
Identifica y sigue tendencias fuertes usando la convergencia de señales de EMAs y MACD.
"""
import pandas as pd
from app.services.strategies.base import BaseStrategy, StrategySignal


class TrendFollowingStrategy(BaseStrategy):
    name = "trend_following"
    description = "Sigue tendencias usando EMA crossover + confirmación MACD"

    def analyze(self, df: pd.DataFrame, indicators: dict) -> StrategySignal:
        ema_result = indicators["emas"]
        macd_result = indicators["macd"]
        atr_result = indicators["atr"]
        vol_result = indicators["volume"]

        price = df["close"].iloc[-1]
        atr_val = atr_result.values["atr"].iloc[-1]
        reasoning = []
        score = 0

        # ── EMA Alignment (peso: 35%) ──
        ema_20 = ema_result.values["ema_20"].iloc[-1]
        ema_50 = ema_result.values["ema_50"].iloc[-1]
        ema_200 = ema_result.values["ema_200"].iloc[-1]

        if price > ema_20 > ema_50 > ema_200:
            score += 35
            reasoning.append("Alineación EMA alcista perfecta (20>50>200)")
        elif ema_20 > ema_50 > ema_200:
            score += 25
            reasoning.append("EMAs en alineación alcista")
        elif price < ema_20 < ema_50 < ema_200:
            score -= 35
            reasoning.append("Alineación EMA bajista perfecta")
        elif ema_20 < ema_50 < ema_200:
            score -= 25
            reasoning.append("EMAs en alineación bajista")
        else:
            reasoning.append("EMAs sin alineación clara")

        # ── EMA Cross reciente (peso: 15%) ──
        ema_20_prev = ema_result.values["ema_20"].iloc[-2]
        ema_50_prev = ema_result.values["ema_50"].iloc[-2]
        if ema_20_prev <= ema_50_prev and ema_20 > ema_50:
            score += 15
            reasoning.append("Golden cross EMA20/50 reciente")
        elif ema_20_prev >= ema_50_prev and ema_20 < ema_50:
            score -= 15
            reasoning.append("Death cross EMA20/50 reciente")

        # ── MACD Confirmation (peso: 30%) ──
        macd_line = macd_result.values["macd"].iloc[-1]
        signal_line = macd_result.values["signal"].iloc[-1]
        histogram = macd_result.values["histogram"].iloc[-1]
        hist_prev = macd_result.values["histogram"].iloc[-2]

        if macd_line > signal_line and histogram > 0:
            score += 20
            reasoning.append("MACD bullish: línea MACD sobre signal")
            if histogram > hist_prev:
                score += 10
                reasoning.append("Histograma MACD creciente (momentum alcista)")
        elif macd_line < signal_line and histogram < 0:
            score -= 20
            reasoning.append("MACD bearish: línea MACD bajo signal")
            if histogram < hist_prev:
                score -= 10
                reasoning.append("Histograma MACD decreciente (momentum bajista)")

        # ── Volume Confirmation (peso: 20%) ──
        vol_ratio = vol_result.values["volume_ratio"].iloc[-1]
        if vol_ratio > 1.5:
            # Volumen confirma dirección
            if score > 0:
                score += 20
                reasoning.append(f"Volumen alto ({vol_ratio:.1f}x) confirma tendencia alcista")
            elif score < 0:
                score -= 20
                reasoning.append(f"Volumen alto ({vol_ratio:.1f}x) confirma tendencia bajista")
        elif vol_ratio < 0.7:
            score = int(score * 0.7)  # Reducir confianza por bajo volumen
            reasoning.append("Volumen bajo: señal debilitada")

        # ── Generar señal ──
        confidence = min(100, abs(score))
        if score >= 30:
            signal = "BUY"
        elif score <= -30:
            signal = "SELL"
        else:
            signal = "HOLD"
            confidence = max(10, 50 - abs(score))

        sl, tp, rr = self._calc_stop_take(price, atr_val, signal, risk_mult=1.5, reward_mult=3.0)

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
