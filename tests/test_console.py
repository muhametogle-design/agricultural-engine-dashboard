"""Console smoke: page is served and genuinely interactive-capable."""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import create_app


def test_console_served():
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    client = TestClient(app)
    r = client.get("/console")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
    for marker in ("L.map(", "/api/v1", "master-plan", "leaflet", "auth/login",
                   "irrigation-advisory", "Open-Meteo", "Save schedule", "Download CSV"):
        assert marker in r.text


def test_dashboard_served():
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    client = TestClient(app)
    r = client.get("/dashboard")
    assert r.status_code == 200
    for marker in (
        "Native Somali Trees", "Ziziphus mauritiana", "base-active", 'id:"soil",key:"soil"',
        "Soil amendment required", "ringAreaM2", "renderSim",
        "World_Imagery", "mt{s}.google.com", "Field Intelligence Map",
        "SQUARE v4", "map-frame", "map-summary", "map-aoi-count",
        "aspect-ratio:1/1", "grid-template-columns", "lab-map-label",
        "Afgooye Soil Laboratory", "updateAoiMapLabel", "localHwsdImagePromise",
        "Local HWSD pH overlay", "local-sampler=v1",
        "hwsdPhPane", "hwsd-ph-raster", "ph-ranges=v2", "Distinct pH ranges",
        "alphaFlora", "plant-pathology-select", "Applicable pathology for",
        "agri.shared.js", "agri.store.js", "agri.i18n.js", "seedOils", "lang-toggle", "Soomaali | English",
        "left-collapsed", "sidebar-toggle", "restoreLeftSidebar", "map.invalidateSize",
        "AGRI_DATA_STORE", "STATIC_MASTER_CATALOG", "renderStartupCatalog",
        "AQUIFERS", "assessGroundwater", "Underground aquifer detected",
        "somalia_unified.geojson", "nationalBoundaryLayer", "DEFAULT_MAP_ZOOM=8",
        "Laascaanood Integration Preview",
        "GROUNDWATER_NETWORK", "hourlyStations:40", "weeklyBoreholes:609",
        "renderGroundwaterStation", "Conductivity", "Local water price",
        "Somalia_Groundwater_Monitoring_Bulletin_23_Dec_2025.pdf", "spatial.faoswalim.org", "data.faoswalim.org:1080/gwater",
        "Farm Fencing", "fencingPlan", "ringPerimeterM",
        "indexedDB", "openFarmAnalytics", "recordFarmEvent", "restoreFarmRecords",
        "z-index:99999", "#farm-analytics-modal", "updateProduceCount",
        "overscroll-behavior:contain", "scrollbar-gutter:stable",
        "#left,#right,#map-shell", "overflow-y:auto!important",
    ):
        assert marker in r.text
    assert "f.icon" not in r.text
    assert "GRP_ICON" not in r.text
    assert "Demo plot" not in r.text
    assert "demoPlot" not in r.text
    assert "Loading synchronized regional catalog" not in r.text
    assert "Regional seed catalog ready" in r.text

    boundary = client.get("/web/somalia_unified.geojson")
    assert boundary.status_code == 200
    geojson = boundary.json()
    assert len(geojson["features"]) == 1
    assert geojson["features"][0]["properties"]["iso_a3"] == "SOM"
    assert "internal" in geojson["features"][0]["properties"]["boundary_policy"]


def test_lims_dashboard_is_modular_and_offline_safe():
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    client = TestClient(app)

    page = client.get("/lims")
    assert page.status_code == 200
    assert "/web/lims.src.js" in page.text
    assert "/web/agri.shared.js" in page.text
    assert "/web/agri.store.js" in page.text
    assert "/web/agri.i18n.js" in page.text
    assert "/web/vendor/react.min.js" in page.text
    assert ".strategic-planner h2" in page.text
    assert "font-size:19px" in page.text
    assert "https://" not in page.text

    shared = client.get("/web/agri.shared.js")
    assert shared.status_code == 200
    for marker in ("Ciid", "Dhoobo", "Khudaar", "Midho", "Beer", "Cudurada", "Saliidda Abuurka", "seedOils", "Oil Palm", "Jojoba", "2026.08-regional-200", "minimumRegionalCount:200"):
        assert marker in shared.text
    assert "const profiles=" in shared.text
    assert "const names=" in shared.text
    assert "regionalProduceCount:produce.length" in shared.text

    store = client.get("/web/agri.store.js")
    assert store.status_code == 200
    for marker in ("agri-unified-catalog", "BroadcastChannel", "upsertMany", "catalog-changed", "memoryCatalog", "synchronous fallback remains active", "mergeMaster"):
        assert marker in store.text

    i18n = client.get("/web/agri.i18n.js")
    assert i18n.status_code == 200
    for marker in ("MutationObserver", "Soomaali", "Khariidadda & Beeraha", "Falanqaynta Billaha Beeraha", "Dayrka Beeraha", "Cudurada", "Saliidda Abuurka"):
        assert marker in i18n.text
    assert i18n.text.count('\":\"') >= 80

    catalog = client.get("/web/regional_produce.json")
    assert catalog.status_code == 200
    payload = catalog.json()
    assert payload["regionalProduceCount"] >= 200
    assert payload["seedOilCount"] == 7
    assert len(payload["records"]) >= 200
    assert all(record.get("pathologies") for record in payload["records"])

    source = client.get("/web/lims.src.js")
    assert source.status_code == 200
    for marker in (
        'uiText(props.lang||"en","engineer")',
        "Monthly Lab Analytics",
        "Daily Work History",
        "Soil Analysis Certificate",
        "PAYMENT_METHODS",
        '"ZAAD","SAHAL","EDAHAB","CASH","EVCPLUS","BANK"',
        'uiText(lang,"pathology")',
        "loadDiseaseDictionary",
        "Writable Farmer Field Issue Logger",
        "linked to the current pathology filters",
        'uiText(lang,"planner")',
        "parseCropPlan",
        "Root Depth Profile",
        "Nitrogen Demand Category",
        "rotation-season-options",
        "Field Health Matrix",
        "Nutrient depletion",
        "draggable:true",
        "Lifecycle days",
        "All families",
        "Avocado",
        "Broccoli",
        "CROP_VARIETY_EXPANSION",
        "REGIONAL_PRODUCE_EXPANSION",
        "SHARED_CROP_LIBRARY",
        "SHARED_DISEASE_VECTOR",
        "AGRI_DATA_STORE",
        "synchronized them to GIS",
        "DISEASE_EXPANSION",
        "linkedPathologies",
        "Associated pathology selection",
        "Seed Oil",
        "Soomaali",
        "strategic-planner",
        "NO TAX · NO FEES",
        "GIS_ENGINE_URL",
    ):
        assert marker in source.text
    assert source.text.count("cropVariety(") >= 51
    regional_block = source.text.split("const REGIONAL_PRODUCE_EXPANSION", 1)[1].split("const CROP_LIBRARY", 1)[0]
    assert regional_block.count('crop("') >= 50
    assert source.text.count("pathology(") >= 51
    for removed in ("CREDIT CARD", "const TAX", "GATEWAYS", "Tax 5%", "% fee"):
        assert removed not in source.text

    gis = client.get("/web/dashboard.html")
    assert gis.status_code == 200
    assert '/web/vendor/tailwind.js' in gis.text
    assert 'href="/web/lims.html"' in gis.text
    assert "L.map(" in gis.text


def test_landing_links():
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    client = TestClient(app)
    r = client.get("/")
    assert all(path in r.text for path in ("/console", "/dashboard", "/lims"))
