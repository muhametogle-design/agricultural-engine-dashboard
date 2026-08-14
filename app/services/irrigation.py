"""Irrigation advisory orchestration: field geometry -> forecast -> engine."""

from __future__ import annotations

from datetime import UTC, datetime

import httpx

from app.config import Settings
from app.core.spatial import geom_from_geojson
from app.engines.irrigation import build_irrigation_advisory, resolve_crop_coefficient
from app.schemas.irrigation import IrrigationAdvisoryRequest
from app.services.open_meteo import fetch_forecast


async def generate_irrigation_advisory(
    client: httpx.AsyncClient,
    settings: Settings,
    field: dict,
    request: IrrigationAdvisoryRequest,
) -> dict:
    # Fail fast on unsupported crop/stage input before spending an external API call.
    resolved_kc = resolve_crop_coefficient(request.crop, request.growth_stage, request.crop_coefficient)
    boundary = geom_from_geojson(field["boundary"])
    centroid = boundary.centroid
    forecast = await fetch_forecast(
        client,
        settings,
        centroid.y,
        centroid.x,
        forecast_days=request.forecast_days,
    )

    result = build_irrigation_advisory(
        forecast.daily[: request.forecast_days],
        area_ha=float(field["area_hectares"]),
        crop=request.crop,
        growth_stage=request.growth_stage,
        irrigation_efficiency=request.irrigation_efficiency,
        management_allowed_depletion_mm=request.management_allowed_depletion_mm,
        initial_soil_water_deficit_mm=request.initial_soil_water_deficit_mm,
        effective_rainfall_fraction=settings.irrigation.effective_rainfall_fraction,
        crop_coefficient=resolved_kc,
        pump_flow_m3_per_hour=request.pump_flow_m3_per_hour,
        heat_stress_temp_c=settings.irrigation.heat_stress_temp_c,
        heavy_rain_mm=settings.irrigation.heavy_rain_mm,
        high_wind_kmh=settings.irrigation.high_wind_kmh,
    )
    if len(forecast.daily) < request.forecast_days:
        result["warnings"].append(
            f"Forecast provider returned {len(forecast.daily)} of {request.forecast_days} requested days"
        )
    result.update(
        {
            "field_id": field.get("id"),
            "source": {
                "provider": "Open-Meteo",
                "provider_url": "https://open-meteo.com/",
                "model": "best_match",
                "timezone": forecast.timezone,
                "requested_latitude": centroid.y,
                "requested_longitude": centroid.x,
                "latitude": forecast.latitude,
                "longitude": forecast.longitude,
                "elevation_m": forecast.elevation_m,
                "retrieved_at": datetime.now(UTC),
            },
        }
    )
    return result
