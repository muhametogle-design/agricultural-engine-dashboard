"""Permanent polygon farm records, soil history, and monthly analytics."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, status

from app.api.deps import AuthDep, ReposDep
from app.schemas.farm_history import (
    FarmHistoryCreate,
    FarmHistoryOut,
    MonthlyFarmAnalytics,
    PolygonFarmCreate,
)
from app.schemas.fields import FieldOut

router = APIRouter(tags=["farm-history"])


@router.post("/polygon-farms", response_model=FieldOut, status_code=status.HTTP_201_CREATED)
async def create_polygon_farm(
    payload: PolygonFarmCreate,
    repos: ReposDep,
    auth: AuthDep,
):
    """Create a tenant-owned PostGIS polygon without requiring a client record."""
    field = await repos.fields.create(
        auth.tenant_id,
        None,
        payload.field_name,
        payload.geometry.to_geojson(),
    )
    await repos.field_history.create(
        field["id"],
        auth.user_id,
        {
            "event_type": "farm_created",
            "notes": "Permanent polygon farm created",
            "metadata": {"source": "gis-dashboard"},
        },
    )
    return field


@router.post(
    "/fields/{field_id}/history",
    response_model=FarmHistoryOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_farm_history_event(
    field_id: UUID,
    payload: FarmHistoryCreate,
    repos: ReposDep,
    auth: AuthDep,
):
    await repos.fields.get(field_id, auth.tenant_id)
    return await repos.field_history.create(
        field_id,
        auth.user_id,
        payload.model_dump(),
    )


@router.get("/fields/{field_id}/history", response_model=list[FarmHistoryOut])
async def list_farm_history(
    field_id: UUID,
    repos: ReposDep,
    auth: AuthDep,
    limit: int = Query(default=200, ge=1, le=1000),
):
    await repos.fields.get(field_id, auth.tenant_id)
    return await repos.field_history.list_for_field(field_id, limit)


@router.get("/analytics/farms/monthly", response_model=list[MonthlyFarmAnalytics])
async def monthly_farm_analytics(
    repos: ReposDep,
    auth: AuthDep,
    months: int = Query(default=12, ge=1, le=60),
):
    return await repos.field_history.monthly(auth.tenant_id, months)
