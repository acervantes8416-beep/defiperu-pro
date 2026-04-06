"""Endpoints de portfolio management — Solo SPOT, sin futuros ni apalancamiento."""
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from app.core.security import get_current_user_id
from app.services.portfolio.manager import portfolio_manager
from app.services.portfolio.risk_profiles import (
    RiskProfileType, RISK_PROFILES, get_profile, get_cash_target_pct, compute_rebalance_orders,
)
from app.services.execution.executor import execution_engine, ExecutionMode

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


class SetModeRequest(BaseModel):
    mode: str  # manual, semi_auto, full_auto


class SetProfileRequest(BaseModel):
    profile: str  # conservador, moderado, agresivo


class ApproveTradeRequest(BaseModel):
    symbol: str


# ── Perfiles de riesgo ──────────────────────────────────────

@router.get("/profiles")
async def get_risk_profiles(_user_id: str = Depends(get_current_user_id)):
    """Retorna los 3 perfiles de riesgo disponibles para SPOT."""
    result = []
    for ptype, profile in RISK_PROFILES.items():
        cash_pct = get_cash_target_pct(profile)
        result.append({
            "type": ptype.value,
            "name": profile.name,
            "description": profile.description,
            "max_drawdown_pct": profile.max_drawdown_pct,
            "max_risk_per_trade_pct": profile.max_risk_per_trade_pct,
            "rebalance_threshold_pct": profile.rebalance_threshold_pct,
            "allocations": [
                {
                    "symbol": a.symbol,
                    "target_pct": a.target_pct,
                    "category": a.category,
                }
                for a in profile.allocations
            ],
            "cash_pct": cash_pct,
        })
    return {"profiles": result}


@router.post("/profile")
async def set_risk_profile(req: SetProfileRequest, _user_id: str = Depends(get_current_user_id)):
    """Establece el perfil de riesgo activo del usuario."""
    try:
        profile_type = RiskProfileType(req.profile)
    except ValueError:
        return {"error": "Perfil inválido. Opciones: conservador, moderado, agresivo"}
    profile = get_profile(profile_type)
    portfolio_manager.max_risk = profile.max_risk_per_trade_pct / 100
    return {
        "profile": profile_type.value,
        "name": profile.name,
        "max_risk_per_trade": profile.max_risk_per_trade_pct,
        "max_drawdown": profile.max_drawdown_pct,
        "mensaje": f"Perfil '{profile.name}' activado. Riesgo máximo por trade: {profile.max_risk_per_trade_pct}%",
    }


@router.get("/rebalance")
async def get_rebalance_plan(
    profile: str = Query("moderado", enum=["conservador", "moderado", "agresivo"]),
    portfolio_value: float = Query(10000, ge=100),
    _user_id: str = Depends(get_current_user_id),
):
    """
    Calcula el plan de rebalanceo para un perfil dado.
    Retorna acciones exactas: qué comprar/vender y cuánto en USD.
    Solo operaciones SPOT.
    """
    profile_type = RiskProfileType(profile)
    risk_profile = get_profile(profile_type)

    # En producción: obtener holdings reales del exchange
    # Demo: simular holdings parciales
    current_holdings = {
        "BTC/USDT": portfolio_value * 0.30,
        "ETH/USDT": portfolio_value * 0.20,
        "SOL/USDT": portfolio_value * 0.05,
    }
    current_prices = {
        "BTC/USDT": 98450.0,
        "ETH/USDT": 3420.0,
        "SOL/USDT": 185.40,
        "BNB/USDT": 612.0,
        "AVAX/USDT": 38.70,
        "LINK/USDT": 18.50,
        "DOT/USDT": 7.80,
        "ADA/USDT": 0.72,
        "XRP/USDT": 2.18,
    }

    orders = compute_rebalance_orders(risk_profile, portfolio_value, current_holdings, current_prices)

    return {
        "perfil": risk_profile.name,
        "valor_portfolio_usd": portfolio_value,
        "cash_target_pct": get_cash_target_pct(risk_profile),
        "max_drawdown_pct": risk_profile.max_drawdown_pct,
        "ordenes": orders,
        "resumen": {
            "total_comprar_usd": round(sum(o["delta_usd"] for o in orders if o["action"] == "comprar"), 2),
            "total_vender_usd": round(abs(sum(o["delta_usd"] for o in orders if o["action"] == "vender")), 2),
            "activos_a_comprar": [o["symbol"] for o in orders if o["action"] == "comprar"],
            "activos_a_vender": [o["symbol"] for o in orders if o["action"] == "vender"],
        },
    }


# ── Portfolio overview ──────────────────────────────────────

@router.get("/overview")
async def get_portfolio_overview(user_id: str = Depends(get_current_user_id)):
    """Resumen del portfolio del usuario — solo SPOT."""
    return {
        "user_id": user_id,
        "total_value": portfolio_manager.initial_capital,
        "cash": portfolio_manager.initial_capital,
        "positions": [],
        "pnl_total": 0,
        "pnl_pct": 0,
        "max_drawdown": 0,
        "sharpe_ratio": portfolio_manager.compute_sharpe_ratio(),
        "trading_mode": execution_engine._mode.value,
        "modo": "spot",
    }


@router.post("/mode")
async def set_trading_mode(req: SetModeRequest, _user_id: str = Depends(get_current_user_id)):
    """Cambia el modo de trading (solo SPOT)."""
    mode_map = {
        "manual": ExecutionMode.MANUAL,
        "semi_auto": ExecutionMode.SEMI_AUTO,
        "full_auto": ExecutionMode.FULL_AUTO,
    }
    mode = mode_map.get(req.mode)
    if not mode:
        return {"error": "Modo inválido. Opciones: manual, semi_auto, full_auto"}
    execution_engine.set_mode(mode)
    return {"mode": mode.value, "mensaje": f"Modo cambiado a {mode.value} (SPOT)"}


@router.get("/pending-trades")
async def get_pending_trades(_user_id: str = Depends(get_current_user_id)):
    """Obtiene trades pendientes de aprobación (modo semi-auto, SPOT)."""
    return execution_engine.get_pending_approvals()


@router.post("/approve-trade")
async def approve_trade(req: ApproveTradeRequest, _user_id: str = Depends(get_current_user_id)):
    """Aprueba y ejecuta un trade pendiente (SPOT)."""
    result = await execution_engine.approve_and_execute(
        req.symbol, portfolio_manager.initial_capital
    )
    if result:
        return {"success": result.success, "order_id": result.order_id, "mensaje": result.message}
    return {"success": False, "mensaje": "No se encontró trade pendiente"}
