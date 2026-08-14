from __future__ import annotations

import pytest

from app.core.errors import DomainValidationError
from app.engines.irrigation import build_irrigation_advisory, resolve_crop_coefficient, supported_crops


def _weather():
    return [
        {
            "date": "2026-08-14",
            "precipitation_mm": 0,
            "et0_mm": 6,
            "temperature_min_c": 25,
            "temperature_max_c": 37,
            "wind_gusts_max_kmh": 20,
        },
        {
            "date": "2026-08-15",
            "precipitation_mm": 0,
            "et0_mm": 6,
            "temperature_min_c": 26,
            "temperature_max_c": 39,
            "wind_gusts_max_kmh": 40,
        },
        {
            "date": "2026-08-16",
            "precipitation_mm": 10,
            "et0_mm": 4,
            "temperature_min_c": 24,
            "temperature_max_c": 32,
            "wind_gusts_max_kmh": 18,
        },
        {
            "date": "2026-08-17",
            "precipitation_mm": 0,
            "et0_mm": 6,
            "temperature_min_c": 25,
            "temperature_max_c": 35,
            "wind_gusts_max_kmh": 20,
        },
    ]


def test_threshold_schedule_and_field_volume():
    result = build_irrigation_advisory(
        _weather(),
        area_ha=2.0,
        crop="sorghum",
        growth_stage="mid_season",
        crop_coefficient=1.0,
        irrigation_efficiency=0.8,
        management_allowed_depletion_mm=10.0,
        effective_rainfall_fraction=0.8,
        pump_flow_m3_per_hour=20.0,
    )

    assert [day["action"] for day in result["schedule"]] == [
        "monitor",
        "irrigate",
        "rain_sufficient",
        "monitor",
    ]
    event = result["schedule"][1]
    assert event["net_irrigation_mm"] == 12.0
    assert event["gross_irrigation_mm"] == 15.0
    assert event["irrigation_volume_m3"] == 300.0  # 15 mm * 2 ha * 10
    assert event["pump_hours"] == 15.0
    assert event["risk_flags"] == ["heat_stress", "high_wind"]
    assert result["summary"]["irrigation_events"] == 1
    assert result["summary"]["total_crop_water_demand_mm"] == 22.0
    assert result["summary"]["ending_soil_water_deficit_mm"] == 6.0


def test_rule_lookup_and_explicit_override():
    assert "sorghum" in supported_crops()
    assert resolve_crop_coefficient("pearl millet", "mid_season") == 1.0
    assert resolve_crop_coefficient("locally-calibrated", "initial", override=0.62) == 0.62


def test_unknown_crop_and_invalid_efficiency_rejected():
    with pytest.raises(DomainValidationError) as exc:
        resolve_crop_coefficient("coffee", "mid_season")
    assert "supported_crops" in exc.value.detail

    with pytest.raises(DomainValidationError):
        build_irrigation_advisory(
            _weather(),
            area_ha=1,
            crop="sorghum",
            growth_stage="initial",
            irrigation_efficiency=0.2,
        )


def test_missing_forecast_driver_is_auditable_data_gap():
    result = build_irrigation_advisory(
        [{"date": "2026-08-14", "precipitation_mm": None, "et0_mm": 5.0}],
        area_ha=1,
        crop="maize",
        growth_stage="development",
    )
    assert result["schedule"][0]["action"] == "data_gap"
    assert result["schedule"][0]["crop_et_mm"] == 3.5  # known ET0 is still reported
    assert result["summary"]["total_crop_water_demand_mm"] == 3.5
    assert result["summary"]["usable_days"] == 0
    assert result["warnings"]
