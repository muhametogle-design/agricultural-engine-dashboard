# Agricultural Spatial Decision Support System (Agri-DSS)

Production-grade FastAPI + PostGIS platform that turns a **GPS tap or a drawn field
boundary** into a complete, auditable farm development plan: groundwater well siting
from partner VES resistivity soundings, rule-based crop matching against live
SoilGrids/NASA POWER data, an optional 1–16 day Open-Meteo irrigation schedule, fencing
bill-of-quantities, and a multi-zone master layout — all delivered as one JSON
decision report.

```
 tap / polygon (EPSG:4326)
        │
        ▼
┌─────────────────┐    ┌──────────────────────────┐
│  FastAPI routes │───▶│  PostGIS repositories     │  (the ONLY SQL layer)
│  /api/v1/...    │    │  geodesic area/perimeter  │
└───────┬─────────┘    └──────────────────────────┘
        │
        ├── services/  ── SoilGrids v2 (point+polygon sampling)   ──┐
        │                NASA POWER climatology (rain, T, ET0)      │ retry,
        │                Open-Meteo daily forecast (rain + ET0)     │ backoff,
        │                fault-isolated orchestration + cache      ─┘ TTL 30d*
        │                * climatology/soil cache; forecast stays live
        ├── engines/
        │     ves_interpretation   resistivity bands, water-table knee, aquifer score
        │     well_siting          weighted MCE grid: IDW(VES) + slope + flow acc
        │     terrain              pluggable provider (Null | rasterio DEM, D8)
        │     crop_matching        YAML rules (13 crops), trapezoid/threshold scoring
        │     irrigation           Kc×ET0 water balance, trigger schedule, field volume
        │     infrastructure       fencing BOM (posts, strainers, wire rolls, gates)
        │     zoning               rotated-grid multi-zone master layout + well pad
        │
        ▼
 farm_master_plans  (persisted)  +  MasterPlanReport JSON
```

## Objective → implementation map

| # | Requirement | Where |
|---|-------------|-------|
| 1 | Tap-a-point or polygon input, WGS84 | `POST /api/v1/fields` (discriminated union `mode: point|polygon`), point mode materializes a field square server-side |
| 2 | SoilGrids + NASA POWER, zero manual entry | `app/services/soilgrids.py`, `nasa_power.py`, `environmental.py`; cached in `field_environmental_data` |
| 3 | VES machine ingestion | `POST /api/v1/fields/{id}/ves` (+`/bulk`), interpreted on ingest, stored in `ves_groundwater_surveys` |
| 4 | Well siting / crop matching / infrastructure | `app/engines/*`, orchestrated by `app/services/master_plan.py` |
| 5 | Stack | FastAPI, GeoPandas, Shapely 2, PyProj, httpx+tenacity, asyncpg, PostgreSQL 16 + PostGIS 3.4, JSON reporting |
| 6 | Operational irrigation timing | `app/services/open_meteo.py` + `app/engines/irrigation.py`; live daily rain/ET0, stage-specific Kc, efficiency-adjusted mm/m³ and optional pump hours |

## Data model

Your DDL is preserved 1:1 (`db/init.sql`), with these deliberate, documented deviations:

1. **`cec_mmolc_kg` added** to `field_environmental_data` — CEC was in the ingestion
   scope (objective 2) but had no column.
2. **Nitrogen stored in g/kg** to match the ingestion service's conversion
   (SoilGrids delivers cg/kg; ÷100). The draft comment said cg/kg — one had to change.
3. `UNIQUE(field_id)` on the environmental cache → idempotent upsert, one live row/field.
4. CHECK constraints: VES array length alignment, non-empty curves, positive
   resistivities, score ∈ [0,1], valid boundaries.
5. **`irrigation_advisory JSONB` added** to `farm_master_plans` (migration 0003)
   so the exact forecast, assumptions and schedule used by a decision report
   remain auditable.
