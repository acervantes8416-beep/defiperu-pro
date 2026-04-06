"""Endpoints de señales y análisis."""
from fastapi import APIRouter, Query, Depends
from app.services.data.market_data import market_data
from app.services.strategies.engine import strategy_engine
from app.services.decision.meta_score import decision_engine
from app.core.config import get_settings
from app.core.security import get_current_user_id

settings = get_settings()
router = APIRouter(prefix="/signals", tags=["signals"])


@router.get("/analyze/{symbol}")
async def analyze_symbol(
    symbol: str,
    timeframe: str = Query("1h", enum=settings.supported_timeframes),
    _user_id: str = Depends(get_current_user_id),
):
    """
    Análisis completo de un símbolo: indicadores + estrategias + decisión.
    Este es el endpoint principal que reemplaza el análisis manual de gráficos.
    """
    formatted = symbol.upper().replace("-", "/")
    df = await market_data.fetch_ohlcv(formatted, timeframe, limit=300)

    # Ejecutar estrategias
    strategy_signals = strategy_engine.analyze_symbol(df)

    # Decisión final
    decision = decision_engine.decide(formatted, timeframe, strategy_signals)

    return {
        "symbol": formatted,
        "timeframe": timeframe,
        "decision": {
            "signal": decision.signal,
            "meta_score": round(decision.meta_score, 2),
            "confidence": round(decision.confidence, 2),
            "entry_price": decision.entry_price,
            "stop_loss": round(decision.stop_loss, 2),
            "take_profit": round(decision.take_profit, 2),
            "risk_reward": round(decision.risk_reward_ratio, 2),
            "position_size_pct": round(decision.position_size_pct * 100, 2),
        },
        "strategies": decision.strategy_signals,
        "reasoning": decision.reasoning,
    }


@router.get("/scan")
async def scan_all_symbols(
    timeframe: str = Query("1h", enum=settings.supported_timeframes),
    _user_id: str = Depends(get_current_user_id),
):
    """Escanea todos los símbolos y retorna señales ordenadas por confianza."""
    results = []

    for symbol in settings.supported_symbols:
        try:
            df = await market_data.fetch_ohlcv(symbol, timeframe, limit=300)
            strategy_signals = strategy_engine.analyze_symbol(df)
            decision = decision_engine.decide(symbol, timeframe, strategy_signals)

            results.append({
                "symbol": symbol,
                "signal": decision.signal,
                "meta_score": round(decision.meta_score, 2),
                "confidence": round(decision.confidence, 2),
                "entry_price": decision.entry_price,
                "stop_loss": round(decision.stop_loss, 2),
                "take_profit": round(decision.take_profit, 2),
                "risk_reward": round(decision.risk_reward_ratio, 2),
            })
        except Exception:
            continue

    # Ordenar por confianza descendente, señales activas primero
    results.sort(key=lambda x: (x["signal"] != "HOLD", x["confidence"]), reverse=True)
    return {"timeframe": timeframe, "signals": results}


@router.get("/indicators/{symbol}")
async def get_indicators(
    symbol: str,
    timeframe: str = Query("1h", enum=settings.supported_timeframes),
    _user_id: str = Depends(get_current_user_id),
):
    """Obtiene los valores actuales de todos los indicadores técnicos."""
    formatted = symbol.upper().replace("-", "/")
    df = await market_data.fetch_ohlcv(formatted, timeframe, limit=300)
    indicators = strategy_engine.get_indicators(df)

    result = {}
    for name, ind in indicators.items():
        last_values = {}
        for key, series in ind.values.items():
            val = series.iloc[-1] if len(series) > 0 else None
            last_values[key] = round(float(val), 6) if val is not None and not isinstance(val, str) else val
        result[name] = {
            "signal": ind.signal,
            "strength": round(ind.strength, 2),
            "values": last_values,
        }

    return {"symbol": formatted, "timeframe": timeframe, "indicators": result}
