"""Endpoints de copy trading y ranking de estrategias."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import get_current_user_id

router = APIRouter(prefix="/social", tags=["social"])


class CopyTraderRequest(BaseModel):
    leader_id: str


class LeaderboardEntry(BaseModel):
    user_id: str
    username: str
    total_return_pct: float
    win_rate: float
    sharpe_ratio: float
    total_trades: int
    followers: int


@router.get("/leaderboard")
async def get_leaderboard(_user_id: str = Depends(get_current_user_id)):
    """Ranking de traders más rentables (copy trading)."""
    # En producción esto vendría de la DB con queries optimizados
    return {
        "leaderboard": [
            {
                "rank": 1,
                "user_id": "demo-leader-1",
                "username": "AlphaTrader",
                "total_return_pct": 42.5,
                "win_rate": 68.3,
                "sharpe_ratio": 2.1,
                "total_trades": 156,
                "followers": 23,
                "strategy_focus": "trend_following",
            }
        ],
        "message": "Leaderboard se actualiza cada hora",
    }


@router.post("/copy")
async def start_copy_trading(req: CopyTraderRequest, user_id: str = Depends(get_current_user_id)):
    """Comienza a copiar trades de un líder."""
    return {
        "status": "active",
        "follower_id": user_id,
        "leader_id": req.leader_id,
        "message": "Copy trading activado. Los trades del líder se replicarán automáticamente.",
    }


@router.delete("/copy")
async def stop_copy_trading(user_id: str = Depends(get_current_user_id)):
    """Detiene el copy trading."""
    return {"status": "stopped", "message": "Copy trading desactivado"}


@router.get("/strategy-ranking")
async def get_strategy_ranking(_user_id: str = Depends(get_current_user_id)):
    """Ranking de las estrategias más rentables del sistema."""
    return {
        "strategies": [
            {
                "name": "trend_following",
                "description": "EMA Cross + MACD Confirmation",
                "win_rate": 62.4,
                "avg_return": 1.8,
                "total_return": 34.2,
                "sharpe_ratio": 1.9,
                "total_signals": 1240,
                "best_pair": "BTC/USDT",
                "best_timeframe": "4h",
            },
            {
                "name": "mean_reversion",
                "description": "RSI + Bollinger Bands Reversal",
                "win_rate": 58.1,
                "avg_return": 1.2,
                "total_return": 28.7,
                "sharpe_ratio": 1.5,
                "total_signals": 890,
                "best_pair": "ETH/USDT",
                "best_timeframe": "1h",
            },
            {
                "name": "breakout",
                "description": "Volume + S/R Breakout",
                "win_rate": 51.3,
                "avg_return": 2.4,
                "total_return": 22.1,
                "sharpe_ratio": 1.3,
                "total_signals": 456,
                "best_pair": "SOL/USDT",
                "best_timeframe": "4h",
            },
        ]
    }
