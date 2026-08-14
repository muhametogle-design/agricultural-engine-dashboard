from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

import httpx
from fastapi.testclient import TestClient

from app.api import deps
from app.config import Settings
from app.main import create_app
from tests.conftest import make_square_polygon
from tests.test_open_meteo_service import make_forecast_payload

TENANT_ID = uuid.uuid4()
FIELD_ID = uuid.uuid4()


class FakeFields:
    async def get(self, field_id, tenant_id):
        assert field_id == FIELD_ID
        assert tenant_id == TENANT_ID
        return {
            "id": FIELD_ID,
            "boundary": make_square_polygon(),
            "area_hectares": 4.8,
        }


class FakeIrrigationAdvisories:
    def __init__(self):
        self.store = {}

    async def create(self, field_id, advisory):
        advisory_id = uuid.uuid4()
        schedule = advisory["schedule"]
        summary = advisory["summary"]
        row = {
            "id": advisory_id,
            "field_id": field_id,
            "crop": advisory["crop"],
            "growth_stage": advisory["growth_stage"],
            "forecast_start": schedule[0]["date"],
            "forecast_end": schedule[-1]["date"],
            "irrigation_events": summary["irrigation_events"],
            "total_gross_irrigation_mm": summary["total_gross_irrigation_mm"],
            "total_irrigation_volume_m3": summary["total_irrigation_volume_m3"],
            "advisory": advisory,
            "generated_at": datetime.now(UTC),
        }
        self.store[advisory_id] = row
        return row

    async def list_for_field(self, field_id, limit):
        return [
            {key: value for key, value in row.items() if key != "advisory"}
            for row in list(self.store.values())[:limit]
            if row["field_id"] == field_id
        ]

    async def get(self, advisory_id, field_id):
        from app.core.errors import NotFoundError

        row = self.store.get(advisory_id)
        if row is None or row["field_id"] != field_id:
            raise NotFoundError(f"irrigation advisory {advisory_id} not found")
        return row


class FakeRepos:
    def __init__(self):
        self.fields = FakeFields()
        self.irrigation_advisories = FakeIrrigationAdvisories()


def test_authenticated_field_irrigation_advisory_contract():
    settings = Settings()

    def forecast_handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["forecast_days"] == "3"
        return httpx.Response(200, json=make_forecast_payload())

    upstream = httpx.AsyncClient(transport=httpx.MockTransport(forecast_handler))
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    app.dependency_overrides[deps.repos] = lambda: FakeRepos()
    app.dependency_overrides[deps.settings_dep] = lambda: settings
    app.dependency_overrides[deps.http_client] = lambda: upstream
    app.dependency_overrides[deps.get_current_user] = lambda: deps.AuthUser(
        user_id=uuid.uuid4(), tenant_id=TENANT_ID, email="operator@example.com", role="analyst"
    )

    try:
        client = TestClient(app)
        response = client.post(
            f"/api/v1/fields/{FIELD_ID}/irrigation-advisory",
            json={
                "crop": "sorghum",
                "growth_stage": "mid_season",
                "forecast_days": 3,
                "pump_flow_m3_per_hour": 40,
            },
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["field_id"] == str(FIELD_ID)
        assert body["source"]["provider"] == "Open-Meteo"
        assert body["source"]["provider_url"] == "https://open-meteo.com/"
        assert body["source"]["timezone"] == "Africa/Mogadishu"
        assert body["source"]["requested_latitude"] != body["source"]["latitude"]
        assert len(body["schedule"]) == 3
        assert body["schedule"][2]["action"] == "data_gap"
        assert body["summary"]["forecast_days"] == 3
    finally:
        asyncio.run(upstream.aclose())


def test_saved_advisory_history_and_exports():
    settings = Settings()
    repos = FakeRepos()
    upstream = httpx.AsyncClient(
        transport=httpx.MockTransport(lambda request: httpx.Response(200, json=make_forecast_payload()))
    )
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    app.dependency_overrides[deps.repos] = lambda: repos
    app.dependency_overrides[deps.settings_dep] = lambda: settings
    app.dependency_overrides[deps.http_client] = lambda: upstream
    app.dependency_overrides[deps.get_current_user] = lambda: deps.AuthUser(
        user_id=uuid.uuid4(), tenant_id=TENANT_ID, email="operator@example.com", role="analyst"
    )

    try:
        client = TestClient(app)
        saved = client.post(
            f"/api/v1/fields/{FIELD_ID}/irrigation-advisories",
            json={
                "crop": "sorghum",
                "forecast_days": 3,
                "initial_soil_water_deficit_mm": 25,
                "pump_flow_m3_per_hour": 40,
            },
        )
        assert saved.status_code == 201, saved.text
        advisory = saved.json()
        advisory_id = advisory["advisory_id"]
        assert advisory["generated_at"] is not None
        assert advisory["summary"]["irrigation_events"] >= 1

        history = client.get(f"/api/v1/fields/{FIELD_ID}/irrigation-advisories")
        assert history.status_code == 200
        assert history.json()[0]["id"] == advisory_id

        detail = client.get(f"/api/v1/fields/{FIELD_ID}/irrigation-advisories/{advisory_id}")
        assert detail.status_code == 200
        assert detail.json()["advisory_id"] == advisory_id

        csv_response = client.get(
            f"/api/v1/fields/{FIELD_ID}/irrigation-advisories/{advisory_id}/schedule.csv"
        )
        assert csv_response.status_code == 200
        assert "text/csv" in csv_response.headers["content-type"]
        assert csv_response.headers["cache-control"] == "no-store"
        assert "attachment;" in csv_response.headers["content-disposition"]
        assert "gross_irrigation_mm" in csv_response.text
        assert advisory_id in csv_response.text

        calendar = client.get(f"/api/v1/fields/{FIELD_ID}/irrigation-advisories/{advisory_id}/calendar.ics")
        assert calendar.status_code == 200
        assert "text/calendar" in calendar.headers["content-type"]
        assert "BEGIN:VEVENT" in calendar.text
        assert "Irrigate sorghum" in calendar.text
    finally:
        asyncio.run(upstream.aclose())


def test_saved_advisory_lookup_checks_parent_tenancy_first():
    from app.core.errors import NotFoundError

    class ForeignFields:
        async def get(self, field_id, tenant_id):
            raise NotFoundError(f"field {field_id} not found")

    class TrapAdvisories:
        async def get(self, advisory_id, field_id):  # pragma: no cover - must never run
            raise AssertionError("child lookup must not run for a foreign field")

    class ForeignRepos:
        fields = ForeignFields()
        irrigation_advisories = TrapAdvisories()

    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    app.dependency_overrides[deps.repos] = lambda: ForeignRepos()
    app.dependency_overrides[deps.get_current_user] = lambda: deps.AuthUser(
        user_id=uuid.uuid4(), tenant_id=TENANT_ID, email="operator@example.com", role="analyst"
    )
    response = TestClient(app).get(f"/api/v1/fields/{uuid.uuid4()}/irrigation-advisories/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["type"] == "urn:agri-dss:not_found"


def test_irrigation_catalog_requires_authentication():
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    client = TestClient(app)
    response = client.get("/api/v1/irrigation/crops")
    assert response.status_code == 401
