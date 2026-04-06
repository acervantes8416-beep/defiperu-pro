"""
Endpoints de datos de mercado global.
- Fear & Greed Index (Alternative.me)
- Dominancia BTC/ETH y datos globales (CoinGecko)
- Top 100 criptomonedas (CoinGecko)
- Precios históricos para simulación (CoinGecko)
"""
import asyncio
from fastapi import APIRouter, Query
import httpx
from loguru import logger

router = APIRouter(prefix="/market-global", tags=["market-global"])

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
FNG_URL = "https://api.alternative.me/fng/"


@router.get("/fear-greed")
async def get_fear_greed():
    """Fear & Greed Index desde Alternative.me."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(FNG_URL, params={"limit": 1})
            data = resp.json()["data"][0]
            value = int(data["value"])

            if value <= 20:
                label = "Miedo Extremo"
            elif value <= 40:
                label = "Miedo"
            elif value <= 60:
                label = "Neutral"
            elif value <= 80:
                label = "Codicia"
            else:
                label = "Codicia Extrema"

            return {
                "value": value,
                "label": label,
                "timestamp": data["timestamp"],
            }
    except Exception as e:
        logger.warning(f"Fear & Greed API error: {e}")
        return {"value": 50, "label": "Neutral", "timestamp": "0", "error": str(e)}


@router.get("/global")
async def get_global_data():
    """Datos globales: dominancia BTC/ETH, market cap total."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{COINGECKO_BASE}/global")
            data = resp.json()["data"]
            btc_dom = data["market_cap_percentage"].get("btc", 0)
            eth_dom = data["market_cap_percentage"].get("eth", 0)

            return {
                "btc_dominance": round(btc_dom, 2),
                "eth_dominance": round(eth_dom, 2),
                "total_market_cap_usd": data["total_market_cap"].get("usd", 0),
                "total_volume_usd": data["total_volume"].get("usd", 0),
                "active_cryptocurrencies": data.get("active_cryptocurrencies", 0),
                "market_cap_change_24h": round(data.get("market_cap_change_percentage_24h_usd", 0), 2),
            }
    except Exception as e:
        logger.warning(f"CoinGecko global API error: {e}")
        return {
            "btc_dominance": 52.0, "eth_dominance": 17.0,
            "total_market_cap_usd": 0, "total_volume_usd": 0,
            "active_cryptocurrencies": 0, "market_cap_change_24h": 0,
            "error": str(e),
        }


@router.get("/market-phase")
async def get_market_phase():
    """
    Calcula la fase actual del mercado.
    - ALCISTA: BTC dom < 45% y F&G > 60
    - BAJISTA: BTC dom > 55% y F&G < 30
    - LATERAL: resto
    """
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            fng_task = client.get(FNG_URL, params={"limit": 1})
            global_task = client.get(f"{COINGECKO_BASE}/global")
            fng_resp, global_resp = await asyncio.gather(fng_task, global_task)

            fng_value = int(fng_resp.json()["data"][0]["value"])
            btc_dom = global_resp.json()["data"]["market_cap_percentage"].get("btc", 50)
            eth_dom = global_resp.json()["data"]["market_cap_percentage"].get("eth", 17)

        if btc_dom < 45 and fng_value > 60:
            phase = "ALCISTA"
            description = "El mercado muestra señales alcistas. La dominancia de Bitcoin es baja, indicando que el capital fluye hacia altcoins, y el sentimiento general es de codicia. Buen momento para mantener posiciones."
            strategy = "El sistema prioriza estrategias de Trend Following y está buscando oportunidades de compra en activos con momentum positivo."
        elif btc_dom > 55 and fng_value < 30:
            phase = "BAJISTA"
            description = "El mercado muestra señales bajistas. Los inversores buscan refugio en Bitcoin y el miedo domina el sentimiento. Momento de cautela y protección de capital."
            strategy = "El sistema activa protección de capital, reduce exposición a altcoins y aumenta la reserva en USDT según tu perfil de riesgo."
        else:
            phase = "LATERAL"
            description = "El mercado se encuentra en fase lateral sin una tendencia clara. Los indicadores muestran señales mixtas. Momento de esperar confirmación."
            strategy = "El sistema opera con Mean Reversion aprovechando rangos de precio y mantiene posiciones conservadoras hasta que se defina la tendencia."

        return {
            "phase": phase,
            "description": description,
            "strategy": strategy,
            "fear_greed": fng_value,
            "btc_dominance": round(btc_dom, 2),
            "eth_dominance": round(eth_dom, 2),
        }
    except Exception as e:
        logger.warning(f"Market phase calculation error: {e}")
        return {
            "phase": "LATERAL",
            "description": "No se pudieron obtener datos en tiempo real. El sistema opera con precaución.",
            "strategy": "Modo conservador activo hasta restablecer conexión con datos de mercado.",
            "fear_greed": 50, "btc_dominance": 52.0, "eth_dominance": 17.0,
            "error": str(e),
        }


