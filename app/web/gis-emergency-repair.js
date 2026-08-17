/* Emergency Leaflet canvas, layer event, activeFeature and native-pin repair. */
(function installGisEmergencyRepair(global) {
  "use strict";
  if (global.__GIS_EMERGENCY_REPAIR__) return;
  global.__GIS_EMERGENCY_REPAIR__ = true;

  const NATIVE = [
    { id: "repair-yicib", name: "Yicib", scientific: "Cordeauxia edulis", ph: [6.5, 8], color: "#10B981", offset: [0.018, -0.024] },
    { id: "repair-moxor", name: "Moxor", scientific: "Boswellia sacra", ph: [7, 8.5], color: "#22C55E", offset: [0.032, 0.006] },
    { id: "repair-xaggar", name: "Xaggar", scientific: "Commiphora myrrha", ph: [6.5, 8], color: "#84CC16", offset: [-0.014, 0.029] },
    { id: "repair-qudac", name: "Qudac", scientific: "Acacia tortilis", ph: [6, 8.5], color: "#16A34A", offset: [-0.032, -0.008] },
    { id: "repair-gob", name: "Gob", scientific: "Ziziphus spina-christi", ph: [6, 8.5], color: "#059669", offset: [0.004, 0.038] },
    { id: "repair-timir", name: "Timir", scientific: "Phoenix dactylifera", ph: [7, 8.5], color: "#65A30D", offset: [-0.023, -0.035] },
  ];

  const resolve = (name) => {
    try { return global.eval(name); } catch (_) { return global[name]; }
  };
  const isSomali = () => localStorage.getItem("agri_lang") === "so";
  const escape = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

  global.GIS_REPAIR_STATE = global.GIS_REPAIR_STATE || {
    activeFeature: null,
    map: null,
    nativeLayer: null,
    osmFallback: null,
  };

  function injectCss() {
    if (document.getElementById("gis-emergency-repair-css")) return;
    const style = document.createElement("style");
    style.id = "gis-emergency-repair-css";
    style.textContent = `
      html,body{height:100%!important;width:100%!important}
      #workspace{min-height:0!important;width:100%!important}
      #map-shell{min-height:480px!important;width:100%!important}
      .map-frame{position:relative!important;min-height:480px!important;width:100%!important}
      #map{display:block!important;height:100%!important;min-height:480px!important;width:100%!important;background:#0f172a!important}
      #gis-repair-panel{overflow:hidden;border:1px solid #475569;border-radius:12px;background:#0f172a;color:#e2e8f0;box-shadow:0 12px 38px #0007}
      #gis-repair-native-strip button{cursor:pointer!important;pointer-events:auto!important}
      #flora-body>div{pointer-events:auto!important;cursor:pointer!important}
      .leaflet-interactive{pointer-events:auto!important}
      .gis-repair-pin{filter:drop-shadow(0 3px 6px #0008)}
    `;
    document.head.appendChild(style);
  }

  function mapInstance() {
    const map = resolve("map") || global.map;
    if (map && typeof map.invalidateSize === "function") {
      global.GIS_REPAIR_STATE.map = map;
      return map;
    }
    return null;
  }

  function appState() {
    return resolve("state") || global.state || null;
  }

  function database() {
    return resolve("DB") || global.DB || null;
  }

  function call(name, ...args) {
    const fn = resolve(name);
    if (typeof fn === "function") {
      try { return fn(...args); } catch (error) { console.warn(`${name} repair call failed`, error); }
    }
    return null;
  }

  function resizeMap() {
    const map = mapInstance();
    if (!map) return;
    [0, 50, 160, 360, 700].forEach((delay) => global.setTimeout(() => {
      try { map.invalidateSize({ pan: false, animate: false }); } catch (_) {}
    }, delay));
  }

  function bindResize() {
    const map = mapInstance();
    if (!map) return;
    global.addEventListener("resize", resizeMap);
    document.querySelectorAll("#sidebar-toggle,[onclick*='toggleLeft'],[onclick*='toggleRight']")
      .forEach((button) => button.addEventListener("click", resizeMap, true));
    const targets = [document.getElementById("workspace"), document.getElementById("left"), document.getElementById("right"), document.getElementById("map-shell")].filter(Boolean);
    if (global.ResizeObserver) {
      const observer = new ResizeObserver(resizeMap);
      targets.forEach((target) => observer.observe(target));
    }
    const mutations = new MutationObserver(resizeMap);
    targets.forEach((target) => mutations.observe(target, { attributes: true, attributeFilter: ["class", "style"] }));
    resizeMap();
  }

  function ensurePanel() {
    let panel = document.getElementById("gis-repair-panel");
    if (panel) return panel;
    const right = document.getElementById("right");
    panel = document.createElement("section");
    panel.id = "gis-repair-panel";
    panel.className = "mx-3 mt-3 flex-none";
    panel.innerHTML = `<div style="padding:12px;color:#94a3b8">${isSomali() ? "Dooro Beer ama geed si aad u aragto qiimaynta." : "Select a farm polygon or plant to view suitability."}</div>`;
    const existing = document.getElementById("plant-suitability-card");
    if (existing) existing.replaceWith(panel);
    else if (right) right.prepend(panel);
    else {
      panel.style.cssText += ";position:fixed;right:14px;top:70px;z-index:100000;width:min(430px,calc(100vw - 28px));max-height:calc(100vh - 90px);overflow:auto";
      document.body.appendChild(panel);
    }
    return panel;
  }

  function openRightPanel() {
    const right = document.getElementById("right");
    if (right) {
      right.classList.remove("translate-x-full");
      right.classList.add("plant-selector-active");
      right.style.pointerEvents = "auto";
    }
  }

  function statusTheme(status) {
    return {
      green: { color: "#10B981", so: "🟢 HABBOON", en: "🟢 OPTIMAL MATCH" },
      yellow: { color: "#F59E0B", so: "🟡 KHATAR DHEX-DHEXAAD", en: "🟡 MODERATE RISK" },
      red: { color: "#EF4444", so: "🔴 KU HABBOONAAN LA'AAN", en: "🔴 UNSUITABLE" },
    }[status];
  }

  function activeStatus(feature) {
    if (feature.type === "water-point") {
      const text = `${feature.name} ${feature.properties?.status || ""}`.toLowerCase();
      return /dry|qalalan/.test(text) ? "red" : /stress|alert|digniin/.test(text) ? "yellow" : "green";
    }
    if (feature.type === "farm") {
      const state = appState();
      return state?.flora ? "green" : "yellow";
    }
    if (feature.type === "native-tree") {
      return appState()?.selected ? "green" : "yellow";
    }
    return "yellow";
  }

  function fallbackPanel(feature, status) {
    const so = isSomali();
    const theme = statusTheme(status);
    const panel = ensurePanel();
    const title = escape(feature.name || (so ? "Walaxda la doortay" : "Selected feature"));
    const type = escape(feature.type || "feature");
    panel.innerHTML = `
      <div style="background:${theme.color};padding:12px;color:white">
        <div style="font-size:10px;font-weight:900">${so ? "GUDDIGA KU HABBOONAANTA DHIRTA" : "PLANT SUITABILITY PANEL"}</div>
        <div style="font-size:16px;font-weight:950;margin-top:3px">${so ? theme.so : theme.en}</div>
        <div style="font-size:11px;margin-top:3px">${title} · ${type}</div>
      </div>
      <div style="padding:11px">
        <div style="background:#ECFDF5;color:#064E3B;border-left:4px solid #10B981;border-radius:6px;padding:9px">
          <b>${so ? "Talooyinka" : "Do's"}</b><div style="margin-top:4px">${so ? "Dooro Beer, xaqiiji Ciidda iyo biyaha, kadibna dooro geedka ku habboon." : "Select a farm, verify soil and water, then choose the matching plant."}</div>
        </div>
        <div style="margin-top:8px;background:#FFE4E6;color:#881337;border-left:4px solid #EF4444;border-radius:6px;padding:9px">
          <b>${so ? "Digniinaha" : "Don'ts"}</b><div style="margin-top:4px">${so ? "Ha ku tiirsanaan xog aan la xaqiijin ama biyo milix badan." : "Do not rely on unverified soil or saline water."}</div>
        </div>
      </div>`;
  }

  function setActiveFeature(feature) {
    const state = appState();
    global.GIS_REPAIR_STATE.activeFeature = feature;
    if (state) state.activeFeature = feature;
    openRightPanel();
    const status = activeStatus(feature);
    if (state?.selected && state?.flora) {
      const render = resolve("renderPlantSuitability") || global.renderPlantSuitability;
      if (typeof render === "function") {
        try { render(); return; } catch (error) { console.warn("Suitability render fallback", error); }
      }
    }
    fallbackPanel(feature, status);
  }

  function ensureNativeCatalog() {
    const shared = global.AGRI_SHARED;
    if (shared?.catalog) {
      NATIVE.forEach((tree) => {
        if (!shared.catalog.some((item) => item.id === tree.id || item.name === tree.name)) {
          shared.catalog.push({
            id: tree.id,
            name: tree.name,
            somaliName: tree.name,
            scientificName: tree.scientific,
            category: "Tree",
            categorySo: "Geedaha",
            family: tree.scientific.split(" ")[0],
            rootDepth: "Deep",
            nitrogenDemand: /Cordeauxia|Acacia|Tamarindus/.test(tree.scientific) ? "Nitrogen Fixer" : "Light Feeder",
            minPh: tree.ph[0], maxPh: tree.ph[1], maturityDays: 1460,
            seasons: ["Gu"], color: tree.color, region: "Somalia",
            pathologies: [{ disease: `${tree.name} Root Decline`, cause: "Root disease and water stress complex", symptoms: ["Canopy decline"], immediate: ["Inspect drainage"], remedy: "Confirm diagnosis and improve root-zone conditions." }],
          });
        }
      });
    }
    const db = database();
    if (db?.nativeTrees) {
      NATIVE.forEach((tree) => {
        if (!db.nativeTrees.some((item) => item.en === tree.name || item.sci === tree.scientific)) {
          db.nativeTrees.push({
            catalogId: tree.id, en: tree.name, somali: tree.name, sci: tree.scientific,
            ph: tree.ph, group: "native", kind: "tree", rootDepth: "Deep",
            nitrogenDemand: "Light Feeder", spacing: [8, 8], kgYr: [5, 30],
            water: { mode: "tree", lTreeWeek: 25 }, season: "Gu",
            output: "Native Somali tree", care: "Use verified soil, drainage and establishment water.",
            avoid: "Avoid waterlogging and saline irrigation.",
            pathologies: [{ name: `${tree.name} Root Decline`, cause: "Root disease and water stress complex", action: "Verify drainage and diagnose affected roots." }],
          });
        }
      });
    }
  }

  function runtimePlant(tree) {
    const db = database();
    if (!db) return null;
    const all = [
      ...(db.nativeTrees || []),
      ...(db.fruitGroups || []).flatMap((group) => group[1] || []),
      ...(db.seedOils || []), ...(db.crops || []), ...(db.vegetables || []),
    ];
    return all.find((item) => item.en === tree.name || item.sci === tree.scientific || item.catalogId === tree.id) || null;
  }

  function selectPlant(plant, featureName) {
    const state = appState();
    if (state && plant) {
      state.flora = plant;
      if (state.selected) state.selected.selectedPlantId = plant.catalogId || plant.sci || plant.en;
      call("renderFlora");
      call("renderSim");
      call("renderPlantSuitability");
    }
    setActiveFeature({ type: "native-tree", id: plant?.catalogId || featureName, name: featureName, plant });
  }

  function addNativePins() {
    const map = mapInstance();
    const L = global.L;
    if (!map || !L || global.GIS_REPAIR_STATE.nativeLayer) return;
    const layer = L.layerGroup().addTo(map);
    NATIVE.forEach((tree) => {
      const marker = L.circleMarker([8.4772 + tree.offset[0], 47.3597 + tree.offset[1]], {
        radius: 8, color: "#fff", weight: 2, fillColor: tree.color, fillOpacity: 0.96,
        className: "gis-repair-pin",
      });
      marker.bindTooltip(`<b>${escape(tree.name)}</b><br><i>${escape(tree.scientific)}</i>`, { direction: "top" });
      marker.on("click", () => selectPlant(runtimePlant(tree), tree.name));
      marker.addTo(layer);
    });
    global.GIS_REPAIR_STATE.nativeLayer = layer;
  }

  function bindLayer(layer, feature) {
    if (!layer || layer.__gisRepairBound || typeof layer.on !== "function") return;
    layer.__gisRepairBound = true;
    layer.on("click", () => setActiveFeature(feature()));
  }

  function bindDynamicLayers() {
    const state = appState();
    (state?.aois || []).forEach((farm) => bindLayer(farm.poly, () => ({
      type: "farm", id: farm.id, name: farm.name, farm,
    })));
    ["monitoringLayer", "labLayer", "aquiferLayer"].forEach((name) => {
      const group = resolve(name);
      if (!group || typeof group.eachLayer !== "function") return;
      group.eachLayer((layer) => bindLayer(layer, () => {
        const tooltip = layer.getTooltip?.()?.getContent?.();
        return {
          type: name === "monitoringLayer" ? "water-point" : name.replace("Layer", ""),
          id: layer._leaflet_id,
          name: typeof tooltip === "string" ? tooltip.replace(/<[^>]+>/g, " ").trim() : name,
          layer,
        };
      }));
    });
  }

  function bindPlantCards() {
    const body = document.getElementById("flora-body");
    if (!body || body.__gisRepairBound) return;
    body.__gisRepairBound = true;
    body.addEventListener("click", (event) => {
      if (event.target.closest("select,input,option")) return;
      const card = event.target.closest(".rounded-xl");
      if (!card) return;
      const clickedName = card.querySelector("b")?.textContent?.trim();
      global.setTimeout(() => {
        const state = appState();
        if (!state) return;
        if ((!state.flora || state.flora.en !== clickedName) && clickedName) {
          const db = database();
          const all = db ? [
            ...(db.nativeTrees || []), ...(db.fruitGroups || []).flatMap((group) => group[1] || []),
            ...(db.seedOils || []), ...(db.crops || []), ...(db.vegetables || []),
          ] : [];
          state.flora = all.find((plant) => plant.en === clickedName || plant.somali === clickedName) || null;
        }
        if (state.flora) {
          call("renderFlora"); call("renderSim"); call("renderPlantSuitability");
          setActiveFeature({ type: "plant", id: state.flora.catalogId || state.flora.sci, name: state.flora.en, plant: state.flora });
        }
      }, 0);
    }, true);
  }

  function ensureTileFallback() {
    const map = mapInstance();
    const L = global.L;
    if (!map || !L || global.GIS_REPAIR_STATE.osmFallback) return;
    let hasTiles = false;
    map.eachLayer((layer) => { if (layer instanceof L.TileLayer) hasTiles = true; });
    if (!hasTiles) {
      global.GIS_REPAIR_STATE.osmFallback = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }
      ).addTo(map);
    }
  }

  function boot() {
    injectCss();
    const map = mapInstance();
    if (!map) {
      global.setTimeout(boot, 250);
      return;
    }
    ensurePanel();
    ensureNativeCatalog();
    bindResize();
    addNativePins();
    bindPlantCards();
    bindDynamicLayers();
    ensureTileFallback();
    global.setInterval(() => {
      bindDynamicLayers();
      bindPlantCards();
    }, 700);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})(window);