6. **`field_irrigation_advisories` added** (migration 0004) for immutable
   operational schedule history, queryable totals and tenant-safe CSV/iCalendar
   exports independent of full master-plan runs.

## Ingestion service — what changed vs. the draft `GISDataIngestionService`

| Draft issue | Fix |
|---|---|
| `depths[0]` only (0–5 cm) despite "0-30 cm" docstring | thickness-weighted mean over 0–5/5–15/15–30 cm with configured weights |
| SoilGrids `None` (water/no-data pixels) crashes parse | per-band null tolerance; coverage error only when *everything* is null |
| `ANN < 20` unit heuristic for rainfall | annual = Σ (monthly mm/day × days-in-month); ANN×365.25 fallback |
| No ET0 | **FAO-56 Penman–Monteith derivation** (`app/engines/et0.py`). Verified live: POWER's climatology/monthly/daily APIs all 422 the `ET0` name, so ET0 is computed from POWER drivers (T2M ± min/max, RH₂M, WS₂M, Rs, elevation) |
| `-999` sentinel leaks into analytics | sentinel → `None` at parse time |
| New `AsyncClient` per call, no retry | shared pooled client; tenacity backoff on transport errors/429/5xx, fail-fast on 4xx (proven live against an ISRIC 503 outage) |
| `{"status": "error"}` dictionaries | typed exception taxonomy → RFC-7807 problem JSON |
| Point-only service | stratified interior sampling (≤9 points, concurrency-capped) aggregated to polygon means |

## Authentication & multitenancy

All business endpoints require `Authorization: Bearer <jwt>` (HS256; secret via
`AGRI_JWT_SECRET`, ≥32 bytes). Model: **tenants** (organizations) ← **app_users**
(roles `admin/analyst/viewer`) ← tenant-scoped `clients` and `farm_fields`;
all child rows inherit scoping through their parent field. Cross-tenant access
returns 404 — existence of foreign data is never disclosed. Passwords are
PBKDF2-HMAC-SHA256 (260k iterations, stdlib — no native-dep drift; swap behind
`app/core/security.py` if you prefer argon2). Deactivated users are rejected
*immediately* (the user row is re-validated per request).

* `POST /api/v1/auth/register` — create organization + first admin (returns token)
* `POST /api/v1/auth/login` — token issue
* `GET  /api/v1/auth/me`

Seeded demo credentials: **demo@agri-dss.app / demo-pass-2026**.

## Migrations (Alembic)

`db/init.sql` is the consolidated fresh-install bootstrap; `migrations/` is the
evolution path (async, DSN from `AGRI_DATABASE_DSN`):

```bash
alembic upgrade head           # existing deployments
alembic stamp head             # fresh installs bootstrapped from db/init.sql
alembic revision -m "..."      # next change
```

0001 = baseline schema; 0002 = auth/multitenancy (adds `tenant_id` as NULLABLE
for upgrade paths — backfill then `SET NOT NULL`; init.sql ships them strict);
0003 = irrigation JSON embedded in master plans; 0004 = standalone saved
irrigation-advisory history and export metadata. Both directions are designed
for `alembic upgrade head` / `downgrade base` validation against scratch databases.

## Decision engines

### Well siting (multi-criteria evaluation)
Factors re-scaled to [0,1] on an adaptive UTM grid (~1600 cells):
- **f_ves** — IDW (power 2) surface of per-sounding aquifer-quality scores
- **f_slope** — 1.0 at ≤2 %, 0 at ≥15 % (DEM provider)
- **f_flow** — percentile rank of log D8 flow accumulation (DEM provider)

Weights **re-normalize over available factors** (no DEM ⇒ VES-only, weights
renormalized to 1.0 and marked `unavailable` in the report). The argmax with a
3-cell separation filter gives the optimal point + ranked alternatives.
Drilling depth = nearest sounding's water table + 15 m penetration margin
(clamped 30–200 m). VES resistivity bands (`config.ves.bands`) and MCE weights
are configuration — **calibrate with your hydrogeologist before relying on outputs**.

