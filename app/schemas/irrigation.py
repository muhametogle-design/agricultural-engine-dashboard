"""Irrigation advisory API contracts."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

GrowthStage = Literal["initial", "development", "mid_season", "late_season"]
IrrigationAction = Literal["irrigate", "monitor", "rain_sufficient", "data_gap"]


class IrrigationAdvisoryRequest(BaseModel):
    crop: str = Field(default="sorghum", min_length=2, max_length=64)
    growth_stage: GrowthStage = "mid_season"
    forecast_days: int = Field(default=7, ge=1, le=16)
    irrigation_efficiency: float = Field(default=0.85, ge=0.30, le=1.0)
    management_allowed_depletion_mm: float = Field(default=20.0, ge=1.0, le=200.0)
    initial_soil_water_deficit_mm: float = Field(default=0.0, ge=0.0, le=300.0)
    crop_coefficient: float | None = Field(
        default=None,
        ge=0.1,
        le=2.0,
        description="Optional locally calibrated Kc; otherwise the crop/stage rule is used.",
    )
    pump_flow_m3_per_hour: float | None = Field(default=None, gt=0, le=10_000)


class DailyIrrigationAdvice(BaseModel):
    date: date
    precipitation_mm: float | None
    precipitation_probability_pct: float | None = None
    et0_mm: float | None
    crop_et_mm: float | None
    effective_rain_mm: float | None
    projected_depletion_mm: float
    net_irrigation_mm: float
    gross_irrigation_mm: float
    irrigation_volume_m3: float
    pump_hours: float | None
    ending_depletion_mm: float
    temperature_min_c: float | None
    temperature_max_c: float | None
    wind_gusts_max_kmh: float | None
    action: IrrigationAction
    risk_flags: list[str] = Field(default_factory=list)


class IrrigationSummary(BaseModel):
    forecast_days: int
    usable_days: int
    irrigation_events: int
    first_irrigation_date: date | None
    total_forecast_rain_mm: float
    total_effective_rain_mm: float
    total_crop_water_demand_mm: float
    total_net_irrigation_mm: float
    total_gross_irrigation_mm: float
    total_irrigation_volume_m3: float
    ending_soil_water_deficit_mm: float
    peak_daily_pump_hours: float | None
    recommendation: str


class ForecastSource(BaseModel):
    provider: str
    provider_url: str
    model: str
    timezone: str
    requested_latitude: float
    requested_longitude: float
    latitude: float
    longitude: float
    elevation_m: float | None
    retrieved_at: datetime


class IrrigationAdvisoryReport(BaseModel):
    field_id: UUID | None = None
    crop: str
    growth_stage: GrowthStage
    crop_coefficient: float
    area_hectares: float
    schedule: list[DailyIrrigationAdvice]
    summary: IrrigationSummary
    assumptions: dict
    source: ForecastSource
    warnings: list[str] = Field(default_factory=list)
