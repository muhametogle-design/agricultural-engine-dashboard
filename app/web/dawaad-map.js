/*
 * Dawaad / Abaar Alert map component.
 * Vanilla JavaScript + Leaflet; no bundler required.
 */
(function registerDawaadMap(global) {
  "use strict";

  if (!global || !global.L) {
    throw new Error("DawaadMapComponent requires Leaflet to be loaded first.");
  }

  const L = global.L;
  const PLACEHOLDER_KEY = "YOUR_BING_MAPS_KEY";
  const DEFAULT_OPTIONS = Object.freeze({
    center: [8.4167, 47.3667],
    zoom: 8,
    minZoom: 3,
    maxZoom: 19,
    bingMapsKey: PLACEHOLDER_KEY,
    bingCulture: "en-US",
    defaultBasemap: "osm",
    boundaryTimeoutMs: 20000,
    boundarySources: Object.freeze({
      regions:
        "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/SOM/ADM1/geoBoundaries-SOM-ADM1_simplified.geojson",
      districts:
        "https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/SOM/ADM2/geoBoundaries-SOM-ADM2_simplified.geojson",
    }),
  });

  function tileXYToQuadKey(tileX, tileY, zoom) {
    let quadKey = "";
    for (let level = zoom; level > 0; level -= 1) {
      let digit = 0;
      const mask = 1 << (level - 1);
      if ((tileX & mask) !== 0) digit += 1;
      if ((tileY & mask) !== 0) digit += 2;
      quadKey += String(digit);
    }
    return quadKey;
  }

  function isConfiguredKey(key) {
    return Boolean(key && key !== PLACEHOLDER_KEY && !/^YOUR[_-]/i.test(key));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function boundaryName(properties = {}) {
    return (
      properties.shapeName ||
      properties.ADM2_EN ||
      properties.ADM1_EN ||
      properties.adm2_name ||
      properties.adm1_name ||
      properties.name ||
      properties.NAME_2 ||
      properties.NAME_1 ||
      "Unnamed administrative area"
    );
  }

  class BingAerialWithLabelsLayer extends L.TileLayer {
    constructor(apiKey, options = {}) {
      super("", {
        tileSize: 256,
        minZoom: 1,
        maxZoom: 19,
        subdomains: ["0", "1", "2", "3"],
        crossOrigin: true,
        attribution:
          '&copy; <a href="https://www.microsoft.com/maps/product/terms.html" target="_blank" rel="noopener">Microsoft Bing</a>',
        ...options,
      });
      this.apiKey = apiKey || PLACEHOLDER_KEY;
      this.culture = options.culture || "en-US";
    }

    hasApiKey() {
      return isConfiguredKey(this.apiKey);
    }

    getTileUrl(coords) {
      const quadKey = tileXYToQuadKey(coords.x, coords.y, coords.z);
      const subdomain = this._getSubdomain(coords);
      return (
        `https://ecn.t${subdomain}.tiles.virtualearth.net/tiles/h${quadKey}.jpeg` +
        `?g=1&mkt=${encodeURIComponent(this.culture)}&n=z&key=${encodeURIComponent(this.apiKey)}`
      );
    }

    createTile(coords, done) {
      if (this.hasApiKey()) return super.createTile(coords, done);

      const tile = document.createElement("div");
      tile.className = "dawaad-key-tile";
      tile.setAttribute("role", "img");
      tile.setAttribute("aria-label", "Bing map API key required");
      tile.innerHTML = "<strong>Bing key required</strong><span>Set DAWAAD_CONFIG.bingMapsKey</span>";
      global.setTimeout(() => done(null, tile), 0);
      return tile;
    }
  }

  class FullscreenControl extends L.Control {
    constructor(options = {}) {
      super({ position: "topleft", ...options });
      this._onFullscreenChange = this._onFullscreenChange.bind(this);
    }

    onAdd(map) {
      this._map = map;
      const wrapper = L.DomUtil.create("div", "leaflet-bar leaflet-control dawaad-fullscreen");
      const button = L.DomUtil.create("a", "dawaad-fullscreen-button", wrapper);
      button.href = "#";
      button.title = "Toggle full screen";
      button.setAttribute("role", "button");
      button.setAttribute("aria-label", "Enter full screen map");
      button.setAttribute("aria-pressed", "false");
      button.innerHTML = "&#x26F6;";
      this._button = button;

      L.DomEvent.disableClickPropagation(wrapper);
      L.DomEvent.on(button, "click", L.DomEvent.stop);
      L.DomEvent.on(button, "click", this._toggle, this);
      document.addEventListener("fullscreenchange", this._onFullscreenChange);
      return wrapper;
    }

    onRemove() {
      document.removeEventListener("fullscreenchange", this._onFullscreenChange);
    }

    _toggle() {
      const container = this._map.getContainer();
      if (!document.fullscreenElement) {
        const request = container.requestFullscreen || container.webkitRequestFullscreen;
        if (request) request.call(container);
      } else {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
      }
    }

    _onFullscreenChange() {
      const active = document.fullscreenElement === this._map.getContainer();
      this._button.setAttribute("aria-pressed", String(active));
      this._button.setAttribute("aria-label", active ? "Exit full screen map" : "Enter full screen map");
      this._button.title = active ? "Exit full screen" : "Enter full screen";
      global.setTimeout(() => this._map.invalidateSize({ pan: false }), 80);
    }
  }

  class DawaadMapComponent {
    constructor(target, options = {}) {
      const container = typeof target === "string" ? document.getElementById(target) : target;
      if (!container) throw new Error(`Map container not found: ${target}`);

      this.container = container;
      this.options = {
        ...DEFAULT_OPTIONS,
        ...options,
        boundarySources: {
          ...DEFAULT_OPTIONS.boundarySources,
          ...(options.boundarySources || {}),
        },
      };
      this.map = null;
      this.baseLayers = {};
      this.boundaryLayers = {};
      this.controls = {};
      this.layerState = {
        regions: { state: "idle", count: 0, error: null },
        districts: { state: "idle", count: 0, error: null },
      };
      this.ready = Promise.resolve([]);
    }

    init() {
      if (this.map) return this;

      this.map = L.map(this.container, {
        center: this.options.center,
        zoom: this.options.zoom,
        minZoom: this.options.minZoom,
        maxZoom: this.options.maxZoom,
        zoomControl: true,
        attributionControl: true,
      });

      this._createPanes();
      this._createBasemaps();
      this._createBoundaryLayers();
      this._createControls();
      this._bindEvents();
      this.ready = this.reloadBoundaries();
      return this;
    }

    _createPanes() {
      this.map.createPane("dawaadRegions");
      this.map.getPane("dawaadRegions").style.zIndex = "430";
      this.map.createPane("dawaadDistricts");
      this.map.getPane("dawaadDistricts").style.zIndex = "440";
    }

    _createBasemaps() {
      this.baseLayers.osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        minZoom: this.options.minZoom,
        maxZoom: 19,
        maxNativeZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>',
      });

      this.baseLayers.bing = new BingAerialWithLabelsLayer(this.options.bingMapsKey, {
        minZoom: this.options.minZoom,
        maxZoom: this.options.maxZoom,
        culture: this.options.bingCulture,
      });

      const canStartWithBing =
        this.options.defaultBasemap === "bing" && this.baseLayers.bing.hasApiKey();
      (canStartWithBing ? this.baseLayers.bing : this.baseLayers.osm).addTo(this.map);
    }

    _createBoundaryLayers() {
      this.boundaryLayers.regions = L.geoJSON(null, {
        pane: "dawaadRegions",
        style: () => ({
          color: "#f59e0b",
          weight: 2.4,
          opacity: 0.95,
          fillColor: "#fbbf24",
          fillOpacity: 0.035,
        }),
        onEachFeature: (feature, layer) => this._bindBoundaryFeature("Gobol", feature, layer),
      });

      this.boundaryLayers.districts = L.geoJSON(null, {
        pane: "dawaadDistricts",
        style: () => ({
          color: "#22d3ee",
          weight: 1.15,
          dashArray: "5 4",
          opacity: 0.88,
          fillOpacity: 0,
        }),
        onEachFeature: (feature, layer) => this._bindBoundaryFeature("Degmo", feature, layer),
      });

      this.boundaryLayers.regions.addTo(this.map);
    }

    _bindBoundaryFeature(levelLabel, feature, layer) {
      const name = boundaryName(feature.properties);
      layer.bindTooltip(`${escapeHtml(levelLabel)} · ${escapeHtml(name)}`, {
        sticky: true,
        direction: "auto",
        className: "dawaad-boundary-tooltip",
      });
      layer.bindPopup(
        `<div class="dawaad-popup"><strong>${escapeHtml(name)}</strong>` +
          `<span>${escapeHtml(levelLabel)} administrative boundary</span></div>`,
      );
      layer.on({
        mouseover: () => layer.setStyle({ weight: levelLabel === "Gobol" ? 3.4 : 2.1, fillOpacity: 0.08 }),
        mouseout: () =>
          layer.setStyle({
            weight: levelLabel === "Gobol" ? 2.4 : 1.15,
            fillOpacity: levelLabel === "Gobol" ? 0.035 : 0,
          }),
      });
    }

    _createControls() {
      this.controls.layers = L.control
        .layers(
          {
            "Bing Satellite + Labels": this.baseLayers.bing,
            "OpenStreetMap Standard": this.baseLayers.osm,
          },
          {
            "Gobol boundaries": this.boundaryLayers.regions,
            "Degmo boundaries": this.boundaryLayers.districts,
          },
          { position: "topright", collapsed: false },
        )
        .addTo(this.map);

      this.controls.scale = L.control
        .scale({ position: "bottomleft", metric: true, imperial: false, maxWidth: 150 })
        .addTo(this.map);
      this.controls.fullscreen = new FullscreenControl({ position: "topleft" }).addTo(this.map);
    }

    _bindEvents() {
      this.map.on("baselayerchange", (event) => {
        if (event.layer === this.baseLayers.bing && !this.baseLayers.bing.hasApiKey()) {
          this._emit("dawaad:keyrequired", {
            provider: "Bing Maps",
            message: "Set DAWAAD_CONFIG.bingMapsKey to enable satellite imagery.",
          });
        }
      });
      this.map.on("moveend zoomend", () => {
        const center = this.map.getCenter();
        this._emit("dawaad:viewchange", {
          center: [Number(center.lat.toFixed(6)), Number(center.lng.toFixed(6))],
          zoom: this.map.getZoom(),
        });
      });
    }

    async reloadBoundaries() {
      return Promise.allSettled([
        this._loadBoundary("regions", this.options.boundarySources.regions),
        this._loadBoundary("districts", this.options.boundarySources.districts),
      ]);
    }

    async _loadBoundary(kind, source) {
      this._setLayerState(kind, { state: "loading", count: 0, error: null });
      try {
        const data = typeof source === "object" ? source : await this._fetchGeoJson(source);
        this.setBoundaryData(kind, data);
        const count = data.features.length;
        this._setLayerState(kind, { state: "ready", count, error: null });
        this._addBoundaryAttribution();
        this._emit("dawaad:layerload", { kind, count, source });
        return { kind, count };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this._setLayerState(kind, { state: "error", count: 0, error: message });
        this._emit("dawaad:layererror", { kind, source, error: message });
        throw error;
      }
    }

    async _fetchGeoJson(url) {
      if (!url) throw new Error("Boundary GeoJSON URL is not configured.");
      const controller = new AbortController();
      const timeout = global.setTimeout(() => controller.abort(), this.options.boundaryTimeoutMs);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/geo+json, application/json" },
          cache: "force-cache",
        });
        if (!response.ok) throw new Error(`GeoJSON request failed with HTTP ${response.status}`);
        const data = await response.json();
        if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
          throw new Error("Boundary response is not a GeoJSON FeatureCollection.");
        }
        return data;
      } finally {
        global.clearTimeout(timeout);
      }
    }

    setBoundaryData(kind, data) {
      const layer = this.boundaryLayers[kind];
      if (!layer) throw new Error(`Unknown boundary layer: ${kind}`);
      if (!data || data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
        throw new TypeError("Boundary data must be a GeoJSON FeatureCollection.");
      }
      layer.clearLayers();
      layer.addData(data);
      return this;
    }

    focusBoundaryLayer(kind, options = {}) {
      const layer = this.boundaryLayers[kind];
      if (!layer || !layer.getLayers().length) return false;
      this.map.fitBounds(layer.getBounds(), { padding: [24, 24], ...options });
      return true;
    }

    _addBoundaryAttribution() {
      if (this._boundaryAttributionAdded) return;
      this.map.attributionControl.addAttribution(
        '<a href="https://www.geoboundaries.org/" target="_blank" rel="noopener">geoBoundaries CC BY 4.0</a>',
      );
      this._boundaryAttributionAdded = true;
    }

    _setLayerState(kind, state) {
      this.layerState[kind] = { ...state };
      if (typeof this.options.onStatus === "function") {
        this.options.onStatus({ kind, ...this.layerState[kind] }, this);
      }
    }

    _emit(name, detail) {
      this.container.dispatchEvent(new CustomEvent(name, { detail }));
    }

    getMap() {
      return this.map;
    }

    destroy() {
      if (!this.map) return;
      this.map.remove();
      this.map = null;
      this.baseLayers = {};
      this.boundaryLayers = {};
      this.controls = {};
    }
  }

  global.DawaadMapComponent = DawaadMapComponent;
  global.DawaadMapUtils = Object.freeze({
    tileXYToQuadKey,
    isConfiguredKey,
    boundaryName,
  });
})(window);