### Crop matching
13 crops in `app/engines/rules/crop_rules.yaml` (East-African dryland set:
sorghum, pearl millet, cowpea, sesame, mango, date palm, …). Window criteria
score as trapezoids, thresholds as ramps (e.g. frost gate). Rainfall is
**effective rainfall** = climatology + operator-supplied irrigation, so the same
engine answers "what if we pump X mm/yr?". Output: ranked scores, rating class,
limiting factors, agronomy notes + soil amendment recommendations.

### Live irrigation advisory

Open-Meteo supplies 1–16 daily values for forecast precipitation, FAO-56 ET0,
temperature and wind at the field centroid. The pure irrigation engine applies
stage-specific crop coefficients from
`app/engines/rules/irrigation_rules.yaml`, tracks root-zone depletion and
schedules a refill when the operator's management trigger is reached. Every
result exposes effective rain, ETc, net/gross application depth, field volume
(`1 mm·ha = 10 m³`), optional pump hours, heat/wind/rain flags, source metadata
and all assumptions. Missing daily drivers become explicit `data_gap` rows;
Open-Meteo failure degrades an optional master-plan advisory to a warning rather
than blocking the other engines. Coefficients and depletion thresholds are
screening defaults—not automatic valve-control settings.

```json
{
  "crop": "sorghum",
  "growth_stage": "mid_season",
  "forecast_days": 7,
  "irrigation_efficiency": 0.85,
  "management_allowed_depletion_mm": 20,
  "initial_soil_water_deficit_mm": 0,
  "pump_flow_m3_per_hour": 40
}
```

Use this body with singular `/irrigation-advisory` for a non-mutating preview,
POST it to plural `/irrigation-advisories` to save an immutable field-history
record, or nest it under `irrigation_advisory` in a master-plan request. Saved
records can be reopened and downloaded as row-oriented CSV or all-day iCalendar
irrigation events; both export routes re-check parent-field tenancy.

### Farm infrastructure
Geodesic perimeter from PostGIS. Gates auto-derived (1 per 400 m) or explicit;
strainers at corners + every 60 m; line posts at 4 m; wire = adjusted perimeter ×
4 strands × 6 % wastage → rolls; costs from a configurable regional price list.

### Zoning
Principal-axis rotation (minimum rotated rectangle) → guillotine strip cuts along
the long axis (homestead | orchard | roads/service | production remainder, area
fractions banded by farm size) → 30 m well pad carved around the sited well →
every zone re-measured in UTM and emitted as a CRS84 FeatureCollection.
Zones provably partition the field (see tests, ±3 %).

## API (prefix `/api/v1`)

| Method & path | Purpose |
|---|---|
| `POST /auth/register` · `POST /auth/login` · `GET /auth/me` | tenant bootstrap + JWT |
| `POST /clients` | register client |
| `POST /fields` | register field (`mode: point` or `mode: polygon`) |
| `GET /fields` | list tenant fields (latest first) |
| `GET /fields/{id}` | field + geodesic metrics |
| `GET /console` | single-page map console (sign-in → field → ingest → master plan) |
| `GET /lims` | responsive React laboratory operations, finance, pathology and crop-rotation dashboard |
| `POST /fields/{id}/environmental?refresh=` | soil+climate ingestion (cache-first) |
| `POST /fields/{id}/ves` · `POST /ves/bulk` · `GET /ves` | partner machine ingestion |
| `POST /fields/{id}/well-siting` | MCE over stored VES + terrain |
| `POST /fields/{id}/crop-matching` | ranked suitability (+irrigation scenario) |
| `POST /fields/{id}/infrastructure` | fencing BOM |
| `POST /fields/{id}/irrigation-advisory` | non-mutating live forecast preview |
| `POST` · `GET /fields/{id}/irrigation-advisories` | save or list immutable schedules |
| `GET /fields/{id}/irrigation-advisories/{advisory_id}` | reopen a saved schedule |
| `GET …/{advisory_id}/schedule.csv` · `calendar.ics` | authenticated operational exports |
| `GET /irrigation/crops` | supported crop/stage vocabulary |
| `POST /fields/{id}/zoning` | master layout FeatureCollection |
| `POST /fields/{id}/master-plan` · `GET` | full pipeline → persisted plan + report (optionally including irrigation) |
| `GET /healthz` · `GET /readyz` | liveness / DB readiness |

