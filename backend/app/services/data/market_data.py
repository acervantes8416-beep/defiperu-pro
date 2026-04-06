"""
Data Engine: Integración con exchanges para datos de mercado en tiempo real.
Usa ccxt para abstracción multi-exchange y WebSocket para streaming.
"""
import asyncio
from datetime import datetime, timezone
from typing import Callable
import ccxt.async_support as ccxt
import numpy as np
import pandas as pd
from loguru import logger
from app.core.config import get_settings

settings = get_settings()


class MarketDataEngine:
    """Motor de datos de mercado con soporte multi-timeframe y streaming."""

    def __init__(self):
        self._exchange: ccxt.Exchange | None = None
        self._cache: dict[str, pd.DataFrame] = {}
        self._subscribers: dict[str, list[Callable]] = {}
        self._running = False

    async def initialize(self, api_key: str = "", api_secret: str = ""):
        """Inicializa conexión con el exchange."""
        self._exchange = ccxt.binance({
            "apiKey": api_key or settings.binance_api_key,
            "secret": api_secret or settings.binance_api_secret,
            "enableRateLimit": True,
            "options": {"defaultType": "spot"},
        })
        logger.info("MarketDataEngine inicializado con Binance")

    async def close(self):
        """Cierra conexión con el exchange."""
        self._running = False
        if self._exchange:
            await self._exchange.close()

    async def fetch_ohlcv(
        self, symbol: str, timeframe: str = "1h", limit: int = 500
    ) -> pd.DataFrame:
        """
        Obtiene datos OHLCV históricos.
        Returns: DataFrame con columnas [timestamp, open, high, low, close, volume]
        """
        cache_key = f"{symbol}:{timeframe}"

        try:
            raw = await self._exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            df = pd.DataFrame(raw, columns=["timestamp", "open", "high", "low", "close", "volume"])
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
            df.set_index("timestamp", inplace=True)
            df = df.astype(float)
            self._cache[cache_key] = df
            return df
        except Exception as e:
            logger.error(f"Error fetching OHLCV {symbol} {timeframe}: {e}")
            if cache_key in self._cache:
                return self._cache[cache_key]
            raise

    async def fetch_ticker(self, symbol: str) -> dict:
        """Obtiene precio actual y datos del ticker."""
        try:
            ticker = await self._exchange.fetch_ticker(symbol)
            return {
                "symbol": symbol,
                "last": ticker["last"],
                "bid": ticker["bid"],
                "ask": ticker["ask"],
                "high": ticker["high"],
                "low": ticker["low"],
                "volume": ticker["baseVolume"],
                "change_24h": ticker["percentage"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Error fetching ticker {symbol}: {e}")
            raise

    async def fetch_order_book(self, symbol: str, limit: int = 20) -> dict:
        """Obtiene libro de órdenes para análisis de profundidad."""
        try:
            book = await self._exchange.fetch_order_book(symbol, limit)
            return {
                "symbol": symbol,
                "bids": book["bids"][:limit],
                "asks": book["asks"][:limit],
                "spread": book["asks"][0][0] - book["bids"][0][0] if book["asks"] and book["bids"] else 0,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Error fetching order book {symbol}: {e}")
            raise

    async def fetch_multi_timeframe(self, symbol: str) -> dict[str, pd.DataFrame]:
        """Obtiene datos para todos los timeframes soportados en paralelo."""
        tasks = {
            tf: self.fetch_ohlcv(symbol, tf)
            for tf in settings.supported_timeframes
        }
        results = {}
        for tf, task in tasks.items():
            try:
                results[tf] = await task
            except Exception as e:
                logger.warning(f"Failed to fetch {symbol} {tf}: {e}")
        return results

    async def fetch_all_tickers(self) -> dict[str, dict]:
        """Obtiene tickers de todos los símbolos soportados."""
        tasks = [self.fetch_ticker(s) for s in settings.supported_symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        tickers = {}
        for symbol, result in zip(settings.supported_symbols, results):
            if not isinstance(result, Exception):
                tickers[symbol] = result
        return tickers

    def subscribe(self, event: str, callback: Callable):
        """Suscribe un callback a un evento de datos."""
        if event not in self._subscribers:
            self._subscribers[event] = []
        self._subscribers[event].append(callback)

    async def _notify(self, event: str, data: dict):
        """Notifica a los suscriptores de un evento."""
        for callback in self._subscribers.get(event, []):
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(data)
                else:
                    callback(data)
            except Exception as e:
                logger.error(f"Error in subscriber callback: {e}")

    async def start_price_stream(self, symbols: list[str] | None = None):
        """Inicia streaming de precios con polling (fallback para exchanges sin WS nativo)."""
        symbols = symbols or settings.supported_symbols
        self._running = True
        logger.info(f"Iniciando price stream para {len(symbols)} símbolos")

        while self._running:
            for symbol in symbols:
                try:
                    ticker = await self.fetch_ticker(symbol)
                    await self._notify("price_update", ticker)
                except Exception as e:
                    logger.error(f"Stream error {symbol}: {e}")
            await asyncio.sleep(1)  # 1 segundo entre actualizaciones


# Singleton global
market_data = MarketDataEngine()
