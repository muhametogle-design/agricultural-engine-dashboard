"""Dawaad climate/pastoral mock API contracts and fixture behavior."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import create_app
from app.schemas.drought import (
    ClimateStation,
    RainfallRecord,
    VegetationIndex,
    WaterPoint,
)

ROOT = Path(__file__).resolve().parents[1]


def _client() -> TestClient:
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    return TestClient(app)


def test_sool_drought_metrics_returns_ten_day_chirps_vci_mock():
    response = _client().get("/api/v1/drought-metrics", params={"region": "Sool"})
    assert response.status_code == 200
    payload = response.json()

    assert payload["region"] == "Sool"
    assert payload["period"] == {
        "dekad": "2026-08-D1",
        "startDate": "2026-08-01",
        "endDate": "2026-08-10",
        "windowDays": 10,
    }
    assert payload["dataMode"] == "mock"
    assert "CHIRPS-compatible 10-day" in payload["precipitationProduct"]
    assert "VCI/NDVI-compatible" in payload["vegetationProduct"]
    assert "not a live or official" in payload["disclaimer"]

    stations = payload["stations"]
    rainfall = payload["rainfallRecords"]
    vegetation = payload["vegetationIndices"]
    assert len(stations) == len(rainfall) == 3
    assert {record["stationId"] for record in rainfall} == {station["id"] for station in stations}
    assert all(station["region"] == "Sool" for station in stations)
    assert all(record["dekad"] == "2026-08-D1" for record in rainfall)
    for record in rainfall:
        expected = round(
            (record["rainfallMm"] - record["historicalMeanMm"])
            / record["historicalMeanMm"]
            * 100,
            1,
        )
        assert record["anomalyPct"] == expected

    assert vegetation == [{"regionId": "SOOL", "vciScore": 22.6, "status": "Alert"}]


@pytest.mark.parametrize("region", ["sool", " SOOL ", "Sool"])
def test_drought_region_lookup_is_case_and_whitespace_insensitive(region: str):
    response = _client().get("/api/v1/drought-metrics", params={"region": region})
    assert response.status_code == 200
    assert response.json()["region"] == "Sool"


def test_drought_endpoint_lists_supported_regions_for_unknown_region():
    response = _client().get("/api/v1/drought-metrics", params={"region": "Awdal"})
    assert response.status_code == 404
    detail = response.json()["detail"]
    assert detail["supportedRegions"] == ["Mudug", "Nugaal", "Sanaag", "Sool", "Togdheer"]


def test_water_points_are_geojson_features_with_typed_properties():
    response = _client().get("/api/v1/water-points")
    assert response.status_code == 200
    payload = response.json()
    assert payload["type"] == "FeatureCollection"
    assert payload["dataMode"] == "mock"
    assert "not a live or official" in payload["disclaimer"]
    assert len(payload["features"]) == 10

    valid_types = {"Borehole", "Shallow Well", "Berkad"}
    valid_statuses = {"Functional", "Stressed", "Dry"}
    statuses = set()
    for feature in payload["features"]:
        assert feature["type"] == "Feature"
        assert feature["id"] == feature["properties"]["id"]
        assert feature["geometry"]["type"] == "Point"
        properties = feature["properties"]
        assert set(properties) == {"id", "name", "type", "status", "depthMeters", "lat", "lng"}
        assert properties["type"] in valid_types
        assert properties["status"] in valid_statuses
        assert feature["geometry"]["coordinates"] == [properties["lng"], properties["lat"]]
        statuses.add(properties["status"])
    assert statuses == valid_statuses


def test_drought_schema_constraints_reject_invalid_monitoring_values():
    timestamp = datetime(2026, 8, 11, tzinfo=timezone.utc)
    with pytest.raises(ValidationError):
        ClimateStation(id="x", name="Bad", region="Sool", lat=91, lng=47, last_updated=timestamp)
    with pytest.raises(ValidationError):
        RainfallRecord(
            station_id="SOOL-LAS-01",
            dekad="August-1",
            rainfall_mm=-1,
            historical_mean_mm=0,
            anomaly_pct=-101,
        )
    with pytest.raises(ValidationError):
        VegetationIndex(region_id="SOOL", vci_score=101, status="Alert")
    with pytest.raises(ValidationError):
        WaterPoint(
            id="WP-1",
            name="Invalid",
            type="River",
            status="Unknown",
            depth_meters=-2,
            lat=8,
            lng=47,
        )


def test_database_and_typescript_contracts_are_checked_in():
    migration = (ROOT / "migrations/versions/0006_drought_monitoring.py").read_text()
    init_sql = (ROOT / "db/init.sql").read_text()
    interfaces = (ROOT / "app/web/drought.types.ts").read_text()
    client = (ROOT / "app/web/drought.api.ts").read_text()

    for marker in (
        "CREATE TABLE climate_stations",
        "CREATE TABLE rainfall_records",
        "CREATE TABLE vegetation_indices",
        "CREATE TABLE pastoral_water_points",
        "0005_farm_history_analytics",
        "ST_MakePoint(lng, lat)",
    ):
        assert marker in migration
    for table in ("climate_stations", "rainfall_records", "vegetation_indices", "pastoral_water_points"):
        assert f"CREATE TABLE IF NOT EXISTS {table}" in init_sql
    for interface in ("ClimateStation", "RainfallRecord", "VegetationIndex", "WaterPoint"):
        assert f"interface {interface}" in interfaces
    assert '"Borehole" | "Shallow Well" | "Berkad"' in interfaces
    assert '"Functional" | "Stressed" | "Dry"' in interfaces
    assert "/api/v1/drought-metrics?region=" in client
    assert '"/api/v1/water-points"' in client
