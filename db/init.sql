-- ============================================================================
-- Agricultural Spatial Decision Support System (DSS) - Database Initialization
-- PostgreSQL 16 + PostGIS 3.4
--
-- NOTE: This preserves the partner-approved logical schema. Hardening added:
--   * CHECK constraints (VES array alignment, score ranges, geometry validity)
--   * UNIQUE(field_id) on the environmental cache (one live cache row/field)
--   * cec_mmolc_kg column (CEC was in scope for SoilGrids ingestion but had
--     no column in the draft DDL)
--   * nitrogen stored as g/kg to match the ingestion service conversion
--     (SoilGrids delivers cg/kg; the service divides by 100 -> g/kg)
--   * irrigation JSONB in master plans plus immutable operational schedule history
-- ============================================================================

-- Enable Spatial & UUID Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Tenancy & Authentication (multitenant org scoping + API users)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'admin'
        CHECK (role IN ('admin', 'analyst', 'viewer')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_key ON app_users (lower(email));
CREATE INDEX IF NOT EXISTS idx_app_users_tenant ON app_users(tenant_id);

-- 1. Clients Table (tenant-scoped: rows belong to one organization)
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);

-- 2. Farm Boundaries & Polygons
CREATE TABLE IF NOT EXISTS farm_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    boundary GEOMETRY(Polygon, 4326) NOT NULL,      -- Field Boundary
    center_point GEOMETRY(Point, 4326) NOT NULL,    -- Centroid
    area_hectares NUMERIC(10, 2),
    perimeter_meters NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT farm_fields_area_positive CHECK (area_hectares > 0),
    CONSTRAINT farm_fields_valid_boundary CHECK (ST_IsValid(boundary))
);

CREATE INDEX IF NOT EXISTS idx_farm_fields_boundary ON farm_fields USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_farm_fields_client ON farm_fields(client_id);
CREATE INDEX IF NOT EXISTS idx_farm_fields_tenant ON farm_fields(tenant_id);

-- 3. Cached Environmental Data (SoilGrids & NASA POWER)
CREATE TABLE IF NOT EXISTS field_environmental_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID REFERENCES farm_fields(id) ON DELETE CASCADE,
    ph_water NUMERIC(4, 2),            -- Soil pH (H2O), 0-30 cm weighted mean
    clay_percentage NUMERIC(5, 2),     -- Texture, % (0-30 cm weighted mean)
    sand_percentage NUMERIC(5, 2),
    silt_percentage NUMERIC(5, 2),
    soil_organic_carbon NUMERIC(6, 2), -- SOC (g/kg)
    nitrogen_content NUMERIC(6, 2),    -- Total nitrogen (g/kg; SoilGrids cg/kg / 100)
    cec_mmolc_kg NUMERIC(7, 2),        -- Cation exchange capacity mmol(c)/kg
    avg_annual_rainfall_mm NUMERIC(8, 2),
    avg_temp_celsius NUMERIC(4, 2),
    annual_et0_mm NUMERIC(8, 2),       -- FAO-56 reference evapotranspiration
    raw_soilgrids_json JSONB,
    raw_nasa_power_json JSONB,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT field_environmental_data_one_row_per_field UNIQUE (field_id),
    CONSTRAINT env_ph_range CHECK (ph_water IS NULL OR (ph_water >= 0 AND ph_water <= 14))
);

CREATE INDEX IF NOT EXISTS idx_env_field ON field_environmental_data(field_id);

-- 4. Groundwater Survey Data (Partner Machine's Resistivity / VES)
CREATE TABLE IF NOT EXISTS ves_groundwater_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID REFERENCES farm_fields(id) ON DELETE CASCADE,
    survey_point GEOMETRY(Point, 4326) NOT NULL,
    depth_layers_m NUMERIC[] NOT NULL,              -- e.g., ARRAY[10, 20, 50, 100]
    apparent_resistivity_ohmm NUMERIC[] NOT NULL,   -- e.g., ARRAY[250, 120, 35, 15]
    estimated_water_table_depth_m NUMERIC(6, 2),
    aquifer_quality_score NUMERIC(3, 2),            -- 0.00 to 1.00
    operator_notes TEXT,
    surveyed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ves_arrays_equal_length
        CHECK (cardinality(depth_layers_m) = cardinality(apparent_resistivity_ohmm)),
    CONSTRAINT ves_arrays_nonempty CHECK (cardinality(depth_layers_m) >= 2),
    -- NOTE: resistivity positivity is enforced at the API boundary (Postgres
    -- CHECK constraints cannot contain subqueries over unnested arrays).
    CONSTRAINT ves_score_range
        CHECK (aquifer_quality_score IS NULL OR (aquifer_quality_score BETWEEN 0 AND 1))
);

