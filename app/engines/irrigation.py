"""Forecast-driven irrigation scheduling.

The engine is deliberately pure: callers provide daily weather values and it
returns an auditable root-zone water balance.  Daily crop evapotranspiration is
ETc = Kc * ET0.  A configurable fraction of forecast precipitation is treated
as effective rainfall.  Irrigation is scheduled when projected root-zone
depletion reaches the management trigger; the gross application accounts for
system efficiency and is converted to field volume (1 mm over 1 ha = 10 m³).

This is decision support, not closed-loop irrigation control.  Crop
coefficients and the depletion trigger require local calibration.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from app.core.errors import ConfigError, DomainValidationError

RULES_PATH = Path(__file__).resolve().parent / "rules" / "irrigation_rules.yaml"
GROWTH_STAGES = ("initial", "development", "mid_season", "late_season")


@lru_cache(maxsize=4)
def load_irrigation_rules(path: str = str(RULES_PATH)) -> dict[str, Any]:
    with open(path, encoding="utf-8") as fh:
        rules = yaml.safe_load(fh)
    if not isinstance(rules, dict) or not isinstance(rules.get("crops"), dict):
        raise ConfigError("irrigation rules must define a crops mapping")
    if any(stage not in rules.get("growth_stages", []) for stage in GROWTH_STAGES):
        raise ConfigError("irrigation rules are missing a required growth stage")
    for crop, stages in rules["crops"].items():
        if not isinstance(stages, dict) or any(stage not in stages for stage in GROWTH_STAGES):
            raise ConfigError(f"irrigation crop '{crop}' is missing a growth-stage coefficient")
        try:
            coefficients = [float(stages[stage]) for stage in GROWTH_STAGES]
        except (TypeError, ValueError) as exc:
            raise ConfigError(f"irrigation crop '{crop}' has a non-numeric coefficient") from exc
        if any(not 0.1 <= coefficient <= 2.0 for coefficient in coefficients):
            raise ConfigError(f"irrigation crop '{crop}' has a coefficient outside 0.1–2.0")
    return rules


def supported_crops() -> list[str]:
    return sorted(load_irrigation_rules()["crops"])


def resolve_crop_coefficient(crop: str, growth_stage: str, override: float | None = None) -> float:
    """Resolve a crop coefficient, allowing an explicit calibrated override."""
    if growth_stage not in GROWTH_STAGES:
        raise DomainValidationError(
            f"unsupported growth stage '{growth_stage}'",
            detail={"supported_growth_stages": list(GROWTH_STAGES)},
        )
    if override is not None:
        if not 0.1 <= override <= 2.0:
            raise DomainValidationError("crop_coefficient must be between 0.1 and 2.0")
        return float(override)

    normalized = crop.strip().lower().replace(" ", "_").replace("-", "_")
    crop_rules = load_irrigation_rules()["crops"]
    if normalized not in crop_rules:
        raise DomainValidationError(
            f"unsupported irrigation crop '{crop}'",
            detail={"supported_crops": sorted(crop_rules)},
        )
    return float(crop_rules[normalized][growth_stage])


def _number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def build_irrigation_advisory(
    daily_weather: list[dict[str, Any]],
    *,
    area_ha: float,
    crop: str,
    growth_stage: str,
    irrigation_efficiency: float = 0.85,
    management_allowed_depletion_mm: float = 20.0,
    initial_soil_water_deficit_mm: float = 0.0,
    effective_rainfall_fraction: float = 0.80,
    crop_coefficient: float | None = None,
    pump_flow_m3_per_hour: float | None = None,
    heat_stress_temp_c: float = 38.0,
    heavy_rain_mm: float = 20.0,
    high_wind_kmh: float = 35.0,
) -> dict[str, Any]:
    """Build a threshold-based irrigation schedule from a daily forecast.

    Depletion is reset to zero after a scheduled event, representing an
    application that refills the managed root-zone deficit.  Rainfall in excess
    of ETc + prior depletion is not banked beyond field capacity.
    """
    if area_ha <= 0:
        raise DomainValidationError("field area must be positive")
    if not daily_weather:
        raise DomainValidationError("at least one forecast day is required")
    if not 0.30 <= irrigation_efficiency <= 1.0:
        raise DomainValidationError("irrigation_efficiency must be between 0.30 and 1.0")
    if not 0.0 <= effective_rainfall_fraction <= 1.0:
        raise DomainValidationError("effective_rainfall_fraction must be between 0 and 1")
    if not 1.0 <= management_allowed_depletion_mm <= 200.0:
        raise DomainValidationError("management_allowed_depletion_mm must be between 1 and 200")
    if not 0.0 <= initial_soil_water_deficit_mm <= 300.0:
        raise DomainValidationError("initial_soil_water_deficit_mm must be between 0 and 300")
    if pump_flow_m3_per_hour is not None and pump_flow_m3_per_hour <= 0:
        raise DomainValidationError("pump_flow_m3_per_hour must be positive")

    crop_name = crop.strip().lower().replace(" ", "_").replace("-", "_")
    kc = resolve_crop_coefficient(crop_name, growth_stage, crop_coefficient)
    depletion = float(initial_soil_water_deficit_mm)
    schedule: list[dict[str, Any]] = []
    warnings: list[str] = []
    usable_days = 0

    total_rain = 0.0
    total_effective_rain = 0.0
    total_etc = 0.0
    total_net_irrigation = 0.0
    total_gross_irrigation = 0.0
    total_volume = 0.0
    first_irrigation_date: str | None = None
    peak_pump_hours: float | None = None

    for weather in daily_weather:
        day = str(weather.get("date", ""))
        rain = _number(weather.get("precipitation_mm"))
        et0 = _number(weather.get("et0_mm"))
        tmin = _number(weather.get("temperature_min_c"))
        tmax = _number(weather.get("temperature_max_c"))
        wind = _number(weather.get("wind_gusts_max_kmh"))
        probability = _number(weather.get("precipitation_probability_pct"))
        flags: list[str] = []

        if tmax is not None and tmax >= heat_stress_temp_c:
            flags.append("heat_stress")
        if rain is not None and rain >= heavy_rain_mm:
            flags.append("heavy_rain")
        if wind is not None and wind >= high_wind_kmh:
            flags.append("high_wind")

        if rain is not None and rain < 0:
            warnings.append(f"{day or 'forecast day'} returned negative precipitation; clamped to zero")
        if et0 is not None and et0 < 0:
            warnings.append(f"{day or 'forecast day'} returned negative ET0; clamped to zero")
        normalized_rain = max(rain, 0.0) if rain is not None else None
        normalized_et0 = max(et0, 0.0) if et0 is not None else None
        known_etc = normalized_et0 * kc if normalized_et0 is not None else None
        known_effective_rain = (
            normalized_rain * effective_rainfall_fraction if normalized_rain is not None else None
        )
        if normalized_rain is not None:
            total_rain += normalized_rain
            total_effective_rain += known_effective_rain or 0.0
        if known_etc is not None:
            total_etc += known_etc

        if rain is None or et0 is None:
            missing = [name for name, value in (("precipitation", rain), ("ET0", et0)) if value is None]
            warnings.append(
                f"{day or 'forecast day'} missing {' and '.join(missing)}; no irrigation decision made"
            )
            schedule.append(
                {
                    "date": day,
                    "precipitation_mm": normalized_rain,
                    "precipitation_probability_pct": probability,
                    "et0_mm": normalized_et0,
                    "crop_et_mm": round(known_etc, 2) if known_etc is not None else None,
                    "effective_rain_mm": (
                        round(known_effective_rain, 2) if known_effective_rain is not None else None
                    ),
                    "projected_depletion_mm": round(depletion, 2),
                    "net_irrigation_mm": 0.0,
                    "gross_irrigation_mm": 0.0,
                    "irrigation_volume_m3": 0.0,
                    "pump_hours": None,
                    "ending_depletion_mm": round(depletion, 2),
                    "temperature_min_c": tmin,
                    "temperature_max_c": tmax,
                    "wind_gusts_max_kmh": wind,
                    "action": "data_gap",
                    "risk_flags": flags,
                }
            )
            continue

        usable_days += 1
        # Both values are known in this branch; aliases keep the arithmetic readable.
        rain = normalized_rain or 0.0
        et0 = normalized_et0 or 0.0
        etc = known_etc or 0.0
        effective_rain = known_effective_rain or 0.0
        projected = max(0.0, depletion + etc - effective_rain)
        should_irrigate = projected >= management_allowed_depletion_mm

        net_mm = projected if should_irrigate else 0.0
        gross_mm = net_mm / irrigation_efficiency if should_irrigate else 0.0
        volume_m3 = gross_mm * area_ha * 10.0
        pump_hours = volume_m3 / pump_flow_m3_per_hour if should_irrigate and pump_flow_m3_per_hour else None
        ending = 0.0 if should_irrigate else projected

        if should_irrigate:
            action = "irrigate"
            first_irrigation_date = first_irrigation_date or day
        elif effective_rain >= etc and rain > 0:
            action = "rain_sufficient"
        else:
            action = "monitor"

        total_net_irrigation += net_mm
        total_gross_irrigation += gross_mm
        total_volume += volume_m3
        if pump_hours is not None:
            peak_pump_hours = max(peak_pump_hours or 0.0, pump_hours)

        schedule.append(
            {
                "date": day,
                "precipitation_mm": round(rain, 2),
                "precipitation_probability_pct": probability,
                "et0_mm": round(et0, 2),
                "crop_et_mm": round(etc, 2),
                "effective_rain_mm": round(effective_rain, 2),
                "projected_depletion_mm": round(projected, 2),
                "net_irrigation_mm": round(net_mm, 2),
                "gross_irrigation_mm": round(gross_mm, 2),
                "irrigation_volume_m3": round(volume_m3, 2),
                "pump_hours": round(pump_hours, 2) if pump_hours is not None else None,
                "ending_depletion_mm": round(ending, 2),
                "temperature_min_c": tmin,
                "temperature_max_c": tmax,
                "wind_gusts_max_kmh": wind,
                "action": action,
                "risk_flags": flags,
            }
        )
        depletion = ending

    event_days = [day for day in schedule if day["action"] == "irrigate"]
    if event_days:
        first = event_days[0]
        recommendation = (
            f"Irrigate first on {first['date']}: apply {first['gross_irrigation_mm']:.1f} mm "
            f"({first['irrigation_volume_m3']:.1f} m³ over {area_ha:.2f} ha)."
        )
    elif usable_days:
        recommendation = (
            "No irrigation event crosses the management trigger in the forecast window; "
            f"monitor the ending deficit ({depletion:.1f} mm)."
        )
    else:
        recommendation = "Forecast coverage is insufficient to produce an irrigation recommendation."

    rules = load_irrigation_rules()
    return {
        "crop": crop_name,
        "growth_stage": growth_stage,
        "crop_coefficient": round(kc, 3),
        "area_hectares": round(area_ha, 4),
        "schedule": schedule,
        "summary": {
            "forecast_days": len(schedule),
            "usable_days": usable_days,
            "irrigation_events": len(event_days),
            "first_irrigation_date": first_irrigation_date,
            "total_forecast_rain_mm": round(total_rain, 2),
            "total_effective_rain_mm": round(total_effective_rain, 2),
            "total_crop_water_demand_mm": round(total_etc, 2),
            "total_net_irrigation_mm": round(total_net_irrigation, 2),
            "total_gross_irrigation_mm": round(total_gross_irrigation, 2),
            "total_irrigation_volume_m3": round(total_volume, 2),
            "ending_soil_water_deficit_mm": round(depletion, 2),
            "peak_daily_pump_hours": round(peak_pump_hours, 2) if peak_pump_hours is not None else None,
            "recommendation": recommendation,
        },
        "assumptions": {
            "method": "daily_root_zone_depletion_threshold_v1",
            "water_balance": "ETc = Kc × ET0; effective rain offsets depletion; irrigation refills managed deficit",
            "irrigation_efficiency": irrigation_efficiency,
            "effective_rainfall_fraction": effective_rainfall_fraction,
            "management_allowed_depletion_mm": management_allowed_depletion_mm,
            "initial_soil_water_deficit_mm": initial_soil_water_deficit_mm,
            "pump_flow_m3_per_hour": pump_flow_m3_per_hour,
            "crop_coefficient_source": rules.get("source"),
            "rules_version": rules.get("version"),
        },
        "warnings": warnings,
    }
