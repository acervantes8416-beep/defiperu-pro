"""Endpoints de backtesting."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from app.core.security import get_current_user_id
from app.core.config import get_settings
from app.services.data.market_data import market_data
from app.services.backtesting.engine import backtest_engine

settings = get_settings()
router = APIRouter(prefix="/backtest", tags=["backtest"])


class BacktestRequest(BaseModel):
    symbol: str
    timeframe: str = "1h"
    initial_capital: float = 10000.0
    min_confidence: float = 40.0
    limit: int = 1000  # Velas de datos


@router.post("/run")
async def run_backtest(req: BacktestRequest, _user_id: str = Depends(get_current_user_id)):
    """Ejecuta un backtest completo sobre datos históricos."""
    formatted = req.symbol.upper().replace("-", "/")
    df = await market_data.fetch_ohlcv(formatted, req.timeframe, limit=req.limit)

    backtest_engine.initial_capital = req.initial_capital
    result = backtest_engine.run(df, formatted, req.timeframe, req.min_confidence)

    return {
        "symbol": result.symbol,
        "timeframe": result.timeframe,
        "period": {"start": result.period_start, "end": result.period_end},
        "performance": {
            "initial_capital": result.initial_capital,
            "final_capital": round(result.final_capital, 2),
            "total_return": round(result.total_return, 2),
            "total_return_pct": round(result.total_return_pct, 2),
            "max_drawdown_pct": round(result.max_drawdown_pct, 2),
            "sharpe_ratio": round(result.sharpe_ratio, 2),
            "profit_factor": round(result.profit_factor, 2),
        },
        "trades": {
            "total": result.total_trades,
            "winning": result.winning_trades,
            "losing": result.losing_trades,
            "win_rate": round(result.win_rate, 2),
            "avg_win": round(result.avg_win, 2),
            "avg_loss": round(result.avg_loss, 2),
            "largest_win": round(result.largest_win, 2),
            "largest_loss": round(result.largest_loss, 2),
        },
        "equity_curve": result.equity_curve,
        "trade_history": result.trades,
        "monthly_returns": result.monthly_returns,
    }
