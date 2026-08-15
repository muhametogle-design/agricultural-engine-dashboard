"""Permanent polygon-farm history and monthly analytics contracts."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.geojson import GeoJSONPolygon

HistoryEventType = Literal[
    "farm_created",
    "geometry_updated",
    "soil_test",
    "pathology_alert",
    "note",
]


class PolygonFarmCreate(BaseModel):
    field_name: str = Field(min_length=1, max_length=100)
    geometry: GeoJSONPolygon


class FarmHistoryCreate(BaseModel):
    event_type: HistoryEventType
    soil_ph: float | None = Field(default=None, ge=0, le=14)
    ec_ds_m: float | None = Field(default=None, ge=0, le=100)
    organic_matter_pct: float | None = Field(default=None, ge=0, le=100)
    nitrogen_ppm: float | None = Field(default=None, ge=0)
    phosphorus_ppm: float | None = Field(default=None, ge=0)
    potassium_ppm: float | None = Field(default=None, ge=0)
    pathology_alerts: list[str] = Field(default_factory=list, max_length=50)
    notes: str | None = Field(default=None, max_length=2000)
    metadata: dict = Field(default_factory=dict)
    observed_at: datetime | None = None


class FarmHistoryOut(BaseModel):
    id: UUID
    field_id: UUID
    event_type: HistoryEventType
    soil_ph: float | None
    ec_ds_m: float | None
    organic_matter_pct: float | None
    nitrogen_ppm: float | None
    phosphorus_ppm: float | None
    potassium_ppm: float | None
    pathology_alerts: list[str]
    notes: str | None
    metadata: dict
    observed_at: datetime
    created_by: UUID | None


class MonthlyFarmAnalytics(BaseModel):
    month: date
    farms: int
    soil_tests: int
    avg_ph: float | None
    avg_nitrogen_ppm: float | None
    avg_phosphorus_ppm: float | None
    avg_potassium_ppm: float | None
    pathology_alerts: int
