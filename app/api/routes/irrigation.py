"""Forecast-driven irrigation advisory endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query, Response, status

from app.api.deps import AuthDep, HttpDep, ReposDep, SettingsDep
from app.engines.irrigation import GROWTH_STAGES, supported_crops
from app.schemas.irrigation import (
    IrrigationAdvisoryHistoryItem,
    IrrigationAdvisoryReport,
    IrrigationAdvisoryRequest,
)
from app.services.irrigation import generate_irrigation_advisory
from app.services.irrigation_exports import advisory_to_csv, advisory_to_ical

router = APIRouter(tags=["irrigation"])


def _hydrate_saved_advisory(row: dict) -> dict:
    advisory = dict(row["advisory"])
    advisory.update(
        {
            "advisory_id": row["id"],
            "field_id": row["field_id"],
            "generated_at": row["generated_at"],
        }
    )
    return advisory


async def _get_saved_advisory(field_id: UUID, advisory_id: UUID, repos, tenant_id: UUID) -> dict:
    await repos.fields.get(field_id, tenant_id)
    row = await repos.irrigation_advisories.get(advisory_id, field_id)
    return _hydrate_saved_advisory(row)


@router.get("/irrigation/crops")
async def irrigation_crop_catalog(auth: AuthDep) -> dict:
    """Return the crop/stage vocabulary accepted by the advisory engine."""
    return {"crops": supported_crops(), "growth_stages": list(GROWTH_STAGES)}


@router.post(
    "/fields/{field_id}/irrigation-advisory",
    response_model=IrrigationAdvisoryReport,
)
async def create_irrigation_advisory(
    field_id: UUID,
    payload: IrrigationAdvisoryRequest,
    repos: ReposDep,
    settings: SettingsDep,
    http: HttpDep,
    auth: AuthDep,
):
    """Generate a live preview without mutating field history."""
    field = await repos.fields.get(field_id, auth.tenant_id)
    return await generate_irrigation_advisory(http, settings, field, payload)


@router.post(
    "/fields/{field_id}/irrigation-advisories",
    response_model=IrrigationAdvisoryReport,
    status_code=status.HTTP_201_CREATED,
)
async def save_irrigation_advisory(
    field_id: UUID,
    payload: IrrigationAdvisoryRequest,
    repos: ReposDep,
    settings: SettingsDep,
    http: HttpDep,
    auth: AuthDep,
):
    """Generate and save an immutable operational schedule for later audit/export."""
    field = await repos.fields.get(field_id, auth.tenant_id)
    advisory = await generate_irrigation_advisory(http, settings, field, payload)
    row = await repos.irrigation_advisories.create(field_id, advisory)
    return _hydrate_saved_advisory(row)


@router.get(
    "/fields/{field_id}/irrigation-advisories",
    response_model=list[IrrigationAdvisoryHistoryItem],
)
async def list_irrigation_advisories(
    field_id: UUID,
    repos: ReposDep,
    auth: AuthDep,
    limit: int = Query(default=20, ge=1, le=100),
):
    await repos.fields.get(field_id, auth.tenant_id)
    return await repos.irrigation_advisories.list_for_field(field_id, limit)


@router.get(
    "/fields/{field_id}/irrigation-advisories/{advisory_id}",
    response_model=IrrigationAdvisoryReport,
)
async def get_irrigation_advisory(
    field_id: UUID,
    advisory_id: UUID,
    repos: ReposDep,
    auth: AuthDep,
):
    return await _get_saved_advisory(field_id, advisory_id, repos, auth.tenant_id)


@router.get("/fields/{field_id}/irrigation-advisories/{advisory_id}/schedule.csv")
async def export_irrigation_advisory_csv(
    field_id: UUID,
    advisory_id: UUID,
    repos: ReposDep,
    auth: AuthDep,
) -> Response:
    advisory = await _get_saved_advisory(field_id, advisory_id, repos, auth.tenant_id)
    return Response(
        advisory_to_csv(advisory),
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="irrigation-{advisory_id}.csv"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/fields/{field_id}/irrigation-advisories/{advisory_id}/calendar.ics")
async def export_irrigation_advisory_ical(
    field_id: UUID,
    advisory_id: UUID,
    repos: ReposDep,
    auth: AuthDep,
) -> Response:
    advisory = await _get_saved_advisory(field_id, advisory_id, repos, auth.tenant_id)
    return Response(
        advisory_to_ical(advisory),
        media_type="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="irrigation-{advisory_id}.ics"',
            "Cache-Control": "no-store",
        },
    )
