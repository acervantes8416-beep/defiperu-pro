"""WebSocket endpoints para streaming de datos en tiempo real."""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from loguru import logger
from app.services.data.market_data import market_data
from app.services.strategies.engine import strategy_engine
from app.services.decision.meta_score import decision_engine

router = APIRouter()


class ConnectionManager:
    """Gestiona conexiones WebSocket activas."""

    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.remove(ws)


manager = ConnectionManager()


@router.websocket("/ws/prices")
async def price_stream(ws: WebSocket):
    """Stream de precios en tiempo real."""
    await manager.connect(ws)
    try:
        while True:
            tickers = await market_data.fetch_all_tickers()
            await ws.send_json({"type": "prices", "data": tickers})
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        manager.disconnect(ws)


@router.websocket("/ws/signals")
async def signals_stream(ws: WebSocket):
    """Stream de señales de trading en tiempo real."""
    await manager.connect(ws)
    try:
        while True:
            signals = []
            from app.core.config import get_settings
            settings = get_settings()

            for symbol in settings.supported_symbols[:5]:  # Top 5 para performance
                try:
                    df = await market_data.fetch_ohlcv(symbol, "1h", limit=300)
                    strat_signals = strategy_engine.analyze_symbol(df)
                    decision = decision_engine.decide(symbol, "1h", strat_signals)
                    signals.append({
                        "symbol": symbol,
                        "signal": decision.signal,
                        "meta_score": round(decision.meta_score, 2),
                        "confidence": round(decision.confidence, 2),
                        "entry": decision.entry_price,
                        "sl": round(decision.stop_loss, 2),
                        "tp": round(decision.take_profit, 2),
                    })
                except Exception:
                    continue

            await ws.send_json({"type": "signals", "data": signals})
            await asyncio.sleep(10)  # Actualizar señales cada 10s
    except WebSocketDisconnect:
        manager.disconnect(ws)


@router.websocket("/ws/portfolio")
async def portfolio_stream(ws: WebSocket):
    """Stream de estado del portfolio en tiempo real."""
    await manager.connect(ws)
    try:
        while True:
            # En producción: obtener datos reales del portfolio
            await ws.send_json({
                "type": "portfolio",
                "data": {
                    "total_value": 10000,
                    "pnl": 0,
                    "positions": [],
                },
            })
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        manager.disconnect(ws)
