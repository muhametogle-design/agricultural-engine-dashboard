"""Console smoke: page is served and genuinely interactive-capable."""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest
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


def test_dawaad_drought_map_component():
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    client = TestClient(app)

    page = client.get("/dawaad")
    assert page.status_code == 200
    for marker in (
        "Dawaad / Abaar Alert",
        "[8.4167, 47.3667]",
        "zoom: 8",
        "Esri Satellite + Labels",
        "No API key is required",
        "/web/dawaad-map.js",
        "/web/pastoral-tools.js",
        "/web/dawaad-map.css",
        "Underground Aquifer Layer",
        "Solar Water Pump Sizing",
        "Pastoral Fencing &amp; Corridor Planner",
        "/web/vendor/leaflet/leaflet.js",
        "/web/vendor/leaflet/leaflet.css",
        "← Main GIS",
        "Drought Monitoring / Kormeerka Abaaraha",
        'id="monitoring-region"',
        "/web/drought.mock.json",
        "Gobol boundaries",
        "Degmo boundaries",
    ):
        assert marker in page.text
    assert "unpkg.com" not in page.text
    assert "Bing Maps" not in page.text
    assert client.get("/web/vendor/leaflet/leaflet.js").status_code == 200
    assert client.get("/web/vendor/leaflet/leaflet.css").status_code == 200
    tools = client.get("/web/pastoral-tools.js")
    assert tools.status_code == 200
    for marker in ("calculateSolarPump", "SolarPumpWidget", "PastoralFencePlanner", "AquiferOverlayWidget"):
        assert marker in tools.text
    aquifers = client.get("/web/dawaad.aquifers.geojson")
    assert aquifers.status_code == 200
    assert {feature["properties"]["potential"] for feature in aquifers.json()["features"]} == {
        "High Yield", "Medium", "Deep Saline"
    }
    mock = client.get("/web/drought.mock.json")
    assert mock.status_code == 200
    assert set(mock.json()["droughtMetrics"]) == {"sool", "nugaal", "sanaag", "togdheer", "mudug"}
    assert len(mock.json()["waterPoints"]["features"]) == 10

    source_response = client.get("/web/dawaad-map.js")
    assert source_response.status_code == 200
    source = source_response.text
    for marker in (
        "class DawaadMapComponent",
        "Esri Satellite + Labels",
        "World_Imagery/MapServer/tile/{z}/{y}/{x}",
        "World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        "L.layerGroup",
        "OpenStreetMap Standard",
        'defaultBasemap: "esri"',
        "openstreetmap.org/{z}/{x}/{y}.png",
        'position: "topright", collapsed: false',
        'scale({ position: "bottomleft"',
        "requestFullscreen",
        "dawaadRegions",
        "dawaadDistricts",
        "dawaadClimateStations",
        "dawaadWaterPoints",
        "Climate stations",
        "Pastoral water points",
        "loadMonitoring",
        "focusMonitoringRegion",
        "local standalone mock",
        "FeatureCollection",
        "geoBoundaries CC BY 4.0",
    ):
        assert marker in source
    assert "YOUR_BING_MAPS_KEY" not in source


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
        "World_Imagery", "mt{s}.google.com", "OpenStreetMap Standard", "tile.openstreetmap.org",
        "Bing Satellite + Labels", "GisBingHybridLayer", "gisTileXYToQuadKey", "gis_bing_maps_key", "bing-key-input", "Field Intelligence Map",
        "Plant Selector · LIMS Master Database", "plant-suitability-card", "openPlantSelectorForFarm", "evaluatePlantSuitability", "selectedPlantId",
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
        "Solar Pump Sizing", "calculateSolarPump", "solarPumpSizing", "engineeringAllowancePct", "totalDynamicHead", "pressureBar", "MPPT solar pump controller",
        "Export PDF Report", "Soo Dawi Warbixinta PDF", "exportFarmPdfReport", "reportMapSvg", "@page{size:A4",
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
    assert r.text.count('href="/web/dawaad.html"') >= 2
    assert "Dawaad / Abaar Alert" in r.text
    assert r.text.count('<section class="page">') == 2
    assert "height:297mm;overflow:hidden" in r.text
    assert "Warbixinta Farsamo ee Beerta" in r.text

    boundary = client.get("/web/somalia_unified.geojson")
    assert boundary.status_code == 200
    geojson = boundary.json()
    assert len(geojson["features"]) == 1
    assert geojson["features"][0]["properties"]["iso_a3"] == "SOM"
    assert "internal" in geojson["features"][0]["properties"]["boundary_policy"]


