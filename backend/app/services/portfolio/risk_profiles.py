"""
Perfiles de riesgo para trading SPOT.
Define 3 perfiles con allocaciones target, límites de drawdown y reglas de rebalanceo.
Todos los cálculos son en SPOT — sin futuros ni apalancamiento.
"""
from dataclasses import dataclass, field
from enum import Enum


class RiskProfileType(str, Enum):
    CONSERVADOR = "conservador"
    MODERADO = "moderado"
    AGRESIVO = "agresivo"


@dataclass
class AssetAllocation:
    """Allocación objetivo para un activo."""
    symbol: str
    target_pct: float       # % objetivo del portfolio (0-100)
    category: str           # "major", "large_cap", "alt", "stablecoin"


@dataclass
class RiskProfile:
    """Perfil de riesgo completo."""
    name: str
    type: RiskProfileType
    description: str
    max_drawdown_pct: float          # Drawdown máximo permitido (%)
    max_risk_per_trade_pct: float    # Riesgo máximo por trade (%)
    rebalance_threshold_pct: float   # Umbral para disparar rebalanceo (desviación %)
    allocations: list[AssetAllocation] = field(default_factory=list)


# ── Definición de los 3 perfiles ──────────────────────────────

RISK_PROFILES: dict[RiskProfileType, RiskProfile] = {
    RiskProfileType.CONSERVADOR: RiskProfile(
        name="Conservador",
        type=RiskProfileType.CONSERVADOR,
        description="Máxima seguridad. Concentrado en BTC/ETH con reserva en USDT. Ideal para preservar capital.",
        max_drawdown_pct=10.0,
        max_risk_per_trade_pct=1.0,
        rebalance_threshold_pct=3.0,
        allocations=[
            AssetAllocation(symbol="BTC/USDT", target_pct=50.0, category="major"),
            AssetAllocation(symbol="ETH/USDT", target_pct=30.0, category="major"),
            # 20% en USDT = se mantiene como cash (no se compra nada)
        ],
    ),
    RiskProfileType.MODERADO: RiskProfile(
        name="Moderado",
        type=RiskProfileType.MODERADO,
        description="Balance riesgo/retorno. Diversificación entre majors y large caps con reserva en USDT.",
        max_drawdown_pct=20.0,
        max_risk_per_trade_pct=2.0,
        rebalance_threshold_pct=5.0,
        allocations=[
            AssetAllocation(symbol="BTC/USDT", target_pct=35.0, category="major"),
            AssetAllocation(symbol="ETH/USDT", target_pct=25.0, category="major"),
            AssetAllocation(symbol="SOL/USDT", target_pct=20.0, category="large_cap"),
            AssetAllocation(symbol="BNB/USDT", target_pct=10.0, category="large_cap"),
            # 10% en USDT = cash
        ],
    ),
    RiskProfileType.AGRESIVO: RiskProfile(
        name="Agresivo",
        type=RiskProfileType.AGRESIVO,
        description="Máximo rendimiento. Exposición amplia incluyendo altcoins. Mayor volatilidad esperada.",
        max_drawdown_pct=35.0,
        max_risk_per_trade_pct=3.0,
        rebalance_threshold_pct=7.0,
        allocations=[
            AssetAllocation(symbol="BTC/USDT", target_pct=25.0, category="major"),
            AssetAllocation(symbol="ETH/USDT", target_pct=20.0, category="major"),
            AssetAllocation(symbol="SOL/USDT", target_pct=20.0, category="large_cap"),
            AssetAllocation(symbol="AVAX/USDT", target_pct=8.0, category="alt"),
            AssetAllocation(symbol="LINK/USDT", target_pct=7.0, category="alt"),
            AssetAllocation(symbol="DOT/USDT", target_pct=5.0, category="alt"),
            AssetAllocation(symbol="ADA/USDT", target_pct=5.0, category="alt"),
            # 10% en USDT = cash
        ],
    ),
}


def get_profile(profile_type: RiskProfileType) -> RiskProfile:
    return RISK_PROFILES[profile_type]


def get_cash_target_pct(profile: RiskProfile) -> float:
    """Calcula el % de USDT (cash) del perfil = 100 - suma de allocaciones."""
    allocated = sum(a.target_pct for a in profile.allocations)
    return max(0.0, 100.0 - allocated)


def compute_rebalance_orders(
    profile: RiskProfile,
    portfolio_value_usd: float,
    current_holdings: dict[str, float],  # symbol -> valor actual en USD
    current_prices: dict[str, float],    # symbol -> precio actual en USD
) -> list[dict]:
    """
    Calcula las órdenes necesarias para rebalancear hacia el perfil target.
    Retorna lista de acciones con montos exactos en USD.

    Cada orden es SPOT: comprar o vender el activo subyacente.
    """
    orders = []
    cash_target_pct = get_cash_target_pct(profile)

    for alloc in profile.allocations:
        symbol = alloc.symbol
        target_value = portfolio_value_usd * (alloc.target_pct / 100)
        current_value = current_holdings.get(symbol, 0.0)
        price = current_prices.get(symbol, 0.0)

        delta_usd = target_value - current_value
        delta_pct = (alloc.target_pct) - (current_value / portfolio_value_usd * 100 if portfolio_value_usd > 0 else 0)

        # Solo generar orden si la desviación supera el threshold
        if abs(delta_pct) < profile.rebalance_threshold_pct and abs(delta_usd) < 10:
            action = "mantener"
        elif delta_usd > 0:
            action = "comprar"
        else:
            action = "vender"

        quantity = abs(delta_usd) / price if price > 0 else 0

        orders.append({
            "symbol": symbol,
            "category": alloc.category,
            "action": action,  # "comprar", "vender", "mantener"
            "target_pct": alloc.target_pct,
            "current_pct": round(current_value / portfolio_value_usd * 100, 2) if portfolio_value_usd > 0 else 0,
            "delta_pct": round(delta_pct, 2),
            "target_value_usd": round(target_value, 2),
            "current_value_usd": round(current_value, 2),
            "delta_usd": round(delta_usd, 2),
            "quantity": round(quantity, 8),
            "price": price,
        })

    # Agregar la posición de USDT (cash)
    total_invested = sum(current_holdings.get(a.symbol, 0) for a in profile.allocations)
    current_cash = portfolio_value_usd - total_invested
    target_cash = portfolio_value_usd * (cash_target_pct / 100)
    delta_cash = target_cash - current_cash

    orders.append({
        "symbol": "USDT",
        "category": "stablecoin",
        "action": "mantener" if abs(delta_cash) < 10 else ("liberar" if delta_cash > 0 else "invertir"),
        "target_pct": cash_target_pct,
        "current_pct": round(current_cash / portfolio_value_usd * 100, 2) if portfolio_value_usd > 0 else 100,
        "delta_pct": round(cash_target_pct - (current_cash / portfolio_value_usd * 100 if portfolio_value_usd > 0 else 100), 2),
        "target_value_usd": round(target_cash, 2),
        "current_value_usd": round(current_cash, 2),
        "delta_usd": round(delta_cash, 2),
        "quantity": 0,
        "price": 1.0,
    })

    return orders