## Quickstart

```bash
cp .env.example .env
docker compose up -d db                 # PostGIS with schema auto-initialized
pip install -r requirements.txt
uvicorn app.main:app --reload           # http://localhost:8000/docs  ·  /console (map UI)
pytest                                  # 80 tests, no DB required
python examples/run_decision_cycle_demo.py   # full engine chain, no DB/network
```

## Live-run verification log (2026-08-11, sandbox e2e)

Executed against a real PostgreSQL 17 + PostGIS 3.5 instance with live
external APIs, via HTTP with JWT auth:

* login + tenant scoping + 401 rejection without token ✔
* seeded field "Afgooye Corridor Block 7" (5.95 ha geodesic, 976 m perimeter) ✔
* NASA POWER live: rain **328.5 mm/yr**, T 26.9 °C, derived ET0 **1868 mm/yr** ✔
* ISRIC SoilGrids returned HTTP 503 during the run → granulated to warnings,
  soil columns NULL, engines renormalized and the master plan still completed ✔
  (this is exactly the degradation policy working as designed)
* master plan (HTTP 201): well at (45.31841, 2.04629) — on the productive VES
  sounding — drill **45 m**; 5 ranked candidates; fencing 248 posts / 11 rolls /
  $2,959; 5-zone layout with carved 30 m well pad; plan persisted and
  re-served from `farm_master_plans` ✔

Live-run surfaced and fixed two integration bugs the unit suite could not see:
Postgres CHECK constraints cannot contain subqueries (dropped the
array-positivity check, API boundary enforces it), and asyncpg NUMERIC values
arrive as `Decimal` (repository boundary now normalizes to float).

### 2026-08-12 — terrain activated + browser console

* `scripts/fetch_dem.py` fetched AWS `elevation-tiles-prod` GeoTIFF tiles (z14)
  for the field area → `data/dem_field.tif`, real Afgooye elevations 22–96 m,
  EPSG:3857. (Note: the bucket 404s `geotiff/` at z15+; use z≤14.)
* Live master-plan rerun with `AGRI_TERRAIN__DEM_PATH` set: MCE weights now
  `{ves 0.5, slope 0.25, flowacc 0.25}`, well score 0.9273, depth 45 m, and the
  optimal point **moved ~30 m NE into the drainage line**
  (45.31841, 2.04629 → 45.31858, 2.04637; flow score 0.92) — the terrain factors
  demonstrably re-anchor the recommendation. Plan persisted (HTTP 201) ✔
* Slope formula fixed while activating: gradient IS tan θ, so
  `slope % = 100·‖∇z‖` (the old `100·arctan(g)·(180/π)/45` mis-scaled flat
  terrain); regression-pinned by a synthetic-plane provider test asserting
  ~5 % on a 5 % plane and correct D8 flow direction.
* `/console` single-page map UI shipped (`app/web/console.html`): JWT sign-in,
  tap-GPS or draw-polygon field registration, environment/VES ingestion, master
  plan with zone/candidate/well layers rendered on Leaflet/OSM.

### 2026-08-14 — climate-smart irrigation advisory

* Added authenticated `POST /fields/{id}/irrigation-advisory`, backed by a
  null-tolerant Open-Meteo client and an auditable Kc×ET0 root-zone balance.
