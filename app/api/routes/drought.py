"""Deterministic mock endpoints for Dawaad drought and pastoral indicators.

Values are realistic integration fixtures, not live CHIRPS, satellite, or official
water-point observations. The response says so explicitly to prevent accidental
operational misrepresentation.
"""
from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.schemas.drought import (
    ClimateStation,
    DroughtMetricsResponse,
    DroughtPeriod,
    RainfallRecord,
    VegetationIndex,
    VegetationStatus,
    WaterPoint,
    WaterPointFeature,
    WaterPointFeatureCollection,
    WaterPointStatus,
    WaterPointType,
)
from app.schemas.geojson import GeoJSONPoint

router = APIRouter(tags=["drought-monitoring"])

MOCK_DISCLAIMER = (
    "Deterministic mock data for software integration and training; "
    "not a live or official CHIRPS, VCI, NDVI, or water-point observation."
)
MOCK_LAST_UPDATED = datetime(2026, 8, 11, 6, 0, tzinfo=timezone.utc)
MOCK_PERIOD = DroughtPeriod(
    dekad="2026-08-D1",
    start_date=date(2026, 8, 1),
    end_date=date(2026, 8, 10),
)


def _rainfall(station_id: str, rainfall_mm: float, historical_mean_mm: float) -> RainfallRecord:
    anomaly = round((rainfall_mm - historical_mean_mm) / historical_mean_mm * 100, 1)
    return RainfallRecord(
        station_id=station_id,
        dekad=MOCK_PERIOD.dekad,
        rainfall_mm=rainfall_mm,
        historical_mean_mm=historical_mean_mm,
        anomaly_pct=anomaly,
    )


def _station(station_id: str, name: str, region: str, lat: float, lng: float) -> ClimateStation:
    return ClimateStation(
        id=station_id,
        name=name,
        region=region,
        lat=lat,
        lng=lng,
        last_updated=MOCK_LAST_UPDATED,
    )


_MOCK_DROUGHT: dict[str, dict] = {
    "sool": {
        "name": "Sool",
        "stations": [
            _station("SOOL-LAS-01", "Laascaanood Climate Station", "Sool", 8.4774, 47.3597),
            _station("SOOL-XUD-02", "Xudun Pastoral Gauge", "Sool", 9.2132, 47.1008),
            _station("SOOL-TAL-03", "Taleex Rain Gauge", "Sool", 9.1506, 48.4178),
        ],
        "rainfall": [
            _rainfall("SOOL-LAS-01", 3.8, 12.4),
            _rainfall("SOOL-XUD-02", 1.6, 9.8),
            _rainfall("SOOL-TAL-03", 2.4, 10.6),
        ],
        "vegetation": VegetationIndex(
            region_id="SOOL", vci_score=22.6, status=VegetationStatus.ALERT
        ),
    },
    "nugaal": {
        "name": "Nugaal",
        "stations": [
            _station("NUG-GAR-01", "Garoowe Climate Station", "Nugaal", 8.4054, 48.4845),
            _station("NUG-EYL-02", "Eyl Coastal Gauge", "Nugaal", 7.9803, 49.8164),
        ],
        "rainfall": [
            _rainfall("NUG-GAR-01", 5.4, 10.2),
            _rainfall("NUG-EYL-02", 7.1, 11.5),
        ],
        "vegetation": VegetationIndex(
            region_id="NUGAAL", vci_score=31.8, status=VegetationStatus.ALERT
        ),
    },
    "sanaag": {
        "name": "Sanaag",
        "stations": [
            _station("SAN-CEER-01", "Ceerigaabo Climate Station", "Sanaag", 10.6162, 47.3679),
            _station("SAN-BADH-02", "Badhan Pastoral Gauge", "Sanaag", 10.7138, 48.3374),
        ],
        "rainfall": [
            _rainfall("SAN-CEER-01", 11.8, 16.5),
            _rainfall("SAN-BADH-02", 8.7, 14.2),
        ],
        "vegetation": VegetationIndex(
            region_id="SANAAG", vci_score=42.1, status=VegetationStatus.WATCH
        ),
    },
    "togdheer": {
        "name": "Togdheer",
        "stations": [
            _station("TOG-BUR-01", "Burco Climate Station", "Togdheer", 9.5268, 45.5346),
            _station("TOG-OOD-02", "Oodweyne Rain Gauge", "Togdheer", 9.4092, 45.0645),
        ],
        "rainfall": [
            _rainfall("TOG-BUR-01", 2.9, 11.1),
            _rainfall("TOG-OOD-02", 1.7, 9.4),
        ],
        "vegetation": VegetationIndex(
            region_id="TOGDHEER", vci_score=18.4, status=VegetationStatus.SEVERE
        ),
    },
    "mudug": {
        "name": "Mudug",
        "stations": [
            _station("MUD-GAL-01", "Gaalkacyo Climate Station", "Mudug", 6.7697, 47.4308),
            _station("MUD-HOB-02", "Hobyo Coastal Gauge", "Mudug", 5.3505, 48.5268),
        ],
        "rainfall": [
            _rainfall("MUD-GAL-01", 6.2, 8.8),
            _rainfall("MUD-HOB-02", 9.5, 12.7),
        ],
        "vegetation": VegetationIndex(
            region_id="MUDUG", vci_score=37.2, status=VegetationStatus.WATCH
        ),
    },
}

