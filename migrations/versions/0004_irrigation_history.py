"""Add saved field irrigation-advisory history.

Revision ID: 0004_irrigation_history
Revises: 0003_irrigation_advisory
Create Date: 2026-08-14
"""

from __future__ import annotations

from alembic import op

revision = "0004_irrigation_history"
down_revision = "0003_irrigation_advisory"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE field_irrigation_advisories (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            field_id UUID NOT NULL REFERENCES farm_fields(id) ON DELETE CASCADE,
            crop VARCHAR(64) NOT NULL,
            growth_stage VARCHAR(20) NOT NULL
                CHECK (growth_stage IN ('initial', 'development', 'mid_season', 'late_season')),
            forecast_start DATE,
            forecast_end DATE,
            irrigation_events INT NOT NULL DEFAULT 0 CHECK (irrigation_events >= 0),
            total_gross_irrigation_mm NUMERIC(10, 2) NOT NULL DEFAULT 0
                CHECK (total_gross_irrigation_mm >= 0),
            total_irrigation_volume_m3 NUMERIC(16, 2) NOT NULL DEFAULT 0
                CHECK (total_irrigation_volume_m3 >= 0),
            advisory JSONB NOT NULL CHECK (jsonb_typeof(advisory) = 'object'),
            generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT irrigation_forecast_date_order
                CHECK (forecast_end IS NULL OR forecast_start IS NULL OR forecast_end >= forecast_start)
        )
        """
    )
    op.execute(
        """CREATE INDEX idx_irrigation_advisories_field_latest
           ON field_irrigation_advisories(field_id, generated_at DESC)"""
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS field_irrigation_advisories")