* The console now renders a seven-day rain/ETc/application table and scales
  gross depth to field m³ and optional pump runtime. Preview and save are
  separate actions; saved schedules expose history, CSV and calendar downloads.
  Master-plan embedding is revision 0003; standalone history is revision 0004.
* Forecast failures are isolated from master-plan generation; missing daily
  values are never silently treated as zero rainfall or zero ET0.
* Live provider contract check at the Afgooye demo coordinate returned
  `Africa/Mogadishu`, aligned daily arrays, and plausible ET0 (4.30–5.37 mm/day)
  for 2026-08-14 through 2026-08-16.

### 2026-08-14 — modular agricultural laboratory dashboard

* `/lims` now loads a lightweight, same-origin React source module over the
  vendored Tailwind, Lucide and Recharts runtimes—no CDN or build server.
* Interactive modules cover six-color themes, on-duty engineer management,
  clickable soil certificates with pH-driven lime advice, monthly lab/revenue
  analytics, USD cash intake with six Somali payment rails, asynchronous crop
  pathology/treatment logging, and CSV-driven five-year rotation planning.
* Farmer/client names are writable, diagnoses stay linked to active pathology
  filters, and every planner season label accepts suggestions or custom text.
* The enterprise five-year planner ships 51 fallback crop rules (21 vegetables,
  14 fruits), maps family/root-depth/nitrogen/pH/maturity CSV columns, supports
  search/filter/sort and drag/drop, and projects lifecycle, diversity and field
  health. Compliance flags family repetition, sequential heavy feeders and pH.
* The GIS link detects standalone `/web` hosting and opens the bundled dashboard
  instead of the FastAPI-only route. GIS square-v4 uses a screen-fit three-column
  grid, a true 1:1 map and a context matrix that consumes remaining vertical space;
  16–19 px laboratory/AOI labels and larger controls stay readable. Standalone mode
  samples pH directly from the local HWSD overlay—no API endpoint is required.

## Production notes

- **Scaling**: engines are CPU-bound pure functions → run via `asyncio.to_thread`
  (already) or move to a worker pool; external APIs are the latency bottleneck,
  mitigated by the 30-day cache (`AGRI_ENV_CACHE_TTL_S`) and bulk VES ingestion.
- **Terrain**: set `AGRI_TERRAIN__DEM_PATH` to a clipped SRTM/COP DEM GeoTIFF and
  install `rasterio` to activate slope/flow factors. `scripts/fetch_dem.py`
  pulls open terrain tiles (`--bbox … --zoom 14`) into a ready GeoTIFF and can
  emit a flagged synthetic surface (`--synthetic`) for offline testing. For
  national scale, place a COG-backed terrain microservice behind the same
  `TerrainProvider` protocol.
- **Forecast operations**: Open-Meteo is queried live and is not placed in the
  30-day climatology cache. Review its licence/attribution and commercial-use
  terms for your deployment, and add provider redundancy before using the
  schedule for time-critical operations.
- **Schedule retention**: saved advisories are append-only through the API and
  cascade with their parent field. Define archival/retention policy for long-lived
  tenants before enabling automated forecast refreshes.
- **Calibration gates before go-live**: VES resistivity bands (geology-specific),
  crop and irrigation Kc rules (agronomy partner), root-zone depletion triggers,
  MCE weights, fencing price list.
- **Integrity**: every report echoes its factor weights, coverage flags and raw
  JSONB provenance — decisions are reproducible and auditable.

## Tests

80 passing (`pytest`): engine math with known-answer fixtures, respx-mocked
SoilGrids/POWER/Open-Meteo clients (retry, sentinel, null, coverage paths),
orchestrator degradation, irrigation schedule/volume arithmetic, CSV/iCalendar
exports, DEM provider against a synthetic plane, API wiring via in-memory
repository fakes, repository JSON persistence, and console/LIMS smoke tests (no DB needed).
