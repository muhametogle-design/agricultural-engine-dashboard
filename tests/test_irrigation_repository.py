from __future__ import annotations

import json
import uuid
from datetime import UTC, date, datetime
from decimal import Decimal

import pytest

from app.core.errors import NotFoundError
from app.db.repositories import IrrigationAdvisoriesRepo

FIELD_ID = uuid.uuid4()
ADVISORY_ID = uuid.uuid4()
GENERATED_AT = datetime(2026, 8, 14, 10, tzinfo=UTC)


def advisory() -> dict:
    return {
        "field_id": FIELD_ID,
        "crop": "sorghum",
        "growth_stage": "mid_season",
        "schedule": [
            {"date": "2026-08-14", "action": "monitor"},
            {"date": "2026-08-20", "action": "irrigate"},
        ],
        "summary": {
            "irrigation_events": 1,
            "total_gross_irrigation_mm": 22.75,
            "total_irrigation_volume_m3": 1092.0,
        },
    }


class CreatePool:
    def __init__(self):
        self.query = ""
        self.args = ()

    async def fetchrow(self, query, *args):
        self.query = query
        self.args = args
        return {
            "id": ADVISORY_ID,
            "field_id": args[0],
            "crop": args[1],
            "growth_stage": args[2],
            "forecast_start": args[3],
            "forecast_end": args[4],
            "irrigation_events": args[5],
            "total_gross_irrigation_mm": Decimal(str(args[6])),
            "total_irrigation_volume_m3": Decimal(str(args[7])),
            "advisory": args[8],
            "generated_at": GENERATED_AT,
        }


async def test_create_extracts_queryable_summary_and_keeps_full_json():
    pool = CreatePool()
    repo = IrrigationAdvisoriesRepo(pool)  # type: ignore[arg-type]
    row = await repo.create(FIELD_ID, advisory())

    assert len(pool.args) == 9
    assert pool.args[3] == date(2026, 8, 14)
    assert pool.args[4] == date(2026, 8, 20)
    assert pool.args[5:8] == (1, 22.75, 1092.0)
    assert json.loads(pool.args[8])["schedule"][1]["action"] == "irrigate"
    assert row["advisory"]["crop"] == "sorghum"
    assert row["total_irrigation_volume_m3"] == 1092.0


class ReadPool:
    def __init__(self, row=None):
        self.row = row
        self.fetch_args = None

    async def fetchrow(self, query, *args):
        self.fetch_args = args
        return self.row

    async def fetch(self, query, *args):
        self.fetch_args = args
        return [self.row] if self.row else []


def summary_row() -> dict:
    return {
        "id": ADVISORY_ID,
        "field_id": FIELD_ID,
        "crop": "sorghum",
        "growth_stage": "mid_season",
        "forecast_start": date(2026, 8, 14),
        "forecast_end": date(2026, 8, 20),
        "irrigation_events": 1,
        "total_gross_irrigation_mm": Decimal("22.75"),
        "total_irrigation_volume_m3": Decimal("1092.00"),
        "generated_at": GENERATED_AT,
    }


async def test_list_normalizes_numeric_summary_and_honors_limit():
    pool = ReadPool(summary_row())
    repo = IrrigationAdvisoriesRepo(pool)  # type: ignore[arg-type]
    rows = await repo.list_for_field(FIELD_ID, limit=7)
    assert pool.fetch_args == (FIELD_ID, 7)
    assert rows[0]["total_gross_irrigation_mm"] == 22.75


async def test_get_is_scoped_to_parent_field_and_returns_404():
    pool = ReadPool()
    repo = IrrigationAdvisoriesRepo(pool)  # type: ignore[arg-type]
    with pytest.raises(NotFoundError):
        await repo.get(ADVISORY_ID, FIELD_ID)
    assert pool.fetch_args == (ADVISORY_ID, FIELD_ID)