def test_gis_bing_quadkey_engine():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for the Bing quadkey regression")
    dashboard_path = Path(__file__).resolve().parents[1] / "app/web/dashboard.html"
    source = dashboard_path.read_text(encoding="utf-8")
    start = source.index("function gisTileXYToQuadKey")
    end = source.index("function hasGisBingKey", start)
    engine = source[start:end]
    check = "\nif (gisTileXYToQuadKey(3, 5, 3) !== '213') throw new Error('quadkey regression');"
    completed = subprocess.run([node, "-e", engine + check], capture_output=True, text=True)
    assert completed.returncode == 0, completed.stderr


def test_polygon_plant_suitability_engine_has_green_yellow_red_outcomes():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for the suitability regression")
    dashboard_path = Path(__file__).resolve().parents[1] / "app/web/dashboard.html"
    source = dashboard_path.read_text(encoding="utf-8")
    start = source.index("function evaluatePlantSuitability")
    end = source.index("function renderPlantSuitability", start)
    engine = source[start:end]
    checks = r'''
const greenPlant={en:"Jojoba",sci:"Simmondsia chinensis",care:"drought and salt tolerant",avoid:"",ph:[6,8.5],water:{mm:500},nitrogenDemand:"Light Feeder"};
const greenMetrics={ph:7,ec:1,soilCode:"sandy",classification:"Ciid / Sandy",aquiferDepth:60,conductivity:1000,climateZone:"Arid pastoral"};
const yellowPlant={en:"Banana",sci:"Musa acuminata",care:"high water",avoid:"avoid waterlogging",ph:[5.5,7],water:{mm:1500},nitrogenDemand:"Heavy Feeder"};
const yellowMetrics={ph:7.4,ec:1.8,soilCode:"sandy",classification:"Ciid / Sandy",aquiferDepth:100,conductivity:2000,climateZone:"Arid pastoral"};
const redPlant={en:"Avocado",sci:"Persea americana",care:"perfect drainage",avoid:"root rot and saline water",ph:[5.5,7],water:{mm:1000},nitrogenDemand:"Heavy Feeder"};
const redMetrics={ph:9,ec:5,soilCode:"clay",classification:"Dhoobo / Clay",aquiferDepth:180,conductivity:5000,climateZone:"Arid pastoral"};
const results=[evaluatePlantSuitability(greenPlant,greenMetrics),evaluatePlantSuitability(yellowPlant,yellowMetrics),evaluatePlantSuitability(redPlant,redMetrics)];
if (results.map(item=>item.status).join(",") !== "green,yellow,red") throw new Error(JSON.stringify(results));
if (!results[0].label.name.includes("Habboon / Eligible")) throw new Error("green label");
if (!results[1].label.name.includes("Khatar Dhex-dhexaad / Moderate")) throw new Error("yellow label");
if (!results[2].label.name.includes("Ku Habboonaan La'aan / Unsuitable")) throw new Error("red label");
'''
    completed = subprocess.run([node, "-e", engine + checks], capture_output=True, text=True)
    assert completed.returncode == 0, completed.stderr


def test_solar_pump_engine_recalculates_linked_aquifer_design():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for the browser calculation regression")
    dashboard_path = Path(__file__).resolve().parents[1] / "app/web/dashboard.html"
    source = dashboard_path.read_text(encoding="utf-8")
    start = source.index("function calculateSolarPump")
    end = source.index("function solarPumpSizing", start)
    engine = source[start:end]
    checks = r"""
const shallow = calculateSolarPump(
  {depth:40, yieldM3:10},
  {surfaceHead:20, engineeringAllowancePct:10, dailyDemand:30, sunHours:5, panelW:400}
);
const sixty = calculateSolarPump(
  {depth:60, yieldM3:12},
  {surfaceHead:20, engineeringAllowancePct:10, dailyDemand:30, sunHours:5, panelW:400}
);
if (shallow.totalDynamicHead >= sixty.totalDynamicHead || shallow.motorKw >= sixty.motorKw) throw new Error("40 m aquifer link regression");
if (sixty.totalDynamicHead !== 88 || sixty.pressureBar !== 8.6) throw new Error("TDH/pressure regression");
if (sixty.flowLph !== 6000 || sixty.motorKw !== 3.25 || sixty.motorHp !== 4.4) throw new Error("flow/motor regression");
if (sixty.panels !== 11 || sixty.arrayKw !== 4.4 || sixty.inverterKw !== 4.3) throw new Error("PV/controller regression");
if (sixty.costs.total <= 0 || sixty.costs.total !== Object.entries(sixty.costs).filter(([key]) => key !== "total").reduce((sum, [, value]) => sum + value, 0)) throw new Error("cost regression");
const deep = calculateSolarPump(
  {depth:120, yieldM3:20},
  {surfaceHead:20, engineeringAllowancePct:15, dailyDemand:30, sunHours:5, panelW:500}
);
if (deep.totalDynamicHead <= sixty.totalDynamicHead || deep.motorKw <= sixty.motorKw) throw new Error("aquifer-depth link regression");
if (deep.panelW !== 500 || deep.panels <= 0) throw new Error("configurable module regression");
"""
    completed = subprocess.run([node, "-e", engine + checks], capture_output=True, text=True)
    assert completed.returncode == 0, completed.stderr


