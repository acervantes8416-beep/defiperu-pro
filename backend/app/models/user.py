"""Modelo de usuario para sistema multiusuario SaaS."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Float, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from app.core.database import Base


class TradingMode(str, enum.Enum):
    MANUAL = "manual"
    SEMI_AUTO = "semi_auto"
    FULL_AUTO = "full_auto"


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Trading config
    trading_mode: Mapped[TradingMode] = mapped_column(SAEnum(TradingMode), default=TradingMode.MANUAL)
    max_risk_per_trade: Mapped[float] = mapped_column(Float, default=0.02)

    # Exchange keys (encrypted in production)
    exchange_api_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    exchange_api_secret: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # SaaS
    subscription_tier: Mapped[SubscriptionTier] = mapped_column(
        SAEnum(SubscriptionTier), default=SubscriptionTier.FREE
    )

    # Copy trading
    is_copy_leader: Mapped[bool] = mapped_column(Boolean, default=False)
    copy_leader_id: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    portfolios = relationship("Portfolio", back_populates="user")
