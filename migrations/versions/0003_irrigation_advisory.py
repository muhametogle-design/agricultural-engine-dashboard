"""Persist forecast-driven irrigation advisories in master plans.

Revision ID: 0003_irrigation_advisory
Revises: 0002_auth_multitenancy
Create Date: 2026-08-14
"""

from __future__ import annotations

from alembic import op

revision = "0003_irrigation_advisory"
down_revision = "0002_auth_multitenancy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE farm_master_plans ADD COLUMN irrigation_advisory JSONB")


def downgrade() -> None:
    op.execute("ALTER TABLE farm_master_plans DROP COLUMN IF EXISTS irrigation_advisory")
