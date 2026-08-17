"""Permanent native catalog and exact Plant Information Panel regressions."""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "app/web/native-tree-suitability.js"

EXPECTED_TREES = {
    "Yicib": "Cordeauxia edulis",
    "Beeyo": "Boswellia sacra",
    "Xagar": "Commiphora myrrha",
    "Qudhac": "Acacia tortilis",
    "Gob": "Ziziphus spina-christi",
    "Timir": "Phoenix dactylifera",
    "Raqay/Xamar": "Tamarindus indica",
}


def test_native_tree_master_contains_requested_species_and_panel_styles():
    source = SOURCE.read_text(encoding="utf-8")
    for somali_name, scientific_name in EXPECTED_TREES.items():
        assert f'name: "{somali_name}"' in source
        assert f'scientificName: "{scientific_name}"' in source
    for marker in (
        "NATIVE_SOMALI_TREE_MASTER",
        "#10B981",
        "bg-emerald-600",
        "#F59E0B",
        "bg-amber-500",
        "#EF4444",
        "bg-rose-600",
        "🟢 Ku HABBOON (OPTIMAL MATCH)",
        "🟡 KHATAR DHEX-DHEXAAD (MODERATE RISK)",
        "🔴 AAN KU HABOONAYN (UNSUITABLE)",
        "#ECFDF5",
        "#FFE4E6",
        "#FEF3C7",
        "Cudurada · Pathology Alerts",
    ):
        assert marker in source


def test_native_master_merges_synchronously_without_indexeddb():
    node = shutil.which("node")
    if not node:
        pytest.skip("Node.js is required for native catalog regression")
    source = SOURCE.read_text(encoding="utf-8")
    harness = r'''
const calls=[];
global.window={
  AGRI_SHARED:{catalog:[],trees:[]},
  AGRI_DATA_STORE:{upsertMany(records){calls.push(records);return Promise.resolve(records);}}
};
global.document={readyState:"loading",addEventListener(){}};
eval(SOURCE);
const expected={"Yicib":"Cordeauxia edulis","Beeyo":"Boswellia sacra","Xagar":"Commiphora myrrha","Qudhac":"Acacia tortilis","Gob":"Ziziphus spina-christi","Timir":"Phoenix dactylifera","Raqay/Xamar":"Tamarindus indica"};
if (window.AGRI_SHARED.catalog.length !== 7 || window.AGRI_SHARED.trees.length !== 7) throw new Error("native master count");
for (const [name,sci] of Object.entries(expected)) {
  const item=window.AGRI_SHARED.catalog.find(record=>record.name===name);
  if (!item || item.scientificName!==sci || !item.pathologies.length) throw new Error(name);
}
if (calls.length!==1 || calls[0].length!==7) throw new Error("store handoff");
'''
    script = "const SOURCE=" + json.dumps(source) + ";\n" + harness
    completed = subprocess.run([node, "-e", script], capture_output=True, text=True)
    assert completed.returncode == 0, completed.stderr


def test_gis_and_lims_load_native_master_before_application_sources():
    app = create_app()
    app.state.pool = None
    app.state.terrain = None
    client = TestClient(app)
    dashboard = client.get("/dashboard").text
    lims = client.get("/lims").text
    script_tag = '<script src="/web/native-tree-suitability.js"></script>'
    assert script_tag in dashboard
    assert script_tag in lims
    assert dashboard.index(script_tag) < dashboard.index("const state=")
    assert lims.index(script_tag) < lims.index('<script src="/web/lims.src.js"></script>')
