"""Endpoints de datos de mercado."""
from fastapi import APIRouter, Query
from app.services.data.market_data import market_data
from app.core.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/market", tags=["market"])


@router.get("/ticker/{symbol}")
async def get_ticker(symbol: str):
    """Obtiene el ticker actual de un símbolo."""
    formatted = symbol.upper().replace("-", "/")
    return await market_data.fetch_ticker(formatted)


@router.get("/tickers")
async def get_all_tickers():
    """Obtiene tickers de todos los símbolos soportados."""
    return await market_data.fetch_all_tickers()


@router.get("/ohlcv/{symbol}")
async def get_ohlcv(
    symbol: str,
    timeframe: str = Query("1h", enum=settings.supported_timeframes),
    limit: int = Query(200, ge=50, le=1000),
):
    """Obtiene datos OHLCV históricos."""
    formatted = symbol.upper().replace("-", "/")
    df = await market_data.fetch_ohlcv(formatted, timeframe, limit)
    return {
        "symbol": formatted,
        "timeframe": timeframe,
        "data": [
            {
                "timestamp": str(idx),
                "open": row["open"],
                "high": row["high"],
                "low": row["low"],
                "close": row["close"],
                "volume": row["volume"],
            }
            for idx, row in df.iterrows()
        ],
    }


@router.get("/orderbook/{symbol}")
async def get_order_book(symbol: str, limit: int = Query(20, ge=5, le=100)):
    """Obtiene libro de órdenes."""
    formatted = symbol.upper().replace("-", "/")
    return await market_data.fetch_order_book(formatted, limit)
