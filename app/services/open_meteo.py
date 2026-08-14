"""Open-Meteo daily forecast client used by the irrigation advisory.

The integration requests precipitation, FAO reference evapotranspiration and
heat/wind indicators at the field centroid.  Open-Meteo currently provides up
to 16 forecast days without an API key.  Parsing is null-tolerant so an
individual day can be surfaced as a data gap instead of corrupting the water
balance.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

import httpx

from app.config import Settings
from app.core.errors import DomainValidationError, ExternalServiceError
from app.core.logging import get_logger
from app.services.http import get_json

log = get_logger(__name__)


@dataclass
class ForecastProfile:
    latitude: float
    longitude: float
    timezone: str
    elevation_m: float | None
    daily: list[dict[str, Any]] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


def _optional_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _daily_value(daily: dict[str, Any], key: str, index: int) -> Any:
    values = daily.get(key)
    if not isinstance(values, list) or index >= len(values):
        return None
    return values[index]


def parse_forecast(payload: dict[str, Any]) -> ForecastProfile:
    daily = payload.get("daily")
    times = daily.get("time") if isinstance(daily, dict) else None
    if not isinstance(times, list) or not times:
        raise ExternalServiceError(
            "Open-Meteo response missing daily.time",
            detail={"head": str(payload)[:400]},
        )

    parsed_days: list[dict[str, Any]] = []
    for index, raw_day in enumerate(times):
        try:
            day = date.fromisoformat(str(raw_day)).isoformat()
        except ValueError as exc:
            raise ExternalServiceError(
                "Open-Meteo returned an invalid forecast date",
                detail={"date": raw_day},
            ) from exc
        parsed_days.append(
            {
                "date": day,
                "precipitation_mm": _optional_number(_daily_value(daily, "precipitation_sum", index)),
                "precipitation_probability_pct": _optional_number(
                    _daily_value(daily, "precipitation_probability_max", index)
                ),
                "et0_mm": _optional_number(_daily_value(daily, "et0_fao_evapotranspiration", index)),
                "temperature_min_c": _optional_number(_daily_value(daily, "temperature_2m_min", index)),
                "temperature_max_c": _optional_number(_daily_value(daily, "temperature_2m_max", index)),
                "wind_gusts_max_kmh": _optional_number(_daily_value(daily, "wind_gusts_10m_max", index)),
            }
        )

    try:
        latitude = float(payload["latitude"])
        longitude = float(payload["longitude"])
    except (KeyError, TypeError, ValueError) as exc:
        raise ExternalServiceError("Open-Meteo response missing forecast coordinates") from exc

    return ForecastProfile(
        latitude=latitude,
        longitude=longitude,
        timezone=str(payload.get("timezone") or "UTC"),
        elevation_m=_optional_number(payload.get("elevation")),
        daily=parsed_days,
        raw=payload,
    )


async def fetch_forecast(
    client: httpx.AsyncClient,
    settings: Settings,
    lat: float,
    lon: float,
    *,
    forecast_days: int = 7,
) -> ForecastProfile:
    if not 1 <= forecast_days <= settings.forecast.max_days:
        raise DomainValidationError(f"forecast_days must be between 1 and {settings.forecast.max_days}")

    payload = await get_json(
        client,
        settings.open_meteo_base_url,
        params={
            "latitude": lat,
            "longitude": lon,
            "daily": settings.forecast.daily_parameters,
            "forecast_days": forecast_days,
            "timezone": "auto",
        },
        settings=settings.http,
    )
    profile = parse_forecast(payload)
    log.info(
        "open-meteo forecast (%.3f, %.3f): %d days, timezone=%s",
        lat,
        lon,
        len(profile.daily),
        profile.timezone,
    )
    return profile