def test_farm_pdf_report_renders_two_offline_a4_pages_in_somali():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for the report generator regression")
    dashboard_path = Path(__file__).resolve().parents[1] / "app/web/dashboard.html"
    source = dashboard_path.read_text(encoding="utf-8")
    start = source.index("function htmlEscape")
    end = source.index("const fmtHa", start)
    report_engine = source[start:end]
    harness = r'''
let rendered = "", uiLang = "so";
const assessment = {depth:60, yieldM3:12, name:"Sool Aquifer", confidence:"High", lat:8.47, lng:47.35};
const pump = {depth:60, surfaceHead:20, allowanceHead:8, totalDynamicHead:88, pressureBar:8.6,
  motorHp:4.4, motorKw:3.25, flowLph:6000, panels:11, panelW:400, arrayKw:4.4, inverterKw:4.3,
  costs:{panels:1364,pump:1495,mounting:528,cabling:585,controllerInverter:893,installation:900,total:5765},
  equipment:["submersible borehole pump","MPPT solar pump controller/inverter","11 × 400 W PV modules"]};
const farm = {name:"Beer Laascaanood", history:[{type:"pathology_alert",pathology:"Powdery Mildew"}],
  poly:{getBounds:()=>({getCenter:()=>({lat:8.47,lng:47.35})})}};
const state = {selected:farm, aquiferAssessment:assessment, solarPump:pump, soil:"shabelle", flora:null};
const SOILS = {shabelle:{name:"Shabelle",texture:"sandy clay loam",ph:7.4}};
const DB = {fruitGroups:[["fruit",[{en:"Mango",ph:[5.5,8]}]]],vegetables:[{en:"Tomato",ph:[5.5,7.5]}],seedOils:[{en:"Sesame",ph:[5.5,8]}]};
const alphaFlora = (a,b)=>a.en.localeCompare(b.en);
const farmCoordinates = ()=>[[47.34,8.46],[47.36,8.46],[47.36,8.48],[47.34,8.48]];
const currentSoilSnapshot = ()=>({ph:7.2,n:18,p:9,k:110});
const N_BAND = value=>[value < 10 ? "LOW" : value <= 25 ? "adequate" : "HIGH"];
const P_BAND = value=>[value < 5 ? "LOW" : value <= 15 ? "adequate" : "HIGH"];
const K_BAND = value=>[value < 80 ? "LOW" : value <= 150 ? "adequate" : "HIGH"];
const fencingPlan = ()=>({area:2.4,perimeter:620});
const assessGroundwater = ()=>{};
const solarPumpSizing = ()=>pump;
const popup = {document:{open(){},write(value){rendered += value},close(){}},focus(){},print(){}};
const window = {_activeHwsdSample:{clay_pct:28},open:()=>popup};
const document = {getElementById:()=>({checked:true})};
global.setTimeout = ()=>{};
global.alert = message=>{throw new Error(message)};
exportFarmPdfReport();
if ((rendered.match(/<section class="page">/g)||[]).length !== 2) throw new Error("page-count regression");
for (const marker of ["@page{size:A4", "height:297mm", "Warbixinta Farsamo ee Beerta", "Ciid / Dhoobo", "Saliidda Abuurka", "Powdery Mildew", "<svg", "88 m / 8.6 bar", "$5,765"]) {
  if (!rendered.includes(marker)) throw new Error("missing report marker: " + marker);
}
if (rendered.includes("https://")) throw new Error("report acquired an external dependency");
'''
    completed = subprocess.run(
        [node, "-e", report_engine + harness], capture_output=True, text=True
    )
    assert completed.returncode == 0, completed.stderr


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
    for marker in ("MutationObserver", "Soomaali", "Khariidadda & Beeraha", "Falanqaynta Billaha Beeraha", "Dayrka Beeraha", "Cabbirka Bamka Qorraxda", "Bing Dayax-gacmeed + Magacyo", "Furaha API ayaa loo baahan yahay", "Xulashada Dhirta · Kaydka Sare ee LIMS", "Soo Dawi Warbixinta PDF", "Cudurada", "Saliidda Abuurka"):
        assert marker in i18n.text
    assert i18n.text.count('\":\"') >= 80
    assert '"Export PDF Report":"' not in i18n.text

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
