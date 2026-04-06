"""
DeFiPerú Pro — Backend API
Mini hedge fund automático para criptomonedas.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.core.config import get_settings
from app.services.data.market_data import market_data
from app.api.routes import auth, market, signals, portfolio, backtest, copy_trading
from app.api.websockets import stream

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialización y limpieza de la aplicación."""
    logger.info(f"🚀 Iniciando {settings.app_name}...")
    await market_data.initialize()
    logger.info("MarketData engine ready")
    yield
    await market_data.close()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.app_name,
    description="Plataforma automatizada de trading cripto — análisis, señales y ejecución",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS para frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers REST
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(market.router, prefix=settings.api_prefix)
app.include_router(signals.router, prefix=settings.api_prefix)
app.include_router(portfolio.router, prefix=settings.api_prefix)
app.include_router(backtest.router, prefix=settings.api_prefix)
app.include_router(copy_trading.router, prefix=settings.api_prefix)

# WebSocket routes
app.include_router(stream.router)


@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