_MOCK_WATER_POINTS: tuple[WaterPoint, ...] = (
    WaterPoint(
        id="WP-SOOL-001",
        name="Laascaanood Strategic Borehole",
        type=WaterPointType.BOREHOLE,
        status=WaterPointStatus.FUNCTIONAL,
        depth_meters=124,
        lat=8.4821,
        lng=47.3524,
    ),
    WaterPoint(
        id="WP-SOOL-002",
        name="Caynabo Community Berkad",
        type=WaterPointType.BERKAD,
        status=WaterPointStatus.STRESSED,
        depth_meters=4.5,
        lat=8.9538,
        lng=46.5537,
    ),
    WaterPoint(
        id="WP-SOOL-003",
        name="Xudun Shallow Well",
        type=WaterPointType.SHALLOW_WELL,
        status=WaterPointStatus.DRY,
        depth_meters=18,
        lat=9.2075,
        lng=47.1072,
    ),
    WaterPoint(
        id="WP-NUG-001",
        name="Garoowe Eastern Borehole",
        type=WaterPointType.BOREHOLE,
        status=WaterPointStatus.FUNCTIONAL,
        depth_meters=146,
        lat=8.4012,
        lng=48.4971,
    ),
    WaterPoint(
        id="WP-NUG-002",
        name="Eyl Plateau Berkad",
        type=WaterPointType.BERKAD,
        status=WaterPointStatus.STRESSED,
        depth_meters=5.2,
        lat=7.9894,
        lng=49.8052,
    ),
    WaterPoint(
        id="WP-SAN-001",
        name="Ceerigaabo Western Borehole",
        type=WaterPointType.BOREHOLE,
        status=WaterPointStatus.FUNCTIONAL,
        depth_meters=97,
        lat=10.6128,
        lng=47.3561,
    ),
    WaterPoint(
        id="WP-SAN-002",
        name="Badhan Shallow Well",
        type=WaterPointType.SHALLOW_WELL,
        status=WaterPointStatus.STRESSED,
        depth_meters=22,
        lat=10.7191,
        lng=48.3298,
    ),
    WaterPoint(
        id="WP-TOG-001",
        name="Burco South Shallow Well",
        type=WaterPointType.SHALLOW_WELL,
        status=WaterPointStatus.STRESSED,
        depth_meters=26,
        lat=9.5129,
        lng=45.5482,
    ),
    WaterPoint(
        id="WP-MUD-001",
        name="Gaalkacyo North Borehole",
        type=WaterPointType.BOREHOLE,
        status=WaterPointStatus.FUNCTIONAL,
        depth_meters=138,
        lat=6.7812,
        lng=47.4231,
    ),
    WaterPoint(
        id="WP-MUD-002",
        name="Hobyo Coastal Berkad",
        type=WaterPointType.BERKAD,
        status=WaterPointStatus.DRY,
        depth_meters=3.8,
        lat=5.3562,
        lng=48.5214,
    ),
)


@router.get("/drought-metrics", response_model=DroughtMetricsResponse)
async def drought_metrics(
    region: str = Query(..., min_length=2, max_length=80, description="Pastoral region name"),
) -> DroughtMetricsResponse:
    """Return one deterministic 10-day CHIRPS-compatible rainfall/VCI fixture."""
    key = region.strip().casefold()
    record = _MOCK_DROUGHT.get(key)
    if record is None:
        raise HTTPException(
            status_code=404,
            detail={
                "message": f"No mock drought metrics configured for region '{region}'.",
                "supportedRegions": sorted(item["name"] for item in _MOCK_DROUGHT.values()),
            },
        )
    return DroughtMetricsResponse(
        region=record["name"],
        period=MOCK_PERIOD,
        stations=record["stations"],
        rainfall_records=record["rainfall"],
        vegetation_indices=[record["vegetation"]],
        precipitation_product="CHIRPS-compatible 10-day precipitation mock",
        vegetation_product="VCI/NDVI-compatible vegetation condition mock",
        disclaimer=MOCK_DISCLAIMER,
    )


@router.get("/water-points", response_model=WaterPointFeatureCollection)
async def water_points() -> WaterPointFeatureCollection:
    """Return active mock registry entries as an RFC 7946 FeatureCollection."""
    features = [
        WaterPointFeature(
            id=point.id,
            geometry=GeoJSONPoint(coordinates=(point.lng, point.lat)),
            properties=point,
        )
        for point in _MOCK_WATER_POINTS
    ]
    return WaterPointFeatureCollection(features=features, disclaimer=MOCK_DISCLAIMER)
