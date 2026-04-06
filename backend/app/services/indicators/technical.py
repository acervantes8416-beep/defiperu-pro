"""
Motor de indicadores técnicos optimizados con numpy/pandas.
Todos los indicadores trabajan sobre DataFrames OHLCV.
"""
import numpy as np
import pandas as pd
from dataclasses import dataclass


@dataclass
class IndicatorResult:
    """Resultado estandarizado de un indicador."""
    name: str
    values: dict[str, pd.Series]
    signal: str  # BUY, SELL, HOLD
    strength: float  # 0-100


class TechnicalIndicators:
    """Colección de indicadores técnicos optimizados."""

    # ── RSI (Relative Strength Index) ──────────────────────────────

    @staticmethod
    def rsi(df: pd.DataFrame, period: int = 14) -> IndicatorResult:
        """
        RSI: Mide momentum. >70 sobrecompra, <30 sobreventa.
        Usa método Wilder (EMA) para suavizado.
        """
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0.0)
        loss = -delta.where(delta < 0, 0.0)

        avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
        avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()

        rs = avg_gain / avg_loss.replace(0, np.inf)
        rsi = 100 - (100 / (1 + rs))
        rsi = rsi.fillna(50)

        current = rsi.iloc[-1]
        if current < 30:
            signal, strength = "BUY", min(100, (30 - current) * 3.33)
        elif current > 70:
            signal, strength = "SELL", min(100, (current - 70) * 3.33)
        else:
            signal, strength = "HOLD", 50 - abs(50 - current)

        return IndicatorResult(name="RSI", values={"rsi": rsi}, signal=signal, strength=strength)

    # ── MACD (Moving Average Convergence Divergence) ───────────────

    @staticmethod
    def macd(
        df: pd.DataFrame, fast: int = 12, slow: int = 26, signal_period: int = 9
    ) -> IndicatorResult:
        """
        MACD: Detecta cambios de tendencia.
        Señal BUY cuando MACD cruza por encima de la línea signal.
        """
        ema_fast = df["close"].ewm(span=fast, adjust=False).mean()
        ema_slow = df["close"].ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
        histogram = macd_line - signal_line

        # Detección de cruce
        prev_hist = histogram.iloc[-2] if len(histogram) > 1 else 0
        curr_hist = histogram.iloc[-1]

        if curr_hist > 0 and prev_hist <= 0:
            signal, strength = "BUY", min(100, abs(curr_hist) / df["close"].iloc[-1] * 10000)
        elif curr_hist < 0 and prev_hist >= 0:
            signal, strength = "SELL", min(100, abs(curr_hist) / df["close"].iloc[-1] * 10000)
        elif curr_hist > 0:
            signal, strength = "BUY", min(70, abs(curr_hist) / df["close"].iloc[-1] * 5000)
        elif curr_hist < 0:
            signal, strength = "SELL", min(70, abs(curr_hist) / df["close"].iloc[-1] * 5000)
        else:
            signal, strength = "HOLD", 0

        return IndicatorResult(
            name="MACD",
            values={"macd": macd_line, "signal": signal_line, "histogram": histogram},
            signal=signal,
            strength=strength,
        )

    # ── Bollinger Bands ────────────────────────────────────────────

    @staticmethod
    def bollinger_bands(
        df: pd.DataFrame, period: int = 20, std_dev: float = 2.0
    ) -> IndicatorResult:
        """
        Bollinger Bands: Mide volatilidad y reversión a la media.
        Precio cerca de banda inferior = potencial compra.
        """
        sma = df["close"].rolling(window=period).mean()
        std = df["close"].rolling(window=period).std()
        upper = sma + (std * std_dev)
        lower = sma - (std * std_dev)
        bandwidth = (upper - lower) / sma * 100

        price = df["close"].iloc[-1]
        upper_val = upper.iloc[-1]
        lower_val = lower.iloc[-1]
        mid_val = sma.iloc[-1]
        band_range = upper_val - lower_val

        if band_range == 0:
            pct_b = 0.5
        else:
            pct_b = (price - lower_val) / band_range

        if pct_b < 0.1:
            signal, strength = "BUY", min(100, (0.1 - pct_b) * 500 + 60)
        elif pct_b > 0.9:
            signal, strength = "SELL", min(100, (pct_b - 0.9) * 500 + 60)
        elif pct_b < 0.3:
            signal, strength = "BUY", 40
        elif pct_b > 0.7:
            signal, strength = "SELL", 40
        else:
            signal, strength = "HOLD", 20

        return IndicatorResult(
            name="BollingerBands",
            values={
                "upper": upper, "middle": sma, "lower": lower,
                "bandwidth": bandwidth, "pct_b": pd.Series([pct_b], index=[df.index[-1]]),
            },
            signal=signal,
            strength=strength,
        )

    # ── EMAs (Exponential Moving Averages) ─────────────────────────

    @staticmethod
    def emas(df: pd.DataFrame, periods: list[int] | None = None) -> IndicatorResult:
        """
        EMAs múltiples (20, 50, 200): Determinan tendencia.
        Alineación alcista: EMA20 > EMA50 > EMA200.
        """
        periods = periods or [20, 50, 200]
        ema_values = {}
        for p in periods:
            ema_values[f"ema_{p}"] = df["close"].ewm(span=p, adjust=False).mean()

        price = df["close"].iloc[-1]
        ema_20 = ema_values["ema_20"].iloc[-1]
        ema_50 = ema_values["ema_50"].iloc[-1]
        ema_200 = ema_values["ema_200"].iloc[-1]

        # Alineación de tendencia
        bullish_alignment = ema_20 > ema_50 > ema_200
        bearish_alignment = ema_20 < ema_50 < ema_200
        price_above_all = price > ema_20 > ema_50 > ema_200
        price_below_all = price < ema_20 < ema_50 < ema_200

        if price_above_all:
            signal, strength = "BUY", 85
        elif bullish_alignment:
            signal, strength = "BUY", 65
        elif price_below_all:
            signal, strength = "SELL", 85
        elif bearish_alignment:
            signal, strength = "SELL", 65
        else:
            # Proximidad del precio a las EMAs indica fuerza neutral
            dist_20 = abs(price - ema_20) / price * 100
            signal, strength = "HOLD", max(10, 50 - dist_20 * 5)

        return IndicatorResult(name="EMAs", values=ema_values, signal=signal, strength=strength)

    # ── ATR (Average True Range) ───────────────────────────────────

    @staticmethod
    def atr(df: pd.DataFrame, period: int = 14) -> IndicatorResult:
        """
        ATR: Mide volatilidad. Usado para calcular stop loss y position sizing.
        No genera señal directamente, pero informa sobre el riesgo.
        """
        high_low = df["high"] - df["low"]
        high_close = (df["high"] - df["close"].shift()).abs()
        low_close = (df["low"] - df["close"].shift()).abs()
        true_range = pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)
        atr_val = true_range.ewm(alpha=1 / period, min_periods=period).mean()

        # ATR relativo al precio (porcentaje)
        atr_pct = atr_val / df["close"] * 100

        current_atr_pct = atr_pct.iloc[-1]
        avg_atr_pct = atr_pct.rolling(50).mean().iloc[-1] if len(atr_pct) > 50 else atr_pct.mean()

        # Volatilidad alta = precaución, volatilidad baja = posible breakout
        if current_atr_pct > avg_atr_pct * 1.5:
            signal, strength = "HOLD", 30  # Alta volatilidad, cautela
        elif current_atr_pct < avg_atr_pct * 0.5:
            signal, strength = "HOLD", 70  # Baja volatilidad, breakout inminente
        else:
            signal, strength = "HOLD", 50

        return IndicatorResult(
            name="ATR",
            values={"atr": atr_val, "atr_pct": atr_pct},
            signal=signal,
            strength=strength,
        )

    # ── Ichimoku Cloud ─────────────────────────────────────────────

    @staticmethod
    def ichimoku(
        df: pd.DataFrame,
        tenkan: int = 9,
        kijun: int = 26,
        senkou_b: int = 52,
    ) -> IndicatorResult:
        """
        Ichimoku Kinko Hyo: Sistema completo de tendencia.
        - Tenkan-sen (conversión): (max9 + min9) / 2
        - Kijun-sen (base): (max26 + min26) / 2
        - Senkou Span A: (tenkan + kijun) / 2, desplazado 26
        - Senkou Span B: (max52 + min52) / 2, desplazado 26
        - Chikou Span: precio actual desplazado -26
        """
        high_tenkan = df["high"].rolling(tenkan).max()
        low_tenkan = df["low"].rolling(tenkan).min()
        tenkan_sen = (high_tenkan + low_tenkan) / 2

        high_kijun = df["high"].rolling(kijun).max()
        low_kijun = df["low"].rolling(kijun).min()
        kijun_sen = (high_kijun + low_kijun) / 2

        senkou_span_a = ((tenkan_sen + kijun_sen) / 2).shift(kijun)

        high_senkou = df["high"].rolling(senkou_b).max()
        low_senkou = df["low"].rolling(senkou_b).min()
        senkou_span_b_line = ((high_senkou + low_senkou) / 2).shift(kijun)

        chikou_span = df["close"].shift(-kijun)

        price = df["close"].iloc[-1]
        span_a = senkou_span_a.iloc[-1] if not np.isnan(senkou_span_a.iloc[-1]) else price
        span_b = senkou_span_b_line.iloc[-1] if not np.isnan(senkou_span_b_line.iloc[-1]) else price
        cloud_top = max(span_a, span_b)
        cloud_bottom = min(span_a, span_b)

        t_sen = tenkan_sen.iloc[-1]
        k_sen = kijun_sen.iloc[-1]

        # Señales Ichimoku
        score = 0
        # Precio por encima del cloud
        if price > cloud_top:
            score += 30
        elif price < cloud_bottom:
            score -= 30
        # Tenkan por encima de Kijun
        if t_sen > k_sen:
            score += 25
        elif t_sen < k_sen:
            score -= 25
        # Cloud verde (Span A > Span B)
        if span_a > span_b:
            score += 20
        elif span_a < span_b:
            score -= 20
        # Precio por encima de Kijun
        if price > k_sen:
            score += 15
        elif price < k_sen:
            score -= 15

        if score > 30:
            signal, strength = "BUY", min(100, score + 10)
        elif score < -30:
            signal, strength = "SELL", min(100, abs(score) + 10)
        else:
            signal, strength = "HOLD", max(10, 50 - abs(score))

        return IndicatorResult(
            name="Ichimoku",
            values={
                "tenkan_sen": tenkan_sen,
                "kijun_sen": kijun_sen,
                "senkou_span_a": senkou_span_a,
                "senkou_span_b": senkou_span_b_line,
                "chikou_span": chikou_span,
            },
            signal=signal,
            strength=strength,
        )

    # ── Volume Analysis ────────────────────────────────────────────

    @staticmethod
    def volume_analysis(df: pd.DataFrame, period: int = 20) -> IndicatorResult:
        """Análisis de volumen: detecta picos y tendencias de volumen."""
        vol = df["volume"]
        vol_sma = vol.rolling(period).mean()
        vol_ratio = vol / vol_sma

        current_ratio = vol_ratio.iloc[-1]
        price_change = df["close"].pct_change().iloc[-1]

        if current_ratio > 2.0 and price_change > 0:
            signal, strength = "BUY", min(100, current_ratio * 30)
        elif current_ratio > 2.0 and price_change < 0:
            signal, strength = "SELL", min(100, current_ratio * 30)
        elif current_ratio > 1.5 and price_change > 0:
            signal, strength = "BUY", 50
        elif current_ratio > 1.5 and price_change < 0:
            signal, strength = "SELL", 50
        else:
            signal, strength = "HOLD", 20

        return IndicatorResult(
            name="Volume",
            values={"volume_sma": vol_sma, "volume_ratio": vol_ratio},
            signal=signal,
            strength=strength,
        )

    # ── Soporte / Resistencia ──────────────────────────────────────

    @staticmethod
    def support_resistance(df: pd.DataFrame, window: int = 20) -> dict:
        """Calcula niveles de soporte y resistencia usando pivots."""
        highs = df["high"].rolling(window, center=True).max()
        lows = df["low"].rolling(window, center=True).min()

        # Encontrar pivots
        resistance_levels = []
        support_levels = []
        price = df["close"].iloc[-1]

        for i in range(window, len(df) - window):
            if df["high"].iloc[i] == highs.iloc[i]:
                resistance_levels.append(df["high"].iloc[i])
            if df["low"].iloc[i] == lows.iloc[i]:
                support_levels.append(df["low"].iloc[i])

        # Filtrar niveles cercanos al precio actual (±10%)
        resistance = sorted(set(r for r in resistance_levels if r > price and r < price * 1.1))[:3]
        support = sorted(set(s for s in support_levels if s < price and s > price * 0.9), reverse=True)[:3]

        return {
            "resistance": resistance,
            "support": support,
            "nearest_resistance": resistance[0] if resistance else price * 1.05,
            "nearest_support": support[0] if support else price * 0.95,
        }

    # ── Ejecutar todos los indicadores ─────────────────────────────

    @classmethod
    def compute_all(cls, df: pd.DataFrame) -> dict[str, IndicatorResult]:
        """Ejecuta todos los indicadores sobre un DataFrame OHLCV."""
        return {
            "rsi": cls.rsi(df),
            "macd": cls.macd(df),
            "bollinger": cls.bollinger_bands(df),
            "emas": cls.emas(df),
            "atr": cls.atr(df),
            "ichimoku": cls.ichimoku(df),
            "volume": cls.volume_analysis(df),
        }
