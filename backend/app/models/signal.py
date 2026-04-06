"""Modelo de señales de trading generadas por el sistema."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column
import enum
from app.core.database import Base


class SignalType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol: Mapped[str] = mapped_column(String(20), index=True)
    timeframe: Mapped[str] = mapped_column(String(10))
    signal_type: Mapped[SignalType] = mapped_column(SAEnum(SignalType))
    confidence_score: Mapped[float] = mapped_column(Float)  # 0-100
    meta_score: Mapped[float] = mapped_column(Float)  # Score combinado
    entry_price: Mapped[float] = mapped_column(Float)
    stop_loss: Mapped[float] = mapped_column(Float)
    take_profit: Mapped[float] = mapped_column(Float)
    risk_reward_ratio: Mapped[float] = mapped_column(Float)
    probability: Mapped[float] = mapped_column(Float)  # Probabilidad de éxito

    # Detalle de cada estrategia que contribuyó
    strategy_details: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
