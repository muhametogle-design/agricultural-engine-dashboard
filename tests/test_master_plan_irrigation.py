from __future__ import annotations

import uuid
from datetime import UTC, datetime

import httpx

from app.config import Settings
from app.engines.terrain import NullTerrainProvider
from app.schemas.irrigation import IrrigationAdvisoryRequest
from app.schemas.plans import MasterPlanOptions
from app.services.master_plan import generate_master_plan
from tests.conftest import make_square_polygon
from tests.test_open_meteo_service import make_forecast_payload

TENANT_ID = uuid.uuid4()
FIELD_ID = uuid.uuid4()


class Fields:
    async def get(self, field_id, tenant_id):
        assert field_id == FIELD_ID and tenant_id == TENANT_ID
        return {
            "id": FIELD_ID,
            "field_name": "Forecast block",
            "boundary": make_square_polygon(),
            "center_point": {"type": "Point", "coordinates": [45.318, 2.046]},
            "area_hectares": 4.8,
            "perimeter_meters": 880.0,
        }


class Environmental:
    async def get(self, field_id):
        assert field_id == FIELD_ID
        return {
            "age_seconds": 0,
            "ph_water": 7.2,
            "clay_percentage": 22,
            "sand_percentage": 60,
            "silt_percentage": 18,
            "soil_organic_carbon": 9,
            "nitrogen_content": 0.8,
            "cec_mmolc_kg": 14,
            "avg_annual_rainfall_mm": 330,
            "avg_temp_celsius": 27,
            "annual_et0_mm": 1800,
            "raw_nasa_power_json": {"properties": {"parameter": {"T2M_MIN": {"JAN": 21, "FEB": 22}}}},
        }


class Ves:
    async def list_for_field(self, field_id):
        return []


class Plans:
    saved = None

    async def create(self, field_id, plan):
        self.saved = plan
        return {"id": uuid.uuid4(), "generated_at": datetime.now(UTC)}


class Repos:
    def __init__(self):
        self.fields = Fields()
        self.environmental = Environmental()
        self.ves = Ves()
        self.plans = Plans()


def options() -> MasterPlanOptions:
    return MasterPlanOptions(
        run_well_siting=False,
        run_zoning=False,
        irrigation_advisory=IrrigationAdvisoryRequest(
            crop="sorghum", forecast_days=3, management_allowed_depletion_mm=10
        ),
    )


async def test_master_plan_embeds_and_persists_live_advisory():
    repos = Repos()
    transport = httpx.MockTransport(lambda request: httpx.Response(200, json=make_forecast_payload()))
    async with httpx.AsyncClient(transport=transport) as client:
        report = await generate_master_plan(
            repos,
            Settings(),
            client,
            NullTerrainProvider(),
            FIELD_ID,
            options(),
            tenant_id=TENANT_ID,
        )

    assert report["irrigation_advisory"]["source"]["provider"] == "Open-Meteo"
    assert report["irrigation_advisory"]["summary"]["forecast_days"] == 3
    assert repos.plans.saved["irrigation_advisory"] == report["irrigation_advisory"]


async def test_forecast_outage_degrades_master_plan_to_warning():
    repos = Repos()
    settings = Settings(http={"max_retries": 1, "timeout_s": 1})
    transport = httpx.MockTransport(lambda request: httpx.Response(503, text="outage"))
    async with httpx.AsyncClient(transport=transport) as client:
        report = await generate_master_plan(
            repos,
            settings,
            client,
            NullTerrainProvider(),
            FIELD_ID,
            options(),
            tenant_id=TENANT_ID,
        )

    assert report["irrigation_advisory"] is None
    assert repos.plans.saved["irrigation_advisory"] is None
    assert any("Live irrigation forecast unavailable" in warning for warning in report["warnings"])
