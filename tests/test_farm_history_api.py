from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from fastapi.testclient import TestClient

from app.api import deps
from app.main import create_app
from tests.conftest import make_square_polygon

TENANT_ID = uuid.uuid4()
USER_ID = uuid.uuid4()


class FakeFields:
    def __init__(self):
        self.rows = {}

    async def create(self, tenant_id, client_id, field_name, boundary):
        field_id = uuid.uuid4()
        row = {
            "id": field_id,
            "tenant_id": tenant_id,
            "client_id": client_id,
            "field_name": field_name,
            "boundary": boundary,
            "center_point": {"type": "Point", "coordinates": [45.318, 2.046]},
            "area_hectares": 4.8,
            "perimeter_meters": 880.0,
            "created_at": datetime.now(UTC),
        }
        self.rows[field_id] = row
        return row

    async def get(self, field_id, tenant_id):
        row = self.rows[field_id]
        assert row["tenant_id"] == tenant_id
        return row


class FakeHistory:
    def __init__(self):
        self.rows = []

    async def create(self, field_id, user_id, event):
        row = {
            "id": uuid.uuid4(),
            "field_id": field_id,
            "event_type": event["event_type"],
            "soil_ph": event.get("soil_ph"),
            "ec_ds_m": event.get("ec_ds_m"),
            "organic_matter_pct": event.get("organic_matter_pct"),
            "nitrogen_ppm": event.get("nitrogen_ppm"),
            "phosphorus_ppm": event.get("phosphorus_ppm"),
            "potassium_ppm": event.get("potassium_ppm"),
            "pathology_alerts": event.get("pathology_alerts") or [],
            "notes": event.get("notes"),
            "metadata": event.get("metadata") or {},
            "observed_at": event.get("observed_at") or datetime.now(UTC),
            "created_by": user_id,
        }
        self.rows.append(row)
        return row

    async def list_for_field(self, field_id, limit):
        return [row for row in reversed(self.rows) if row["field_id"] == field_id][:limit]

    async def monthly(self, tenant_id, months):
        return [
            {
                "month": date(2026, 8, 1),
                "farms": 1,
                "soil_tests": 1,
                "avg_ph": 6.4,
                "avg_nitrogen_ppm": 18.0,
                "avg_phosphorus_ppm": 9.0,
                "avg_potassium_ppm": 140.0,
                "pathology_alerts": 1,
            }
        ]


class FakeRepos:
    def __init__(self):
        self.fields = FakeFields()
        self.field_history = FakeHistory()


def test_polygon_farm_history_and_monthly_analytics_api():
    app = create_app()
    repos = FakeRepos()
    app.state.pool = None
    app.state.terrain = None
    app.dependency_overrides[deps.repos] = lambda: repos
    app.dependency_overrides[deps.get_current_user] = lambda: deps.AuthUser(
        user_id=USER_ID,
        tenant_id=TENANT_ID,
        email="operator@example.com",
        role="analyst",
    )
    client = TestClient(app)

    created = client.post(
        "/api/v1/polygon-farms",
        json={"field_name": "Beer A", "geometry": make_square_polygon()},
    )
    assert created.status_code == 201, created.text
    field_id = created.json()["id"]
    assert created.json()["client_id"] is None

    event = client.post(
        f"/api/v1/fields/{field_id}/history",
        json={
            "event_type": "soil_test",
            "soil_ph": 6.4,
            "nitrogen_ppm": 18,
            "phosphorus_ppm": 9,
            "potassium_ppm": 140,
            "pathology_alerts": ["Bean Rust"],
            "metadata": {"coordinates": [[45.317, 2.045]]},
        },
    )
    assert event.status_code == 201, event.text
    assert event.json()["soil_ph"] == 6.4

    history = client.get(f"/api/v1/fields/{field_id}/history")
    assert history.status_code == 200
    assert [row["event_type"] for row in history.json()] == ["soil_test", "farm_created"]

    analytics = client.get("/api/v1/analytics/farms/monthly?months=12")
    assert analytics.status_code == 200
    assert analytics.json()[0]["pathology_alerts"] == 1
