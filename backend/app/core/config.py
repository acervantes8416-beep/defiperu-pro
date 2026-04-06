"""Configuración central de la aplicación."""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "DeFiPerú Pro"
    app_env: str = "development"
    log_level: str = "DEBUG"
    api_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/defiperu"
    redis_url: str = "redis://localhost:6379/0"

    # Auth
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Exchange
    binance_api_key: str = ""
    binance_api_secret: str = ""

    # Risk Management
    max_risk_per_trade: float = 0.02
    rebalance_interval_hours: int = 168  # 1 semana

    # Trading
    supported_symbols: list[str] = [
        "BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT",
        "XRP/USDT", "ADA/USDT", "AVAX/USDT", "DOT/USDT",
        "MATIC/USDT", "LINK/USDT"
    ]
    supported_timeframes: list[str] = ["1m", "5m", "15m", "1h", "4h", "1d"]

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
