from __future__ import annotations

import httpx
import pytest
import respx

from app.core.errors import ExternalServiceError
from app.services.open_meteo import fetch_forecast, parse_forecast
from tests.conftest import CENTER_LAT, CENTER_LON


def make_forecast_payload() -> dict:
    return {
        "latitude": 2.05,
        "longitude": 45.32,
        "elevation": 34.0,
        "timezone": "Africa/Mogadishu",
        "daily": {
            "time": ["2026-08-14", "2026-08-15", "2026-08-16"],
            "precipitation_sum": [0.0, 4.2, None],
            "precipitation_probability_max": [5, 70, None],
            "et0_fao_evapotranspiration": [5.8, 5.2, None],
            "temperature_2m_min": [25.0, 24.5, 25.2],
            "temperature_2m_max": [36.0, 34.0, 37.0],
            "wind_gusts_10m_max": [28.0, 31.0, 26.0],
        },
    }


def test_parse_forecast_preserves_null_days():
    result = parse_forecast(make_forecast_payload())
    assert result.timezone == "Africa/Mogadishu"
    assert result.elevation_m == 34.0
    assert result.daily[1]["precipitation_mm"] == 4.2
    assert result.daily[2]["et0_mm"] is None
    assert result.daily[0]["date"] == "2026-08-14"


@respx.mock
async def test_fetch_forecast_uses_daily_agronomy_drivers(settings):
    route = respx.get(settings.open_meteo_base_url).mock(
        return_value=httpx.Response(200, json=make_forecast_payload())
    )
    async with httpx.AsyncClient(timeout=5.0) as client:
        result = await fetch_forecast(client, settings, CENTER_LAT, CENTER_LON, forecast_days=3)

    assert len(result.daily) == 3
    request = route.calls[0].request
    assert request.url.params["forecast_days"] == "3"
    assert "et0_fao_evapotranspiration" in request.url.params["daily"]
    assert request.url.params["timezone"] == "auto"


def test_malformed_forecast_raises_typed_error():
    with pytest.raises(ExternalServiceError):
        parse_forecast({"latitude": CENTER_LAT, "longitude": CENTER_LON})


def test_invalid_forecast_date_raises_typed_error():
    payload = make_forecast_payload()
    payload["daily"]["time"][0] = "not-a-date"
    with pytest.raises(ExternalServiceError):
        parse_forecast(payload)


@respx.mock
async def test_invalid_json_is_mapped_to_external_service_error(settings):
    respx.get(settings.open_meteo_base_url).mock(
        return_value=httpx.Response(200, text="upstream proxy returned HTML")
    )
    async with httpx.AsyncClient(timeout=5.0) as client:
        with pytest.raises(ExternalServiceError, match="invalid JSON"):
            await fetch_forecast(client, settings, CENTER_LAT, CENTER_LON, forecast_days=3)
