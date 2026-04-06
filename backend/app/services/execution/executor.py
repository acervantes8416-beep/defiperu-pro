"""
Execution Engine: Ejecuta órdenes SPOT en el exchange.
Soporta modos manual, semi-auto y full-auto.
Solo operaciones Spot — sin futuros ni apalancamiento.
"""
import asyncio
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum
from loguru import logger
import ccxt.async_support as ccxt

from app.services.decision.meta_score import TradingDecision


class ExecutionMode(str, Enum):
    MANUAL = "manual"        # Solo genera señales, no ejecuta
    SEMI_AUTO = "semi_auto"  # Propone trades, usuario aprueba
    FULL_AUTO = "full_auto"  # Ejecuta automáticamente


@dataclass
class OrderResult:
    """Resultado de una ejecución de orden."""
    success: bool
    order_id: str | None
    symbol: str
    side: str
    price: float
    quantity: float
    status: str
    message: str
    timestamp: str


class ExecutionEngine:
    """Motor de ejecución de órdenes con soporte multi-modo."""

    def __init__(self):
        self._exchange: ccxt.Exchange | None = None
        self._mode = ExecutionMode.MANUAL
        self._pending_approvals: dict[str, TradingDecision] = {}

    async def initialize(self, api_key: str, api_secret: str):
        """Inicializa conexión con el exchange para ejecución."""
        self._exchange = ccxt.binance({
            "apiKey": api_key,
            "secret": api_secret,
            "enableRateLimit": True,
            "options": {"defaultType": "spot"},
        })
        logger.info("ExecutionEngine inicializado")

    async def close(self):
        if self._exchange:
            await self._exchange.close()

    def set_mode(self, mode: ExecutionMode):
        self._mode = mode
        logger.info(f"Modo de ejecución cambiado a: {mode.value}")

    async def process_decision(self, decision: TradingDecision, portfolio_value: float) -> OrderResult | None:
        """
        Procesa una decisión de trading según el modo de ejecución.
        """
        if decision.signal == "HOLD":
            return None

        if self._mode == ExecutionMode.MANUAL:
            logger.info(f"[MANUAL] Señal {decision.signal} para {decision.symbol} — no se ejecuta")
            return None

        if self._mode == ExecutionMode.SEMI_AUTO:
            # Almacenar para aprobación
            self._pending_approvals[decision.symbol] = decision
            logger.info(f"[SEMI-AUTO] Señal {decision.signal} para {decision.symbol} pendiente de aprobación")
            return None

        # FULL_AUTO: ejecutar directamente
        return await self.execute_order(decision, portfolio_value)

    async def approve_and_execute(self, symbol: str, portfolio_value: float) -> OrderResult | None:
        """Aprueba y ejecuta una orden pendiente (modo semi-auto)."""
        decision = self._pending_approvals.pop(symbol, None)
        if not decision:
            return OrderResult(
                success=False, order_id=None, symbol=symbol, side="",
                price=0, quantity=0, status="error",
                message="No hay orden pendiente para este símbolo",
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        return await self.execute_order(decision, portfolio_value)

    async def execute_order(self, decision: TradingDecision, portfolio_value: float) -> OrderResult:
        """Ejecuta una orden en el exchange."""
        try:
            # Calcular cantidad
            position_value = portfolio_value * decision.position_size_pct
            quantity = position_value / decision.entry_price

            side = "buy" if decision.signal == "BUY" else "sell"

            if not self._exchange:
                # Paper trading mode
                return OrderResult(
                    success=True,
                    order_id=f"paper_{decision.symbol}_{datetime.now(timezone.utc).timestamp():.0f}",
                    symbol=decision.symbol,
                    side=side,
                    price=decision.entry_price,
                    quantity=quantity,
                    status="filled",
                    message="Paper trade ejecutado",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                )

            # Orden real en el exchange
            order = await self._exchange.create_order(
                symbol=decision.symbol,
                type="limit",
                side=side,
                amount=quantity,
                price=decision.entry_price,
            )

            # Crear órdenes de SL/TP
            await self._place_stop_loss(decision.symbol, side, quantity, decision.stop_loss)
            await self._place_take_profit(decision.symbol, side, quantity, decision.take_profit)

            logger.info(
                f"Orden ejecutada: {side} {quantity:.6f} {decision.symbol} @ {decision.entry_price}"
                f" | SL: {decision.stop_loss} | TP: {decision.take_profit}"
            )

            return OrderResult(
                success=True,
                order_id=order.get("id", ""),
                symbol=decision.symbol,
                side=side,
                price=decision.entry_price,
                quantity=quantity,
                status=order.get("status", "open"),
                message="Orden ejecutada exitosamente",
                timestamp=datetime.now(timezone.utc).isoformat(),
            )

        except Exception as e:
            logger.error(f"Error ejecutando orden {decision.symbol}: {e}")
            return OrderResult(
                success=False,
                order_id=None,
                symbol=decision.symbol,
                side="buy" if decision.signal == "BUY" else "sell",
                price=decision.entry_price,
                quantity=0,
                status="error",
                message=str(e),
                timestamp=datetime.now(timezone.utc).isoformat(),
            )

    async def _place_stop_loss(self, symbol: str, side: str, quantity: float, price: float):
        """Coloca orden de stop loss."""
        if not self._exchange:
            return
        try:
            sl_side = "sell" if side == "buy" else "buy"
            await self._exchange.create_order(
                symbol=symbol, type="stop_loss_limit", side=sl_side,
                amount=quantity, price=price, params={"stopPrice": price},
            )
        except Exception as e:
            logger.warning(f"No se pudo colocar SL para {symbol}: {e}")

    async def _place_take_profit(self, symbol: str, side: str, quantity: float, price: float):
        """Coloca orden de take profit."""
        if not self._exchange:
            return
        try:
            tp_side = "sell" if side == "buy" else "buy"
            await self._exchange.create_order(
                symbol=symbol, type="take_profit_limit", side=tp_side,
                amount=quantity, price=price, params={"stopPrice": price},
            )
        except Exception as e:
            logger.warning(f"No se pudo colocar TP para {symbol}: {e}")

    async def get_open_orders(self, symbol: str | None = None) -> list[dict]:
        """Obtiene órdenes abiertas."""
        if not self._exchange:
            return []
        try:
            return await self._exchange.fetch_open_orders(symbol)
        except Exception as e:
            logger.error(f"Error obteniendo órdenes abiertas: {e}")
            return []

    async def cancel_order(self, order_id: str, symbol: str) -> bool:
        """Cancela una orden abierta."""
        if not self._exchange:
            return False
        try:
            await self._exchange.cancel_order(order_id, symbol)
            return True
        except Exception as e:
            logger.error(f"Error cancelando orden {order_id}: {e}")
            return False

    def get_pending_approvals(self) -> dict[str, dict]:
        """Retorna las órdenes pendientes de aprobación (semi-auto)."""
        return {
            symbol: {
                "signal": d.signal,
                "confidence": d.confidence,
                "entry": d.entry_price,
                "sl": d.stop_loss,
                "tp": d.take_profit,
                "rr": d.risk_reward_ratio,
                "position_pct": d.position_size_pct,
            }
            for symbol, d in self._pending_approvals.items()
        }


# Singleton
execution_engine = ExecutionEngine()
