/* Permanent native-tree fallback + exact Plant Information Panel styling. */
(function installNativeTreeSuitability(global) {
  "use strict";

  const pathology = (disease, cause, remedy) => ({
    disease,
    cause,
    symptoms: ["Canopy decline or lesions", "Reduced establishment vigor"],
    immediate: ["Inspect affected plants and isolate damaged material"],
    remedy,
  });

  const defaults = {
    category: "Tree",
    categorySo: "Geedaha",
    rootDepth: "Deep",
    nitrogenDemand: "Light Feeder",
    maturityDays: 1460,
    seasons: ["Gu establishment"],
    color: "#15803d",
    region: "Somalia · permanent native fallback",
  };

  const NATIVE_SOMALI_TREE_MASTER = [
    {
      id: "native_yicib_cordeauxia",
      name: "Yicib",
      somaliName: "Yicib",
      englishName: "Yeheb Nut",
      scientificName: "Cordeauxia edulis",
      family: "Fabaceae",
      minPh: 6.5,
      maxPh: 8,
      nitrogenDemand: "Nitrogen Fixer",
      care: "Direct-seed into deep, freely drained red sandy soil; protect the sensitive taproot.",
      avoid: "Avoid Dhoobo, waterlogging, saline irrigation and transplant damage.",
      waterMm: 350,
      pathologies: [
        pathology("Yicib Root Rot", "Phytophthora/Fusarium complex", "Improve drainage and use clean direct-sown seed."),
        pathology("Yicib Dieback", "Drought stress with opportunistic cankers", "Protect establishment water and prune dead wood hygienically."),
      ],
    },
    {
      id: "native_beeyo_boswellia_sacra",
      name: "Beeyo",
      somaliName: "Beeyo",
      englishName: "Frankincense Tree",
      scientificName: "Boswellia sacra",
      family: "Burseraceae",
      minPh: 7,
      maxPh: 8.5,
      care: "Establish on rocky limestone slopes with excellent drainage and very light irrigation.",
      avoid: "Avoid deep Dhoobo, standing water, over-irrigation and bark tapping before maturity.",
      waterMm: 220,
      pathologies: [
        pathology("Frankincense Canker", "Botryosphaeriaceae canker complex", "Sanitize tools, protect wounds and remove dead branches."),
        pathology("Frankincense Root Rot", "Soil-borne oomycetes", "Keep the root crown dry and improve slope drainage."),
      ],
    },
    {
      id: "native_xagar_commiphora",
      name: "Xagar",
      somaliName: "Xagar",
      englishName: "Myrrh Tree",
      scientificName: "Commiphora myrrha",
      family: "Burseraceae",
      minPh: 6.5,
      maxPh: 8,
      care: "Plant in hot, rocky, freely drained Ciid with minimal supplemental irrigation.",
      avoid: "Avoid humid pockets, waterlogging and excessive resin tapping.",
      waterMm: 240,
      pathologies: [
        pathology("Myrrh Stem Canker", "Opportunistic fungal canker", "Prune only in dry weather and disinfect cutting tools."),
        pathology("Myrrh Root Decline", "Root-rot complex under excess moisture", "Reduce irrigation and improve drainage."),
      ],
    },
    {
      id: "native_qudhac_acacia_tortilis",
      name: "Qudhac",
      somaliName: "Qudhac",
      englishName: "Umbrella Thorn Acacia",
      scientificName: "Acacia tortilis",
      family: "Fabaceae",
      minPh: 6,
      maxPh: 8.5,
      nitrogenDemand: "Nitrogen Fixer",
      care: "Use scarified seed, protect seedlings from browsing and establish in well-drained dryland soil.",
      avoid: "Avoid prolonged flooding, compacted root zones and uncontrolled charcoal cutting.",
      waterMm: 280,
      pathologies: [
        pathology("Acacia Wilt", "Fusarium vascular wilt complex", "Remove confirmed wilted material and prevent soil transfer."),
        pathology("Acacia Borer Damage", "Wood-boring insect complex", "Reduce tree stress and remove severely infested branches."),
      ],
    },
    {
      id: "native_gob_ziziphus_spina",
      name: "Gob",
      somaliName: "Gob",
      englishName: "Christ's Thorn Jujube",
      scientificName: "Ziziphus spina-christi",
      family: "Rhamnaceae",
      minPh: 6,
      maxPh: 8.5,
      care: "Plant in deep Ciid or loam, mulch the basin and provide establishment irrigation.",
      avoid: "Avoid persistent waterlogging and high-salinity irrigation during seedling establishment.",
      waterMm: 480,
      pathologies: [
        pathology("Jujube Fruit Fly", "Carpomyia fruit-fly complex", "Collect fallen fruit and monitor traps before ripening."),
        pathology("Jujube Powdery Mildew", "Oidium species", "Open the canopy and use locally registered controls when necessary."),
      ],
    },
    {
      id: "native_timir_phoenix",
      name: "Timir",
      somaliName: "Timir",
      englishName: "Date Palm",
      scientificName: "Phoenix dactylifera",
      family: "Arecaceae",
      minPh: 7,
      maxPh: 8.5,
      nitrogenDemand: "Heavy Feeder",
      maturityDays: 1825,
      care: "Use certified offshoots or tissue culture, deep irrigation, drainage and planned pollination.",
      avoid: "Avoid shallow saline water without leaching, stagnant root zones and uncertified offshoots.",
      waterMm: 1300,
      pathologies: [
        pathology("Bayoud Wilt", "Fusarium oxysporum f. sp. albedinis", "Quarantine suspected palms and use certified resistant material."),
        pathology("Red Palm Weevil", "Rhynchophorus ferrugineus", "Monitor, report and treat infestations under local phytosanitary guidance."),
      ],
    },
    {
      id: "native_raqay_tamarind",
      name: "Raqay/Xamar",
      somaliName: "Raqay/Xamar",
      englishName: "Tamarind",
      scientificName: "Tamarindus indica",
      family: "Fabaceae",
      minPh: 5.5,
      maxPh: 7.5,
      nitrogenDemand: "Nitrogen Fixer",
      care: "Provide deep loam or sandy loam, wide spacing and protected establishment irrigation.",
      avoid: "Avoid shallow caliche, severe salinity, root confinement and poorly drained Dhoobo.",
      waterMm: 550,
      pathologies: [
        pathology("Tamarind Wilt", "Fusarium/Lasiodiplodia complex", "Improve drainage and remove confirmed declining branches."),
        pathology("Tamarind Fruit Borer", "Fruit-boring insect complex", "Collect damaged pods and maintain orchard sanitation."),
      ],
    },
  ].map((item) => Object.freeze({ ...defaults, ...item }));

  global.NATIVE_SOMALI_TREE_MASTER = Object.freeze(NATIVE_SOMALI_TREE_MASTER);

  function mergeMasterCatalog() {
    const shared = global.AGRI_SHARED;
    if (!shared || !Array.isArray(shared.catalog)) return;
    const merged = new Map(shared.catalog.map((item) => [item.id, item]));
    NATIVE_SOMALI_TREE_MASTER.forEach((item) => merged.set(item.id, item));
    shared.catalog.splice(0, shared.catalog.length, ...merged.values());
    if (Array.isArray(shared.trees)) {
      const trees = new Map(shared.trees.map((item) => [item.id, item]));
      NATIVE_SOMALI_TREE_MASTER.forEach((item) => trees.set(item.id, item));
      shared.trees.splice(0, shared.trees.length, ...trees.values());
    }
    if (global.AGRI_DATA_STORE && typeof global.AGRI_DATA_STORE.upsertMany === "function") {
      global.AGRI_DATA_STORE.upsertMany(NATIVE_SOMALI_TREE_MASTER).catch(console.warn);
    }
  }

  mergeMasterCatalog();

  const statusRank = { green: 0, yellow: 1, red: 2 };
  const worst = (...values) => values.reduce(
    (current, value) => statusRank[value] > statusRank[current] ? value : current,
    "green",
  );

  function metricStatuses(plant, metrics) {
    const haystack = `${plant.en} ${plant.sci} ${plant.care} ${plant.avoid}`.toLowerCase();
    const low = Number(plant.ph?.[0] ?? 5.5);
    const high = Number(plant.ph?.[1] ?? 7.5);
    const gap = metrics.ph < low ? low - metrics.ph : metrics.ph > high ? metrics.ph - high : 0;
    const ph = gap === 0 ? "green" : gap <= 0.8 ? "yellow" : "red";

    const drainageSensitive = /waterlog|standing water|poor drainage|poorly drained|root rot|perfect drainage/.test(haystack);
    const demanding = plant.nitrogenDemand === "Heavy Feeder" || Number(plant.water?.mm || 0) >= 800;
    const soil = metrics.soilCode === "clay" && drainageSensitive
      ? (Number(metrics.ec || 0) > 2 ? "red" : "yellow")
      : metrics.soilCode === "sandy" && demanding ? "yellow" : "green";

    const highWater = Number(plant.water?.mm || 0) >= 900 || /banana|papaya|coconut|citrus|rice|celery|date palm/.test(haystack);
    const depth = metrics.aquiferDepth;
    const groundwater = depth == null ? "yellow"
      : ((highWater && depth > 150) || depth > 240) ? "red"
      : (depth > 120 || (highWater && depth > 80)) ? "yellow" : "green";

    const saltSensitive = /avocado|banana|papaya|citrus|orange|lemon|lime|strawberry|bean|onion|carrot|potato|kiwi/.test(haystack);
    const saltTolerant = /salvadora|date palm|phoenix|jojoba|olive|pomegranate|fig|sesame|sorghum|millet|barley|quinoa|beet/.test(haystack);
    const soilLimit = saltTolerant ? 6 : saltSensitive ? 1.5 : 3;
    const waterLimit = saltTolerant ? 4500 : saltSensitive ? 1800 : 2800;
    const soilSalinity = metrics.ec == null ? "yellow"
      : metrics.ec > soilLimit + 1.5 ? "red"
      : metrics.ec > soilLimit ? "yellow" : "green";
    const waterSalinity = metrics.conductivity == null ? "yellow"
      : metrics.conductivity > waterLimit * 1.5 ? "red"
      : metrics.conductivity > waterLimit ? "yellow" : "green";

    return { ph, groundwater, soil, salinity: worst(soilSalinity, waterSalinity) };
  }

  function enhanceGis() {
    const rightPanel = document.getElementById("right");
    const floraBody = document.getElementById("flora-body");
    if (!rightPanel || !floraBody) return;

    let context = document.getElementById("plant-selector-context");
    if (!context) {
      context = document.createElement("div");
      context.id = "plant-selector-context";
      context.className = "mt-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-2 text-xs text-slate-400";
      context.textContent = "Draw or select a Beer polygon to activate Plant Selector.";
      const search = document.getElementById("flora-search");
      if (search) search.before(context);
    }
    let suitabilityCard = document.getElementById("plant-suitability-card");
    if (!suitabilityCard) {
      suitabilityCard = document.createElement("div");
      suitabilityCard.id = "plant-suitability-card";
      suitabilityCard.className = "mx-3 mt-3 flex-none rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400";
      suitabilityCard.textContent = "Select a Beer polygon and plant to run suitability analysis.";
      floraBody.before(suitabilityCard);
    }

    if (typeof global.DB !== "undefined" || typeof DB !== "undefined") {
      const database = typeof DB !== "undefined" ? DB : global.DB;
      NATIVE_SOMALI_TREE_MASTER.forEach((master) => {
        const runtime = database.nativeTrees.find((item) => item.catalogId === master.id);
        if (runtime) Object.assign(runtime, {
          en: master.name,
          somali: master.somaliName,
          sci: master.scientificName,
          care: master.care,
          avoid: master.avoid,
          rootDepth: master.rootDepth,
          nitrogenDemand: master.nitrogenDemand,
          water: { mode: "orchard", mm: master.waterMm },
          pathologies: master.pathologies.map((record) => ({
            name: record.disease,
            cause: record.cause,
            action: record.remedy || record.immediate?.[0] || "Confirm diagnosis and apply integrated management.",
          })),
        });
      });
    }

    const baseEvaluate = typeof global.evaluatePlantSuitability === "function"
      ? global.evaluatePlantSuitability
      : function fallbackEvaluation(plant, metrics) {
          const statuses = metricStatuses(plant, metrics);
          const status = worst(statuses.ph, statuses.groundwater, statuses.soil, statuses.salinity);
          return {
            status,
            score: status === "green" ? 92 : status === "yellow" ? 68 : 28,
            checks: [],
            recommendations: [plant.care || "Follow verified establishment guidance."],
            phRange: plant.ph || [5.5, 7.5],
          };
        };
    const baseRender = typeof global.renderPlantSuitability === "function"
      ? global.renderPlantSuitability
      : function fallbackRender() {
          suitabilityCard.textContent = "Select a Beer polygon and plant to run suitability analysis.";
        };
    const metricsProvider = typeof global.activePolygonSuitabilityMetrics === "function"
      ? global.activePolygonSuitabilityMetrics
      : (typeof activePolygonSuitabilityMetrics === "function" ? activePolygonSuitabilityMetrics : function fallbackMetrics(farm) {
          const appState = typeof state !== "undefined" ? state : global.state;
          const profile = typeof SOILS !== "undefined" ? (SOILS[appState.soil] || SOILS.shabelle) : {};
          const center = farm.poly.getBounds().getCenter();
          const classification = /clay|vertis|dhoobo/i.test(`${profile.texture} ${profile.wrb}`)
            ? { code: "clay", label: "Dhoobo / Clay" }
            : /sand|arenosol|gypsi/i.test(`${profile.texture} ${profile.wrb}`)
              ? { code: "sandy", label: "Ciid / Sandy" }
              : { code: "loam", label: "Ciid isku-dhafan / Loam" };
          let aquiferDepth = null;
          let aquiferName = "Unmapped";
          if (typeof aquiferAt === "function") {
            const aquifer = aquiferAt(center.lat, center.lng);
            if (aquifer) {
              const signal = Math.abs(Math.sin(center.lat * 31.7 + center.lng * 7.9));
              aquiferDepth = Math.round(aquifer.depth[0] + signal * (aquifer.depth[1] - aquifer.depth[0]));
              aquiferName = aquifer.name;
            }
          }
          let station = null;
          if (typeof GROUNDWATER_NETWORK !== "undefined" && global.L) {
            station = GROUNDWATER_NETWORK.stations.reduce((best, item) => {
              const distance = center.distanceTo(global.L.latLng(item.lat, item.lon));
              return !best || distance < best.distance ? { item, distance } : best;
            }, null)?.item;
          }
          return {
            ph: Number(profile.ph ?? 7), ec: Number(profile.ec ?? 0),
            classification: classification.label, soilCode: classification.code,
            aquiferDepth, aquiferName,
            conductivity: station?.conductivity ?? null, salinity: station?.salinity ?? null,
            climateZone: "Arid pastoral",
          };
        });

    global.evaluatePlantSuitability = function nativeMetricEvaluation(plant, metrics, language) {
      const result = baseEvaluate(plant, metrics, language);
      result.metricStatuses = metricStatuses(plant, metrics);
      result.label = {
        green: { emoji: "🟢", name: "🟢 Ku HABBOON (OPTIMAL MATCH)" },
        yellow: { emoji: "🟡", name: "🟡 KHATAR DHEX-DHEXAAD (MODERATE RISK)" },
        red: { emoji: "🔴", name: "🔴 AAN KU HABOONAYN (UNSUITABLE)" },
      }[result.status];
      return result;
    };

    const escape = (value) => String(value ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    const badge = (status) => {
      const styles = {
        green: "background:#D1FAE5;color:#065F46;border:1px solid #10B981",
        yellow: "background:#FEF3C7;color:#92400E;border:1px solid #F59E0B",
        red: "background:#FFE4E6;color:#9F1239;border:1px solid #EF4444",
      };
      const text = { green: "GREEN", yellow: "YELLOW", red: "RED" }[status];
      return `<span style="${styles[status]};border-radius:999px;padding:2px 7px;font-size:9px;font-weight:900">${text}</span>`;
    };

    global.renderPlantSuitability = function nativePlantInformationPanel() {
      if (typeof state === "undefined" || !state.selected || !state.flora) {
        return baseRender();
      }
      const card = document.getElementById("plant-suitability-card");
      const context = document.getElementById("plant-selector-context");
      const farm = state.selected;
      const plant = state.flora;
      const metrics = metricsProvider(farm);
      const result = global.evaluatePlantSuitability(plant, metrics, typeof uiLang === "undefined" ? "en" : uiLang);
      state.suitability = result;

      context.innerHTML = `<b class="text-emerald-300">${escape(farm.name)}</b> · active Beer · ${escape(plant.en)}`;
      const headers = {
        green: { background: "#10B981", css: "bg-emerald-600" },
        yellow: { background: "#F59E0B", css: "bg-amber-500" },
        red: { background: "#EF4444", css: "bg-rose-600" },
      };
      const header = headers[result.status];
      const rows = [
        ["pH Level", `${metrics.ph ?? "—"} · target ${result.phRange.join("–")}`, result.metricStatuses.ph],
        ["Groundwater Depth", `${metrics.aquiferDepth ?? "—"} m · ${escape(metrics.aquiferName)}`, result.metricStatuses.groundwater],
        ["Soil Classification (Ciid/Dhoobo)", escape(metrics.classification), result.metricStatuses.soil],
        ["Salinity", `${metrics.ec ?? "—"} dS/m · ${metrics.salinity ?? "—"} g/L · ${metrics.conductivity ?? "—"} µS/cm`, result.metricStatuses.salinity],
      ];
      const dos = result.recommendations.length
        ? result.recommendations
        : [plant.care || "Follow the recommended establishment and irrigation programme."];
      const donts = [plant.avoid || "Avoid unverified soil, drainage and irrigation-water conditions."];
      result.checks.filter((check) => check.level === 2).slice(0, 2).forEach((check) => donts.push(check.text));
      const diseases = (plant.pathologies || []).slice(0, 3);

      card.className = "mx-3 mt-3 flex-none overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-0 text-xs";
      card.innerHTML = `
        <div class="${header.css}" style="background:${header.background};padding:12px;color:white">
          <div style="font-size:10px;font-weight:800;opacity:.88">PLANT INFORMATION PANEL · ${escape(farm.name)}</div>
          <div style="font-size:15px;font-weight:950;margin-top:3px">${result.label.name}</div>
          <div style="font-size:10px;margin-top:2px">${escape(plant.somali || plant.en)} · ${escape(plant.en)} · <i>${escape(plant.sci)}</i> · ${result.score}/100</div>
        </div>
        <div style="padding:10px">
          <div style="display:grid;gap:6px">
            ${rows.map(([label, value, status]) => `<div style="display:grid;grid-template-columns:minmax(120px,1fr) minmax(130px,1.2fr) auto;gap:7px;align-items:center;border:1px solid #334155;border-radius:8px;padding:7px;background:#020617"><b style="color:#CBD5E1">${label}</b><span style="color:#E2E8F0">${value}</span>${badge(status)}</div>`).join("")}
          </div>
          <div style="margin-top:8px;background:#ECFDF5;color:#064E3B;border-left:4px solid #10B981;border-radius:6px;padding:9px">
            <b>Do's · Talooyinka</b><ul style="margin:5px 0 0;padding-left:17px">${dos.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
          </div>
          <div style="margin-top:8px;background:#FFE4E6;color:#881337;border-left:4px solid #EF4444;border-radius:6px;padding:9px">
            <b>Don'ts · Digniinaha</b><ul style="margin:5px 0 0;padding-left:17px">${donts.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
          </div>
          <div style="margin-top:8px;background:#FEF3C7;color:#78350F;border:1px solid #F59E0B;border-radius:6px;padding:9px">
            <b>⚠ Cudurada · Pathology Alerts</b>
            ${diseases.length ? `<ul style="margin:5px 0 0;padding-left:17px">${diseases.map((item) => `<li><b>${escape(item.name || item.disease)}</b> — ${escape(item.cause)}${item.action || item.remedy ? ` · ${escape(item.action || item.remedy)}` : ""}</li>`).join("")}</ul>` : "<div style='margin-top:5px'>No linked pathology record; request laboratory screening.</div>"}
          </div>
          <div style="margin-top:7px;color:#94A3B8;font-size:9px">Decision-support only: verify field/laboratory soil, VES, drainage and irrigation-water quality.</div>
        </div>`;
    };

    function activateSelector(farm) {
      if (!farm) return;
      rightPanel.classList.remove("translate-x-full");
      rightPanel.classList.add("plant-selector-active");
      context.innerHTML = `<b class="text-emerald-300">${escape(farm.name || "Beer")}</b> · active Beer`;
      if (typeof renderTabs === "function") renderTabs();
      if (typeof renderFlora === "function") renderFlora();
      global.renderPlantSuitability();
    }

    const originalSelect = typeof global.selectAoi === "function"
      ? global.selectAoi
      : (typeof selectAoi === "function" ? selectAoi : null);
    if (originalSelect && !originalSelect.__nativeSelectorWrapped) {
      const wrappedSelect = function wrappedPolygonPlantSelector(farm) {
        const result = originalSelect(farm);
        global.setTimeout(() => activateSelector(farm), 0);
        return result;
      };
      wrappedSelect.__nativeSelectorWrapped = true;
      global.selectAoi = wrappedSelect;
    }

    floraBody.addEventListener("click", () => global.setTimeout(() => {
      if (typeof state === "undefined" || !state.selected || !state.flora) return;
      state.selected.selectedPlantId = state.flora.catalogId || state.flora.sci || state.flora.en;
      if (typeof scheduleFarmPersist === "function") scheduleFarmPersist(state.selected);
      global.renderPlantSuitability();
    }, 0), true);

    const title = document.getElementById("plant-selector-title");
    if (title) title.textContent = "Plant Selector · Native Trees & LIMS Master Database";
    if (typeof renderTabs === "function") renderTabs();
    if (typeof renderFlora === "function") renderFlora();
    global.renderPlantSuitability();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhanceGis, { once: true });
  else enhanceGis();
})(window);