@router.get("/top100")
async def get_top_100(page: int = Query(1, ge=1, le=2)):
    """Top 100 criptomonedas desde CoinGecko con precios y cambios."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{COINGECKO_BASE}/coins/markets", params={
                "vs_currency": "usd",
                "order": "market_cap_desc",
                "per_page": 100,
                "page": page,
                "sparkline": False,
                "price_change_percentage": "1h,24h,7d",
            })
            coins = resp.json()

        result = []
        for coin in coins:
            change_24h = coin.get("price_change_percentage_24h") or 0
            change_7d = coin.get("price_change_percentage_7d_in_currency") or 0

            # Señal basada en cambios
            if change_24h > 3 and change_7d > 5:
                signal = "COMPRAR"
            elif change_24h < -5 or change_7d < -10:
                signal = "EVITAR"
            else:
                signal = "MANTENER"

            result.append({
                "rank": coin.get("market_cap_rank", 0),
                "id": coin.get("id", ""),
                "symbol": coin.get("symbol", "").upper(),
                "name": coin.get("name", ""),
                "image": coin.get("image", ""),
                "price": coin.get("current_price", 0),
                "change_1h": round(coin.get("price_change_percentage_1h_in_currency") or 0, 2),
                "change_24h": round(change_24h, 2),
                "change_7d": round(change_7d, 2),
                "market_cap": coin.get("market_cap", 0),
                "volume_24h": coin.get("total_volume", 0),
                "signal": signal,
            })

        return {"coins": result, "page": page, "total": len(result)}
    except Exception as e:
        logger.warning(f"CoinGecko top 100 error: {e}")
        return {"coins": [], "page": page, "total": 0, "error": str(e)}


@router.get("/historical/{coin_id}")
async def get_historical_prices(
    coin_id: str,
    days: int = Query(30, enum=[7, 30, 90, 365]),
):
    """Precios históricos de un coin para simulación."""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{COINGECKO_BASE}/coins/{coin_id}/market_chart", params={
                "vs_currency": "usd",
                "days": days,
            })
            data = resp.json()

        prices = [{"timestamp": p[0], "price": p[1]} for p in data.get("prices", [])]
        return {"coin_id": coin_id, "days": days, "prices": prices}
    except Exception as e:
        logger.warning(f"CoinGecko historical error: {e}")
        return {"coin_id": coin_id, "days": days, "prices": [], "error": str(e)}


@router.get("/simulation/{profile}")
async def get_portfolio_simulation(
    profile: str = "moderado",
    days: int = Query(30, enum=[30, 90, 365]),
):
    """
    Simula la evolución del portfolio según un perfil de riesgo
    usando precios históricos reales de CoinGecko.
    """
    from app.services.portfolio.risk_profiles import RiskProfileType, get_profile, get_cash_target_pct

    try:
        profile_type = RiskProfileType(profile)
    except ValueError:
        profile_type = RiskProfileType.MODERADO

    risk_profile = get_profile(profile_type)
    cash_pct = get_cash_target_pct(risk_profile)

    # Mapeo de símbolos a IDs de CoinGecko
    symbol_to_id = {
        "BTC/USDT": "bitcoin", "ETH/USDT": "ethereum", "SOL/USDT": "solana",
        "BNB/USDT": "binancecoin", "AVAX/USDT": "avalanche-2",
        "LINK/USDT": "chainlink", "DOT/USDT": "polkadot",
        "ADA/USDT": "cardano", "XRP/USDT": "ripple",
    }

    # Obtener precios históricos para cada activo del perfil
    price_data = {}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            tasks = {}
            for alloc in risk_profile.allocations:
                coin_id = symbol_to_id.get(alloc.symbol)
                if coin_id:
                    tasks[alloc.symbol] = client.get(
                        f"{COINGECKO_BASE}/coins/{coin_id}/market_chart",
                        params={"vs_currency": "usd", "days": days},
                    )

            responses = {}
            for symbol, task in tasks.items():
                try:
                    responses[symbol] = await task
                except Exception:
                    pass

            for symbol, resp in responses.items():
                data = resp.json()
                price_data[symbol] = data.get("prices", [])

    except Exception as e:
        logger.warning(f"Historical data fetch error: {e}")

    # Simular evolución del portfolio con $10,000 iniciales
    initial_capital = 10000
    if not price_data:
        return {"profile": profile, "days": days, "evolution": [], "error": "No data"}

    # Encontrar la serie de precios más corta para alinear timestamps
    min_len = min(len(v) for v in price_data.values()) if price_data else 0
    if min_len == 0:
        return {"profile": profile, "days": days, "evolution": []}

    evolution = []
    for i in range(min_len):
        timestamp = list(price_data.values())[0][i][0]
        portfolio_value = initial_capital * (cash_pct / 100)  # Cash portion

        for alloc in risk_profile.allocations:
            if alloc.symbol in price_data and i < len(price_data[alloc.symbol]):
                initial_price = price_data[alloc.symbol][0][1]
                current_price = price_data[alloc.symbol][i][1]
                if initial_price > 0:
                    allocated_capital = initial_capital * (alloc.target_pct / 100)
                    portfolio_value += allocated_capital * (current_price / initial_price)

        evolution.append({
            "timestamp": timestamp,
            "value": round(portfolio_value, 2),
        })

    # Calcular métricas
    if len(evolution) > 1:
        final = evolution[-1]["value"]
        peak = max(e["value"] for e in evolution)
        trough_after_peak = min(e["value"] for e in evolution[evolution.index(max(evolution, key=lambda x: x["value"])):])
        max_dd = ((peak - trough_after_peak) / peak) * 100 if peak > 0 else 0
    else:
        final = initial_capital
        max_dd = 0

    return {
        "profile": profile,
        "profile_name": risk_profile.name,
        "days": days,
        "initial_capital": initial_capital,
        "final_value": final,
        "return_pct": round(((final - initial_capital) / initial_capital) * 100, 2),
        "max_drawdown_pct": round(max_dd, 2),
        "evolution": evolution,
    }
