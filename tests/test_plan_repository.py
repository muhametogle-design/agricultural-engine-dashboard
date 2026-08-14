from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal

from app.db.repositories import PlansRepo


class CapturingPool:
    def __init__(self):
        self.query = ""
        self.args = ()

    async def fetchrow(self, query, *args):
        self.query = query
        self.args = args
        return {
            "id": uuid.uuid4(),
            "field_id": args[0],
            "optimal_well_point": None,
            "recommended_drilling_depth_m": Decimal("45.0"),
            "top_suitable_crops": args[3],
            "soil_amendment_recommendations": args[4],
            "irrigation_advisory": args[5],
            "fencing_post_count": args[6],
            "fencing_wire_rolls_required": args[7],
            "fencing_total_cost_est": Decimal("123.45"),
            "layout_zones_geojson": args[9],
            "generated_at": datetime.now(UTC),
        }


async def test_master_plan_repository_persists_irrigation_json():
    pool = CapturingPool()
    repo = PlansRepo(pool)  # type: ignore[arg-type]
    field_id = uuid.uuid4()
    advisory = {
        "crop": "sorghum",
        "source": {"retrieved_at": datetime(2026, 8, 14, tzinfo=UTC)},
        "schedule": [{"date": "2026-08-14", "gross_irrigation_mm": 12.5}],
    }

    row = await repo.create(
        field_id,
        {
            "top_suitable_crops": [],
            "soil_amendment_recommendations": [],
            "irrigation_advisory": advisory,
            "fencing_post_count": 10,
            "fencing_wire_rolls_required": 2,
            "fencing_total_cost_est": 123.45,
        },
    )

    assert "$10::jsonb" in pool.query
    assert len(pool.args) == 10
    assert json.loads(pool.args[5])["crop"] == "sorghum"
    assert row["irrigation_advisory"]["schedule"][0]["gross_irrigation_mm"] == 12.5
    assert row["recommended_drilling_depth_m"] == 45.0
    assert row["fencing_total_cost_est"] == 123.45
