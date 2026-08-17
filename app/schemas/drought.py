"""Typed contracts for Dawaad climate and pastoral monitoring APIs."""
from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.schemas.geojson import GeoJSONPoint, Lat, Lon


class CamelModel(BaseModel):
    """Use idiomatic Python attributes while preserving the requested JSON names."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        serialize_by_alias=True,
        extra="forbid",
    )


class WaterPointType(str, Enum):
    BOREHOLE = "Borehole"
    SHALLOW_WELL = "Shallow Well"
    BERKAD = "Berkad"


class WaterPointStatus(str, Enum):
    FUNCTIONAL = "Functional"
    STRESSED = "Stressed"
    DRY = "Dry"


class VegetationStatus(str, Enum):
    NORMAL = "Normal"
    WATCH = "Watch"
    ALERT = "Alert"
    SEVERE = "Severe"


class ClimateStation(CamelModel):
    id: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=160)
    region: str = Field(min_length=2, max_length=80)
    lat: Lat
    lng: Lon
    last_updated: AwareDatetime


class RainfallRecord(CamelModel):
    station_id: str = Field(min_length=2, max_length=64)
    dekad: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])-D[123]$")
    rainfall_mm: float = Field(ge=0, le=2000)
    historical_mean_mm: float = Field(gt=0, le=2000)
    anomaly_pct: float = Field(ge=-100, le=5000)


class VegetationIndex(CamelModel):
    region_id: str = Field(min_length=2, max_length=64)
    vci_score: float = Field(ge=0, le=100)
    status: VegetationStatus


class WaterPoint(CamelModel):
    id: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=160)
    type: WaterPointType
    status: WaterPointStatus
    depth_meters: float = Field(ge=0, le=2000)
    lat: Lat
    lng: Lon


class DroughtPeriod(CamelModel):
    dekad: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])-D[123]$")
    start_date: date
    end_date: date
    window_days: Literal[10] = 10


class DroughtMetricsResponse(CamelModel):
    region: str
    period: DroughtPeriod
    stations: list[ClimateStation]
    rainfall_records: list[RainfallRecord]
    vegetation_indices: list[VegetationIndex]
    precipitation_product: str
    vegetation_product: str
    data_mode: Literal["mock"] = "mock"
    disclaimer: str


class WaterPointFeature(CamelModel):
    type: Literal["Feature"] = "Feature"
    id: str
    geometry: GeoJSONPoint
    properties: WaterPoint


class WaterPointFeatureCollection(CamelModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[WaterPointFeature]
    data_mode: Literal["mock"] = "mock"
    disclaimer: str