CREATE INDEX IF NOT EXISTS idx_ves_surveys_point ON ves_groundwater_surveys USING GIST(survey_point);
CREATE INDEX IF NOT EXISTS idx_ves_surveys_field ON ves_groundwater_surveys(field_id);

-- 5. Master Output / Farm Assessment Plan
CREATE TABLE IF NOT EXISTS farm_master_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field_id UUID REFERENCES farm_fields(id) ON DELETE CASCADE,
    optimal_well_point GEOMETRY(Point, 4326),
    recommended_drilling_depth_m NUMERIC(6, 2),
    top_suitable_crops JSONB,                       -- List of matched crops with scores
    soil_amendment_recommendations TEXT[],
    irrigation_advisory JSONB,                      -- Live forecast water-balance schedule
    fencing_post_count INT,
    fencing_wire_rolls_required INT,
    fencing_total_cost_est NUMERIC(10, 2),
    layout_zones_geojson JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_master_plans_well ON farm_master_plans USING GIST(optimal_well_point);
CREATE INDEX IF NOT EXISTS idx_master_plans_field_latest
    ON farm_master_plans(field_id, generated_at DESC);

-- 6. Saved Operational Irrigation Advisories
CREATE TABLE IF NOT EXISTS field_irrigation_advisories (
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
);

CREATE INDEX IF NOT EXISTS idx_irrigation_advisories_field_latest
    ON field_irrigation_advisories(field_id, generated_at DESC);

-- 7. Permanent Polygon Farm Soil / Pathology History
CREATE TABLE IF NOT EXISTS field_history_events (
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
);
CREATE INDEX IF NOT EXISTS idx_field_history_field_time
    ON field_history_events(field_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_field_history_pathology
    ON field_history_events USING GIN(pathology_alerts);

-- 8. Dawaad Climate / Pastoral Monitoring Models
CREATE TABLE IF NOT EXISTS climate_stations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    region VARCHAR(80) NOT NULL,
    lat DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
    location GEOMETRY(Point, 4326) GENERATED ALWAYS AS
        (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_climate_stations_region ON climate_stations(lower(region));
CREATE INDEX IF NOT EXISTS idx_climate_stations_location ON climate_stations USING GIST(location);

CREATE TABLE IF NOT EXISTS rainfall_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id VARCHAR(64) NOT NULL REFERENCES climate_stations(id) ON DELETE CASCADE,
    dekad VARCHAR(10) NOT NULL CHECK (dekad ~ '^[0-9]{4}-(0[1-9]|1[0-2])-D[123]$'),
    rainfall_mm NUMERIC(9,2) NOT NULL CHECK (rainfall_mm >= 0),
    historical_mean_mm NUMERIC(9,2) NOT NULL CHECK (historical_mean_mm > 0),
    anomaly_pct NUMERIC(9,2) NOT NULL CHECK (anomaly_pct >= -100),
    UNIQUE (station_id, dekad)
);
CREATE INDEX IF NOT EXISTS idx_rainfall_records_dekad ON rainfall_records(dekad);

CREATE TABLE IF NOT EXISTS vegetation_indices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_id VARCHAR(64) NOT NULL,
    vci_score NUMERIC(5,2) NOT NULL CHECK (vci_score BETWEEN 0 AND 100),
    status VARCHAR(16) NOT NULL CHECK (status IN ('Normal','Watch','Alert','Severe')),
    observed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (region_id, observed_at)
);
CREATE INDEX IF NOT EXISTS idx_vegetation_indices_region_latest
    ON vegetation_indices(region_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS pastoral_water_points (
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
);
CREATE INDEX IF NOT EXISTS idx_pastoral_water_points_location
    ON pastoral_water_points USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_pastoral_water_points_active_status
    ON pastoral_water_points(status) WHERE is_active;
