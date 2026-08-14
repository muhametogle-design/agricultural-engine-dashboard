from __future__ import annotations

import asyncio
import uuid

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


class FakeRepos:
    fields = FakeFields()


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


def test_irrigation_catalog_requires_authentication():
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    client = TestClient(app)
    response = client.get("/api/v1/irrigation/crops")
    assert response.status_code == 401
