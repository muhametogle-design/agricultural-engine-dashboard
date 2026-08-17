"""Add climate, vegetation, rainfall and pastoral water-point models.

Revision ID: 0006_drought_monitoring
Revises: 0005_farm_history_analytics
Create Date: 2026-08-17
"""

from __future__ import annotations

from alembic import op

revision = "0006_drought_monitoring"
down_revision = "0005_farm_history_analytics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE climate_stations (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            region VARCHAR(80) NOT NULL,
            lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
            lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
            location GEOMETRY(Point, 4326) GENERATED ALWAYS AS
                (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
            last_updated TIMESTAMP WITH TIME ZONE NOT NULL
        )
        """
    )
    op.execute("CREATE INDEX idx_climate_stations_region ON climate_stations(lower(region))")
    op.execute("CREATE INDEX idx_climate_stations_location ON climate_stations USING GIST(location)")

    op.execute(
        """
        CREATE TABLE rainfall_records (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            station_id VARCHAR(64) NOT NULL REFERENCES climate_stations(id) ON DELETE CASCADE,
            dekad VARCHAR(10) NOT NULL CHECK (dekad ~ '^[0-9]{4}-(0[1-9]|1[0-2])-D[123]$'),
            rainfall_mm NUMERIC(9,2) NOT NULL CHECK (rainfall_mm >= 0),
            historical_mean_mm NUMERIC(9,2) NOT NULL CHECK (historical_mean_mm > 0),
            anomaly_pct NUMERIC(9,2) NOT NULL CHECK (anomaly_pct >= -100),
            UNIQUE (station_id, dekad)
        )
        """
    )
    op.execute("CREATE INDEX idx_rainfall_records_dekad ON rainfall_records(dekad)")

    op.execute(
        """
        CREATE TABLE vegetation_indices (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            region_id VARCHAR(64) NOT NULL,
            vci_score NUMERIC(5,2) NOT NULL CHECK (vci_score BETWEEN 0 AND 100),
            status VARCHAR(16) NOT NULL CHECK (status IN ('Normal','Watch','Alert','Severe')),
            observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (region_id, observed_at)
        )
        """
    )
    op.execute(
        "CREATE INDEX idx_vegetation_indices_region_latest "
        "ON vegetation_indices(region_id, observed_at DESC)"
    )

    op.execute(
        """
        CREATE TABLE pastoral_water_points (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(160) NOT NULL,
            type VARCHAR(20) NOT NULL CHECK (type IN ('Borehole','Shallow Well','Berkad')),
            status VARCHAR(16) NOT NULL CHECK (status IN ('Functional','Stressed','Dry')),
            depth_meters NUMERIC(8,2) NOT NULL CHECK (depth_meters >= 0),
            lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
            lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
            location GEOMETRY(Point, 4326) GENERATED ALWAYS AS
                (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    op.execute("CREATE INDEX idx_pastoral_water_points_location ON pastoral_water_points USING GIST(location)")
    op.execute(
        "CREATE INDEX idx_pastoral_water_points_active_status "
        "ON pastoral_water_points(status) WHERE is_active"
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS pastoral_water_points")
    op.execute("DROP TABLE IF EXISTS vegetation_indices")
    op.execute("DROP TABLE IF EXISTS rainfall_records")
    op.execute("DROP TABLE IF EXISTS climate_stations")
