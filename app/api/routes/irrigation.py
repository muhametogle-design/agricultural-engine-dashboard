"""Forecast-driven irrigation advisory endpoints."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import AuthDep, HttpDep, ReposDep, SettingsDep
from app.engines.irrigation import GROWTH_STAGES, supported_crops
from app.schemas.irrigation import IrrigationAdvisoryReport, IrrigationAdvisoryRequest
from app.services.irrigation import generate_irrigation_advisory

router = APIRouter(tags=["irrigation"])


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
    """Generate a live field-scale schedule from the current daily forecast.

    The endpoint does not mutate the field.  To store the advisory alongside
    the complete decision report, include the same request under
    ``irrigation_advisory`` when creating a master plan.
    """
    field = await repos.fields.get(field_id, auth.tenant_id)
    return await generate_irrigation_advisory(http, settings, field, payload)
