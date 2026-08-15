"""Add permanent tenant-scoped farm history events.

Revision ID: 0005_farm_history_analytics
Revises: 0004_irrigation_history
Create Date: 2026-08-15
"""

from __future__ import annotations

from alembic import op

revision = "0005_farm_history_analytics"
down_revision = "0004_irrigation_history"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE field_history_events (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            field_id UUID NOT NULL REFERENCES farm_fields(id) ON DELETE CASCADE,
            event_type VARCHAR(32) NOT NULL
                CHECK (event_type IN ('farm_created','geometry_updated','soil_test','pathology_alert','note')),
            soil_ph NUMERIC(4,2) CHECK (soil_ph IS NULL OR soil_ph BETWEEN 0 AND 14),
            ec_ds_m NUMERIC(8,2) CHECK (ec_ds_m IS NULL OR ec_ds_m >= 0),
            organic_matter_pct NUMERIC(6,2) CHECK (organic_matter_pct IS NULL OR organic_matter_pct BETWEEN 0 AND 100),
            nitrogen_ppm NUMERIC(12,2) CHECK (nitrogen_ppm IS NULL OR nitrogen_ppm >= 0),
            phosphorus_ppm NUMERIC(12,2) CHECK (phosphorus_ppm IS NULL OR phosphorus_ppm >= 0),
            potassium_ppm NUMERIC(12,2) CHECK (potassium_ppm IS NULL OR potassium_ppm >= 0),
            pathology_alerts JSONB NOT NULL DEFAULT '[]'::jsonb
                CHECK (jsonb_typeof(pathology_alerts) = 'array'),
            notes TEXT,
            metadata JSONB NOT NULL DEFAULT '{}'::jsonb
                CHECK (jsonb_typeof(metadata) = 'object'),
            observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by UUID REFERENCES app_users(id) ON DELETE SET NULL
        )
        """
    )
    op.execute(
        """CREATE INDEX idx_field_history_field_time
           ON field_history_events(field_id, observed_at DESC)"""
    )
    op.execute(
        """CREATE INDEX idx_field_history_pathology
           ON field_history_events USING GIN(pathology_alerts)"""
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS field_history_events")
