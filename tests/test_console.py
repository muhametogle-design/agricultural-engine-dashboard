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
        "Native trees", "Ziziphus mauritiana", "base-active", "Soil engine",
        "Soil amendment required", "ringAreaM2", "renderSim",
        "World_Imagery", "mt{s}.google.com", "Compact Field Map",
        "map-frame", "lab-map-label", "Afgooye Soil Laboratory",
        "updateAoiMapLabel",
    ):
        assert marker in r.text


def test_lims_dashboard_is_modular_and_offline_safe():
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    client = TestClient(app)

    page = client.get("/lims")
    assert page.status_code == 200
    assert "/web/lims.src.js" in page.text
    assert "/web/vendor/react.min.js" in page.text
    assert "https://" not in page.text

    source = client.get("/web/lims.src.js")
    assert source.status_code == 200
    for marker in (
        "Technical Engineer on Duty",
        "Monthly Lab Analytics",
        "Daily Work History",
        "Soil Analysis Certificate",
        "PAYMENT_METHODS",
        '"ZAAD","SAHAL","EDAHAB","CASH","EVCPLUS","BANK"',
        "Crop Pathology Log",
        "loadDiseaseDictionary",
        "Writable Farmer Field Issue Logger",
        "linked to the current pathology filters",
        "5-Year Strategic Crop Planning & Rotation",
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
        "GIS_ENGINE_URL",
    ):
        assert marker in source.text
    assert "CREDIT CARD" not in source.text

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
