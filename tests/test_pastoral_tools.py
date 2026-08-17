"""Behavior regressions for reusable pastoral engineering browser widgets."""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "app/web/pastoral-tools.js"


def _run_node(source: str) -> None:
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for pastoral browser-tool regressions")
    completed = subprocess.run([node, "-e", source], capture_output=True, text=True)
    assert completed.returncode == 0, completed.stderr


def test_solar_pump_sizing_known_answer():
    source = SOURCE_PATH.read_text(encoding="utf-8")
    start = source.index("function roundUp")
    end = source.index("class SolarPumpWidget", start)
    engine = source[start:end]
    checks = r"""
const plan = calculateSolarPump({dailyWaterM3:30,totalDynamicHeadM:80});
if (plan.pumpPowerKw !== 2.5) throw new Error(`pump ${plan.pumpPowerKw}`);
if (plan.solarArrayKwp !== 3.4) throw new Error(`solar ${plan.solarArrayKwp}`);
if (plan.estimatedRuntimeHours !== 5.7) throw new Error(`runtime ${plan.estimatedRuntimeHours}`);
if (plan.designFlowM3h !== 5.3) throw new Error(`flow ${plan.designFlowM3h}`);
let rejected = 0;
for (const bad of [{dailyWaterM3:0,totalDynamicHeadM:80},{dailyWaterM3:30,totalDynamicHeadM:0}]) {
  try { calculateSolarPump(bad); } catch (error) { rejected += 1; }
}
if (rejected !== 2) throw new Error("invalid engineering inputs were accepted");
"""
    _run_node(engine + checks)


def test_fence_geometry_known_square():
    source = SOURCE_PATH.read_text(encoding="utf-8")
    start = source.index("function haversineMeters")
    end = source.index("class PastoralFencePlanner", start)
    geometry = "const EARTH_RADIUS_M=6371008.8;\n" + source[start:end]
    checks = r"""
const ring=[{lat:0,lng:0},{lat:0,lng:.01},{lat:.01,lng:.01},{lat:.01,lng:0}];
const perimeter=ringPerimeterMeters(ring,true);
const area=sphericalAreaM2(ring);
if (perimeter < 4440 || perimeter > 4460) throw new Error(`perimeter ${perimeter}`);
if (area < 1230000 || area > 1245000) throw new Error(`area ${area}`);
"""
    _run_node(geometry + checks)


def test_aquifer_fixture_is_explicitly_non_live_screening_data():
    import json

    payload = json.loads((ROOT / "app/web/dawaad.aquifers.geojson").read_text(encoding="utf-8"))
    assert payload["type"] == "FeatureCollection"
    assert payload["dataMode"] == "mock-screening"
    assert "VES" in payload["disclaimer"]
    assert len(payload["features"]) == 4
    assert all(feature["geometry"]["type"] == "Polygon" for feature in payload["features"])
