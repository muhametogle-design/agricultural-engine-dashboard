/* Unified 3-in-1 workspace: Dawaad + Lab LIMS + GIS Engine. */
(function bootUnifiedWorkspace(global) {
  "use strict";

  const HOME = [8.4167, 47.3667];
  const STORAGE = { sites: "unified_sites_v1", samples: "unified_samples_v1", language: "unified_language" };
  const I18N = {
    en:{brandSub:"Abaar · Lab LIMS · GIS Engine",workspaceReady:"Workspace ready",homeMap:"Laascaanood home",droughtTitle:"Abaar / Dawaad",droughtSub:"Early warning portal",region:"Pastoral region",rainfall:"10-day rainfall",anomaly:"Rainfall anomaly",vci:"VCI score",vegetation:"Vegetation",groundwater:"Groundwater status",functional:"Functional",stressed:"Stressed",dry:"Dry",externalSources:"External data slots",sourceDisclaimer:"Mock integration values are not live official observations.",drawPolygon:"Draw polygon",finish:"Finish",cancel:"Cancel",editVertices:"Edit vertices",delete:"Delete",activeSite:"Active site",hectares:"Hectares",acres:"Acres",drawHelp:"Click map corners, then press Finish.",coordinates:"Coordinates",limsTitle:"Lab LIMS",limsSub:"Soil chemistry and sample tracking",linkedSite:"Linked mapped site",sampleId:"Sample ID",siteType:"Site type",clientName:"Client / farmer",saveSample:"Save linked sample",samples:"Samples",clear:"Clear"},
    so:{brandSub:"Abaar · Shaybaarka LIMS · Matoorka GIS",workspaceReady:"Goobtu waa diyaar",homeMap:"Guriga Laascaanood",droughtTitle:"Abaar / Dawaad",droughtSub:"Xarunta digniinta hore",region:"Gobolka xoolo-dhaqatada",rainfall:"Roobka 10-ka maalmood",anomaly:"Farqiga roobka",vci:"Dhibcaha VCI",vegetation:"Dhirta",groundwater:"Xaaladda biyaha dhulka",functional:"Shaqaynaya",stressed:"Cadaadis saaran",dry:"Qalalan",externalSources:"Ilaha xogta dibadda",sourceDisclaimer:"Xogta tijaabada ahi ma aha indha-indhayn rasmi ah oo toos ah.",drawPolygon:"Sawir Beer",finish:"Dhammee",cancel:"Jooji",editVertices:"Tafatir geesaha",delete:"Tirtir",activeSite:"Goobta firfircoon",hectares:"Hektar",acres:"Akar",drawHelp:"Guji geesaha khariidadda, kadibna Dhammee.",coordinates:"Isku-duwayaasha",limsTitle:"Shaybaarka LIMS",limsSub:"Kiimikada Ciidda iyo raadraaca muunadaha",linkedSite:"Goobta khariidadda ku xiran",sampleId:"Aqoonsiga muunadda",siteType:"Nooca goobta",clientName:"Macmiil / beeraley",saveSample:"Kaydi muunadda ku xiran",samples:"Muunadaha",clear:"Nadiifi"}
  };

  const DROUGHT = {
    sool:{region:"Sool",rain:3.8,anomaly:-69.4,vci:22.6,status:"Alert"},nugaal:{region:"Nugaal",rain:5.4,anomaly:-47.1,vci:31.8,status:"Alert"},sanaag:{region:"Sanaag",rain:11.8,anomaly:-28.5,vci:42.1,status:"Watch"},togdheer:{region:"Togdheer",rain:2.9,anomaly:-73.9,vci:18.4,status:"Severe"},mudug:{region:"Mudug",rain:6.2,anomaly:-29.5,vci:37.2,status:"Watch"}
  };
  const WATER = [
    {id:"WP-SOOL-001",name:"Laascaanood Borehole",type:"Borehole",status:"Functional",depth:124,lat:8.4821,lng:47.3524},
    {id:"WP-SOOL-002",name:"Caynabo Berkad",type:"Berkad",status:"Stressed",depth:4.5,lat:8.9538,lng:46.5537},
    {id:"WP-SOOL-003",name:"Xudun Shallow Well",type:"Shallow Well",status:"Dry",depth:18,lat:9.2075,lng:47.1072},
    {id:"WP-NUG-001",name:"Garoowe Borehole",type:"Borehole",status:"Functional",depth:146,lat:8.4012,lng:48.4971},
    {id:"WP-MUD-001",name:"Gaalkacyo Borehole",type:"Borehole",status:"Functional",depth:138,lat:6.7812,lng:47.4231}
  ];

  const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const radians = value => value * Math.PI / 180;
  const sphericalArea = points => {
    if (points.length < 3) return 0;
    let total = 0;
    points.forEach((point,index) => { const next=points[(index+1)%points.length]; total += radians(next.lng-point.lng)*(2+Math.sin(radians(point.lat))+Math.sin(radians(next.lat))); });
    return Math.abs(total * 6371008.8 * 6371008.8 / 2);
  };

  class UnifiedWorkspace {
    constructor() {
      this.language = localStorage.getItem(STORAGE.language) || "en";
      this.state = {activeSite:null,drawing:false,drawPoints:[],draft:null,editing:false,sites:load(STORAGE.sites,[]),samples:load(STORAGE.samples,[]),siteLayers:new Map(),handles:null};
      this.map = null;
      this.layers = {};
    }

    init() {
      if (!global.L) { document.querySelector(".map-container").innerHTML='<div style="padding:30px;color:#fca5a5">Leaflet failed to load.</div>'; return; }
      this.map = L.map("unified-map",{preferCanvas:true}).setView(HOME,8);
      this.layers.esri = L.layerGroup([
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Esri, Maxar, Earthstar"}),
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Esri labels"})
      ]).addTo(this.map);
      this.layers.osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors"});
      this.layers.water = L.layerGroup().addTo(this.map);
      this.layers.sites = L.layerGroup().addTo(this.map);
      this.layers.draft = L.layerGroup().addTo(this.map);
      this.renderWaterPoints();
      this.restoreSites();
      this.bindUi();
      this.applyLanguage();
      this.loadDrought("Sool");
      this.renderSamples();
      this.syncPanels();
      this.bindResize();
      setTimeout(()=>this.map.invalidateSize(),100);
    }

    bindUi() {
      document.getElementById("language-toggle").onclick=()=>{this.language=this.language==="en"?"so":"en";localStorage.setItem(STORAGE.language,this.language);this.applyLanguage();this.renderSamples();};
      document.getElementById("toggle-drought").onclick=()=>this.togglePanel("drought");
      document.getElementById("toggle-lims").onclick=()=>this.togglePanel("lims");
      document.getElementById("home-map").onclick=()=>this.map.setView(HOME,8);
      document.getElementById("region-select").onchange=event=>this.loadDrought(event.target.value);
      document.getElementById("start-draw").onclick=()=>this.startDraw();
      document.getElementById("finish-draw").onclick=()=>this.finishDraw();
      document.getElementById("cancel-draw").onclick=()=>this.cancelDraw();
      document.getElementById("edit-polygon").onclick=()=>this.toggleEditing();
      document.getElementById("delete-polygon").onclick=()=>this.deleteActive();
      document.getElementById("sample-form").onsubmit=event=>this.saveSample(event);
      document.getElementById("clear-samples").onclick=()=>{if(confirm("Clear all samples?")){this.state.samples=[];save(STORAGE.samples,[]);this.renderSamples();}};
      this.map.on("click",event=>{if(this.state.drawing){this.state.drawPoints.push(event.latlng);this.renderDraft();}});
      this.map.on("dblclick",event=>{if(this.state.drawing){L.DomEvent.stop(event);this.finishDraw();}});
    }

    togglePanel(panel) {
      const workspace=document.getElementById("workspace");
      workspace.classList.toggle(panel==="drought"?"hide-drought":"hide-lims");
      const hidden=workspace.classList.contains(panel==="drought"?"hide-drought":"hide-lims");
      document.getElementById(panel==="drought"?"toggle-drought":"toggle-lims").setAttribute("aria-expanded",String(!hidden));
      [0,100,250].forEach(delay=>setTimeout(()=>this.map.invalidateSize({pan:false}),delay));
    }

    bindResize() {
      window.addEventListener("resize",()=>this.map.invalidateSize({pan:false}));
      if (global.ResizeObserver) new ResizeObserver(()=>this.map.invalidateSize({pan:false})).observe(document.querySelector(".map-container"));
    }

    applyLanguage() {
      const dict=I18N[this.language];
      document.documentElement.lang=this.language;
      document.querySelectorAll("[data-i18n]").forEach(node=>{node.textContent=dict[node.dataset.i18n]||node.textContent;});
      document.getElementById("language-toggle").textContent="Soomaali | English";
      document.getElementById("sample-client").placeholder=this.language==="so"?"Magaca macmiilka":"Client name";
      this.syncPanels();
    }

    switchBase(name) {
      const other=name==="esri"?"osm":"esri";
      if(this.map.hasLayer(this.layers[other]))this.map.removeLayer(this.layers[other]);
      if(!this.map.hasLayer(this.layers[name]))this.layers[name].addTo(this.map);
    }

    renderWaterPoints() {
      const colors={Functional:"#22c55e",Stressed:"#f59e0b",Dry:"#ef4444"};
      this.layers.water.clearLayers();
      WATER.forEach(point=>{
        const marker=L.circleMarker([point.lat,point.lng],{radius:7,color:"#fff",weight:2,fillColor:colors[point.status],fillOpacity:1}).addTo(this.layers.water);
        marker.bindTooltip(`<b>${point.name}</b><br>${point.type} · ${point.status}`);
        marker.on("click",()=>{this.state.activeSite={id:point.id,name:point.name,type:"Water Point",coordinates:[[point.lng,point.lat]],waterPoint:point};this.syncPanels();this.map.setView([point.lat,point.lng],11);});
      });
    }

    async loadDrought(region) {
      const key=region.toLowerCase();
      let metrics=null,water=null,source="local mock";
      try {
        const responses=await Promise.all([fetch(`/api/v1/drought-metrics?region=${encodeURIComponent(region)}`,{cache:"no-store"}),fetch("/api/v1/water-points",{cache:"no-store"})]);
        if(responses.every(response=>response.ok)){metrics=await responses[0].json();water=await responses[1].json();source="mock API";}
      } catch {}
      const row=metrics?{region:metrics.region,rain:metrics.rainfallRecords.reduce((sum,item)=>sum+item.rainfallMm,0)/metrics.rainfallRecords.length,anomaly:metrics.rainfallRecords.reduce((sum,item)=>sum+item.anomalyPct,0)/metrics.rainfallRecords.length,vci:metrics.vegetationIndices[0].vciScore,status:metrics.vegetationIndices[0].status}:DROUGHT[key];
      if(!row)return;
      document.getElementById("rainfall-value").textContent=row.rain.toFixed(1)+" mm";
      document.getElementById("anomaly-value").textContent=row.anomaly.toFixed(1)+"%";
      document.getElementById("vci-value").textContent=row.vci.toFixed(1);
      document.getElementById("vegetation-value").textContent=row.status;
      document.getElementById("station-count").textContent=(metrics?.stations.length||2)+" stations";
      document.getElementById("water-count").textContent=(water?.features.length||WATER.length)+" water points";
      document.getElementById("drought-source").textContent=`2026-08-D1 · ${source} · not live official data`;
      document.getElementById("drought-mode").textContent="MOCK";
      const functional=WATER.filter(point=>point.status==="Functional").length,stressed=WATER.filter(point=>point.status==="Stressed").length,dry=WATER.filter(point=>point.status==="Dry").length;
      document.getElementById("groundwater-summary").innerHTML=`<b style="color:#86efac">${functional} functional</b> · <b style="color:#fcd34d">${stressed} stressed</b> · <b style="color:#fca5a5">${dry} dry</b>`;
    }

    startDraw() { this.cancelDraw();this.state.drawing=true;document.getElementById("draw-help").classList.remove("hidden");this.map.doubleClickZoom.disable();this.map.getContainer().style.cursor="crosshair"; }
    cancelDraw() { this.state.drawing=false;this.state.drawPoints=[];this.layers.draft.clearLayers();document.getElementById("draw-help").classList.add("hidden");this.map.doubleClickZoom.enable();this.map.getContainer().style.cursor=""; }
    renderDraft() { this.layers.draft.clearLayers();this.state.drawPoints.forEach(point=>L.circleMarker(point,{radius:4,color:"#fff",weight:1,fillColor:"#f59e0b",fillOpacity:1}).addTo(this.layers.draft));if(this.state.drawPoints.length>1)L.polyline(this.state.drawPoints,{color:"#f59e0b",weight:3,dashArray:"6 5"}).addTo(this.layers.draft); }

    finishDraw() {
      if(this.state.drawPoints.length<3){alert(this.language==="so"?"Ku dar ugu yaraan saddex gees.":"Add at least three corners.");return;}
      const type=document.getElementById("draw-site-type").value,prefix=type==="Mine"?(this.language==="so"?"Macdan ":"Mine "):(this.language==="so"?"Beer ":"Farm ");
      const site={id:"site-"+Date.now(),name:prefix+(this.state.sites.length+1),type,coordinates:this.state.drawPoints.map(point=>[point.lng,point.lat]),createdAt:new Date().toISOString()};
      this.state.sites.push(site);save(STORAGE.sites,this.state.sites);this.cancelDraw();this.addSiteLayer(site);this.selectSite(site);this.map.fitBounds(this.state.siteLayers.get(site.id).getBounds().pad(.25));
    }

    restoreSites() { this.state.sites.forEach(site=>this.addSiteLayer(site)); }
    addSiteLayer(site) {
      const points=site.coordinates.map(([lng,lat])=>L.latLng(lat,lng));
      const polygon=L.polygon(points,{color:"#10b981",weight:3,fillColor:"#10b981",fillOpacity:.14}).addTo(this.layers.sites);
      polygon.bindTooltip(`<b>${site.name}</b>`);polygon.on("click",()=>this.selectSite(site));this.state.siteLayers.set(site.id,polygon);
    }

    selectSite(site) {
      this.state.activeSite=site;
      this.state.siteLayers.forEach((layer,id)=>layer.setStyle({weight:id===site.id?4:2,fillOpacity:id===site.id?.24:.12}));
      this.updateGeometry();this.syncPanels();
      if(this.state.editing)this.buildHandles();
    }

    updateGeometry() {
      const site=this.state.activeSite;if(!site||!Array.isArray(site.coordinates)||site.coordinates.length<3){document.getElementById("area-ha").textContent="0.00 ha";document.getElementById("area-ac").textContent="0.00 ac";document.getElementById("coordinate-output").textContent=site?.coordinates?.map(point=>point.join(",")).join(" · ")||"No active geometry";return;}
      const points=site.coordinates.map(([lng,lat])=>({lat,lng})),m2=sphericalArea(points);document.getElementById("area-ha").textContent=(m2/10000).toFixed(2)+" ha";document.getElementById("area-ac").textContent=(m2/4046.8564224).toFixed(2)+" ac";document.getElementById("coordinate-output").textContent=site.coordinates.map(point=>point.map(value=>value.toFixed(6)).join(", ")).join(" · ");
    }

    toggleEditing() { if(!this.state.activeSite||!Array.isArray(this.state.activeSite.coordinates)||this.state.activeSite.coordinates.length<3)return;this.state.editing=!this.state.editing;if(this.state.editing)this.buildHandles();else this.clearHandles(); }
    clearHandles() { if(this.state.handles){this.state.handles.remove();this.state.handles=null;} }
    buildHandles() {
      this.clearHandles();const site=this.state.activeSite,layer=this.state.siteLayers.get(site.id),points=site.coordinates.map(([lng,lat])=>L.latLng(lat,lng));this.state.handles=L.layerGroup().addTo(this.map);
      points.forEach((point,index)=>{const vertex=L.marker(point,{draggable:true,icon:L.divIcon({className:"vertex",iconSize:[13,13]})}).addTo(this.state.handles);vertex.on("drag",()=>{const next=vertex.getLatLng();site.coordinates[index]=[next.lng,next.lat];layer.setLatLngs(site.coordinates.map(([lng,lat])=>[lat,lng]));this.updateGeometry();});vertex.on("dragend",()=>save(STORAGE.sites,this.state.sites));vertex.on("contextmenu",()=>{if(site.coordinates.length<=3)return;site.coordinates.splice(index,1);layer.setLatLngs(site.coordinates.map(([lng,lat])=>[lat,lng]));save(STORAGE.sites,this.state.sites);this.buildHandles();this.updateGeometry();});const next=points[(index+1)%points.length],middle=L.latLng((point.lat+next.lat)/2,(point.lng+next.lng)/2),mid=L.marker(middle,{icon:L.divIcon({className:"midpoint",iconSize:[9,9]})}).addTo(this.state.handles);mid.on("click",()=>{site.coordinates.splice(index+1,0,[middle.lng,middle.lat]);layer.setLatLngs(site.coordinates.map(([lng,lat])=>[lat,lng]));save(STORAGE.sites,this.state.sites);this.buildHandles();this.updateGeometry();});});
    }

    deleteActive() { const site=this.state.activeSite;if(!site||!Array.isArray(site.coordinates)||site.coordinates.length<3)return;if(!confirm("Delete active site?"))return;this.clearHandles();this.state.siteLayers.get(site.id)?.remove();this.state.siteLayers.delete(site.id);this.state.sites=this.state.sites.filter(item=>item.id!==site.id);save(STORAGE.sites,this.state.sites);this.state.activeSite=null;this.updateGeometry();this.syncPanels(); }

    syncPanels() {
      const site=this.state.activeSite;document.getElementById("active-site-name").textContent=site?.name||"—";if(site&&[...document.getElementById("site-type").options].some(option=>option.value===site.type))document.getElementById("site-type").value=site.type;document.getElementById("linked-site-name").textContent=site?.name||(this.language==="so"?"Goob lama dooran":"No site selected");document.getElementById("linked-site-coordinates").textContent=site?.coordinates?.map(point=>point.map(value=>Number(value).toFixed(5)).join(",")).join(" · ")||"—";this.updateGeometry();
    }

    saveSample(event) {
      event.preventDefault();const site=this.state.activeSite;if(!site){alert(this.language==="so"?"Marka hore dooro Beer ama goob biyo.":"Select a mapped farm or water point first.");return;}
      const value=id=>{const number=parseFloat(document.getElementById(id).value);return Number.isFinite(number)?number:null};const sample={id:document.getElementById("sample-id").value.trim(),client:document.getElementById("sample-client").value.trim(),siteId:site.id,siteName:site.name,siteType:document.getElementById("site-type").value,coordinates:site.coordinates,ph:value("sample-ph"),ec:value("sample-ec"),om:value("sample-om"),n:value("sample-n"),p:value("sample-p"),k:value("sample-k"),recordedAt:new Date().toISOString()};this.state.samples.unshift(sample);save(STORAGE.samples,this.state.samples);event.target.reset();document.getElementById("sample-id").value="S-"+String(this.state.samples.length+1).padStart(3,"0");this.renderSamples();
    }

    renderSamples() {
      document.getElementById("sample-total").textContent=this.state.samples.length;const list=document.getElementById("sample-list");if(!this.state.samples.length){list.innerHTML=`<p class="note">${this.language==="so"?"Muunad wali lama diiwaangelin.":"No samples registered."}</p>`;return;}list.innerHTML=this.state.samples.map((sample,index)=>`<article class="sample-card" data-sample="${index}"><header><b>${sample.id}</b><small>${new Date(sample.recordedAt).toLocaleDateString()}</small></header><div>${sample.client} · ${sample.siteName}</div><div class="sample-values"><span>pH ${sample.ph??"—"}</span><span>EC ${sample.ec??"—"}</span><span>N ${sample.n??"—"}</span><span>P ${sample.p??"—"}</span><span>K ${sample.k??"—"}</span></div></article>`).join("");list.querySelectorAll("[data-sample]").forEach(card=>card.onclick=()=>{const sample=this.state.samples[Number(card.dataset.sample)],site=this.state.sites.find(item=>item.id===sample.siteId);if(site){this.selectSite(site);this.map.fitBounds(this.state.siteLayers.get(site.id).getBounds().pad(.3));}});
    }
  }

  document.addEventListener("DOMContentLoaded",()=>{const workspace=new UnifiedWorkspace();global.UNIFIED_WORKSPACE=workspace;workspace.init();document.querySelectorAll("[data-base]").forEach(button=>button.onclick=()=>workspace.switchBase(button.dataset.base));document.getElementById("sample-id").value="S-001";});
})(window);
