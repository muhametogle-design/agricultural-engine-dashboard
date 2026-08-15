/* LabOps LIMS v9 — modular React source, loaded directly by lims.html */
const { useState, useMemo, useEffect } = React;
const e = React.createElement;
const { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
        CartesianGrid, ResponsiveContainer } = Recharts;
const STANDALONE_WEB = window.location.pathname.indexOf("/web/")===0;
const GIS_ENGINE_URL = STANDALONE_WEB ? "/web/dashboard.html" : "/dashboard";

/* ═════════ MODULE 1 · BACKGROUND SPECTRUM ═════════ */
const SPECTRUM = [
  {id:"red",    label:"Red",    cls:"bg-red-950",    swatch:"#ef4444"},
  {id:"orange", label:"Orange", cls:"bg-orange-950", swatch:"#f97316"},
  {id:"green",  label:"Green",  cls:"bg-emerald-950",swatch:"#10b981"},
  {id:"blue",   label:"Blue",   cls:"bg-blue-950",   swatch:"#3b82f6"},
  {id:"purple", label:"Purple", cls:"bg-violet-950", swatch:"#8b5cf6"},
  {id:"slate",  label:"Slate",  cls:"bg-slate-950",  swatch:"#64748b"},
];

/* ═════════ RECOMMENDATION FORMULA (Module 2) ═════════ */
function phVerdict(ph){
  if (ph < 5.5)  return {status:"Critically Acidic", color:"text-red-300",    chip:"bg-red-900/50 border-red-700 text-red-200",
    rec:"Apply 1,200 kg of Agricultural Lime per acre."};
  if (ph <= 6.2) return {status:"Mildly Acidic",     color:"text-amber-300",  chip:"bg-amber-900/50 border-amber-700 text-amber-200",
    rec:"Apply 500 kg of Maintenance Lime per acre."};
  if (ph > 7.5)  return {status:"Alkaline",          color:"text-sky-300",    chip:"bg-sky-900/50 border-sky-700 text-sky-200",
    rec:"Apply Agricultural Sulfur to lower pH."};
  return {status:"Balanced", color:"text-emerald-300", chip:"bg-emerald-900/50 border-emerald-700 text-emerald-200",
    rec:"No correction required — maintain current fertility program."};
}

/* ═════════ MODULE 5 · FINANCIAL ENGINE (typed amounts) ═════════ */
const TIERS = {
  "Basic pH Test": 25, "Texture + OM Panel": 40,
  "Full Micronutrient Sweep": 85, "Heavy Metal Scan": 120,
};
const PAYMENT_METHODS = ["ZAAD","SAHAL","EDAHAB","CASH","EVCPLUS","BANK"];
const GATEWAYS = {
  ZAAD:0.010, SAHAL:0.012, EDAHAB:0.008,
  CASH:0.000, EVCPLUS:0.010, BANK:0.015,
};
const TAX = 0.05;
const money = x => "$"+Number(x).toFixed(2);
function calcInvoice(base, gateway){
  const fee=(GATEWAYS[gateway]!=null?GATEWAYS[gateway]:0);
  const tax = base*TAX, gwFee = base*fee;
  return {subtotal:base, tax, fee:gwFee, total:base+tax+gwFee};
}
function invStatus(total, paid){
  if (paid <= 0) return "PENDING";
  if (paid < total - 0.005) return "PARTIAL";
  return "PAID";
}

/* ═════════ MODULE 6 · DISEASE INTELLIGENCE VECTOR (Option-2 schema) ═════════ */
const DISEASE_CATEGORIES = ["All","Fruit Trees","Citrus","Grains & Crops","Vegetables","Legumes"];
const DISEASE_CAT_ICONS = {"All":"layers","Fruit Trees":"apple","Citrus":"citrus","Grains & Crops":"wheat","Vegetables":"carrot","Legumes":"sprout"};
/* schema: { cat, plant, disease, cause, symptoms:[…], immediate:[…], remedy } */
const DISEASE_VECTOR = [
 {cat:"Fruit Trees",plant:"Mango",disease:"Anthracnose",cause:"Colletotrichum gloeosporioides (Fungus)",
  symptoms:["Black tear-streak lesions on ripening fruit","Blossom blight and flower drop","Tar-spot leaf lesions"],
  immediate:["Prune dead panicles and open canopy airflow","Collect and destroy all mummified fruit"],
  remedy:"Copper oxychloride or carbendazim sprays at flowering and fruit set; repeat at 14-day intervals in wet season."},
 {cat:"Fruit Trees",plant:"Banana",disease:"Panama Disease (Fusarium Wilt TR4)",cause:"Fusarium oxysporum f. sp. cubense TR4 (Soil Fungus)",
  symptoms:["Margins of oldest leaves yellow then collapse","Pseudostem base splitting","Brown vascular rings in cut stem"],
  immediate:["Quarantine the infected mat — no suckers or soil may leave","Dig out and burn entire infected stools","Disinfect tools and boots with 10% bleach between farms"],
  remedy:"No chemical cure exists. Replant only with certified resistant GCTCV tissue-culture material; raise soil pH with lime."},
 {cat:"Fruit Trees",plant:"Papaya",disease:"Papaya Ringspot Virus",cause:"Papaya ringspot virus (Virus — aphid vectored)",
  symptoms:["Concentric ringspots on fruit skin","Shoestring / fern-like new leaves","Dark oily petiole streaks"],
  immediate:["Rogue out infected trees within two weeks of symptoms","Control aphid vectors on surrounding weeds"],
  remedy:"No chemical cure. Plant tolerant varieties; reflective silver mulch delays aphid landing and spread."},
 {cat:"Citrus",plant:"Orange & Lime",disease:"Citrus Greening (HLB)",cause:"Candidatus Liberibacter asiaticus (Bacterium — psyllid vectored)",
  symptoms:["Blotchy asymmetrical leaf mottling","Lopsided, bitter, small fruit","Rind stays green on shaded side"],
  immediate:["Remove and burn symptomatic trees completely","Spray for Asian citrus psyllid on new flush"],
  remedy:"No field cure. Use certified HLB-free nursery stock; imidacloprid soil drenches suppress psyllid vectors."},
 {cat:"Citrus",plant:"Lemon",disease:"Citrus Canker",cause:"Xanthomonas citri pv. citri (Bacterium)",
  symptoms:["Raised corky lesions with yellow halos","Lesions on leaves, twigs and fruit","Premature fruit drop"],
  immediate:["Prune only in dry weather; sterilize tools each cut","Install windbreaks to stop wind-driven spread"],
  remedy:"Copper hydroxide sprays on every flush cycle; destroy trees with severe systemic infection."},
 {cat:"Grains & Crops",plant:"Maize",disease:"Fall Armyworm Damage",cause:"Spodoptera frugiperda (Insect pest — larval feeding)",
  symptoms:["Ragged whorl feeding holes","Sawdust-like frass deep inside whorl","Window-paned leaves on young plants"],
  immediate:["Scout at dawn; hand-pick and crush larvae","Pour sand or wood ash into the whorl to abrade larvae"],
  remedy:"Apply emamectin benzoate or Bt biopesticide directly into the whorl at dawn; rotate chemistry to delay resistance."},
 {cat:"Grains & Crops",plant:"Wheat",disease:"Stem Rust",cause:"Puccinia graminis f. sp. tritici (Fungus)",
  symptoms:["Brick-red pustules on stems and sheaths","Ruptured, ragged epidermis around pustules","Lodging in heavily infected stands"],
  immediate:["Rogue early pustuled tillers before sporulation peaks","Avoid late nitrogen that keeps canopy lush"],
  remedy:"Triazole fungicide at flag-leaf stage; deploy Ug99-resistant cultivars across the rotation."},
 {cat:"Grains & Crops",plant:"Sorghum",disease:"Striga (Witchweed) Infestation",cause:"Striga hermonthica (Parasitic flowering plant)",
  symptoms:["Host leaf yellowing despite adequate water","Stunted, wilted sorghum hills","Purple Striga shoots emerging at host base"],
  immediate:["Hand-pull Striga plants before seed set — never let it flower","Rotate out to legume trap crops for 2 seasons"],
  remedy:"Use catch crops (cowpea/groundnut) to induce suicide germination; deploy striga-resistant sorghum varieties."},
 {cat:"Grains & Crops",plant:"Coffee",disease:"Coffee Berry Disease",cause:"Colletotrichum kahawae (Fungus)",
  symptoms:["Dark sunken lesions on green berries","Premature berry fall with lesions intact","Black mummified berries hanging on twigs"],
  immediate:["Strip and burn all infected and mummified berries","Prune canopy for rapid drying after rain"],
  remedy:"Preventative copper or chlorothalonil sprays from flowering, repeating every 4 weeks through berry expansion."},
 {cat:"Vegetables",plant:"Tomato",disease:"Late Blight",cause:"Phytophthora infestans (Oomycete — water mold)",
  symptoms:["Water-soaked grey-green leaf lesions","White mildew on underside in humid morning","Firm brown rot patches on fruit"],
  immediate:["Destroy infected plants immediately — never compost","Hill up soil and stop overhead irrigation"],
  remedy:"Protectant copper or mancozeb; systemics (mefenoxam/metalaxyl) during high-humidity outbreaks."},
 {cat:"Vegetables",plant:"Onion",disease:"Purple Blotch",cause:"Alternaria porri (Fungus)",
  symptoms:["Purple-centered concentric leaf lesions","Yellowing margins, leaf tips collapse","Bulbs soften in storage after infection"],
  immediate:["Remove old infected leaf tissue from the field","Widen spacing; avoid late-evening irrigation"],
  remedy:"Alternate chlorothalonil and mancozeb protectant sprays on a 10-day schedule in humid weather."},
 {cat:"Vegetables",plant:"Cabbage",disease:"Clubroot",cause:"Plasmodiophora brassicae (Soil-borne protist)",
  symptoms:["Swollen, club-shaped deformed roots","Plants stunted with purpling leaves","Midday wilt that recovers overnight"],
  immediate:["Pull and bag infected transplants — do not till them in","Stop machinery movement between infected and clean blocks"],
  remedy:"Lime seedbeds to pH 7.2 before transplanting; 4+ year brassica-free rotation; raised beds for drainage."},
 {cat:"Legumes",plant:"Cowpea",disease:"Aphid-borne Mosaic",cause:"Cowpea aphid-borne mosaic virus (Virus — aphid vectored)",
  symptoms:["Severe leaf mottling and puckering","Distorted, twisted new growth","Stunting and reduced pod set"],
  immediate:["Rogue symptomatic plants at first sign","Yellow sticky traps for aphid monitoring on field edges"],
  remedy:"Certified virus-free seed; reflective mulch repels aphids; resistant IT-series cowpea cultivars."},
 {cat:"Legumes",plant:"Groundnut",disease:"Groundnut Rosette Disease",cause:"Groundnut rosette virus complex (Virus — aphid vectored)",
  symptoms:["Severely shortened internodes (rosette habit)","Uniform bright chlorosis of new leaves","Dwarfed plants with negligible pods"],
  immediate:["Plant dense, synchronous stands early in the season","Rogue stunted rosetted plants weekly"],
  remedy:"Grow aphid-resistant rosette-tolerant cultivars; early dense planting suppresses aphid multiplication."},
 {cat:"Legumes",plant:"Common Bean",disease:"Bean Rust",cause:"Uromyces appendiculatus (Fungus)",
  symptoms:["Cinnamon-brown pustules on leaf undersides","Yellow halos around pustules","Premature defoliation from lower canopy up"],
  immediate:["Strip heavily pustuled lower leaves between rows","Irrigate mornings only — dry foliage by dusk"],
  remedy:"Triadimefon (systemic) at first pustules, or mancozeb protectant weekly through pod fill."},
];
function loadDiseaseDictionary(){
  return new Promise(function(resolve){setTimeout(function(){resolve(DISEASE_VECTOR.slice());},600);});
}

/* ═════════ MOCK DATA ENGINE ═════════ */
const FARMERS = [
  ["Amina Yusuf","Berbera","sandy loam"],["Mohamed Farah","Afgooye","silt loam"],
  ["Hodan Ali","Hargeysa","clay loam"],["Abdi Warsame","Belet Weyne","alluvial silt"],
  ["Fadumo Hassan","Laascaanood","calcareous loam"],["Idris Osman","Garoowe","gypsic sand"],
  ["Layla Jama","Jowhar","canal silt"],["Hassan Guled","Borama","red loam"],
  ["Nimco Abdi","Kismaayo","alluvial silt"],["Yusuf Elmi","Baydhaba","sandy clay"],
  ["Ayan Sheikh","Dhuusamareeb","aeolian sand"],["Deeqa Muse","Marka","coastal sand"],
];
const PHS = [5.1, 7.9, 5.8, 8.2, 8.1, 7.6, 6.0, 6.8, 8.3, 5.4, 6.5, 7.7];
const today = new Date();

function seedSamples(engineerLine){
  return FARMERS.map(function(f,i){return {
    id:"SMP-"+String(1+i).padStart(3,"0"),
    farmer:f[0], location:f[1], texture:f[2],
    tier:Object.keys(TIERS)[i%4], ph:PHS[i],
    ec:(0.4+(i*0.27)%3.2).toFixed(1), om:(0.5+(i*0.31)%2.4).toFixed(1),
    time:(8+Math.floor(i/2))+":"+((i*17)%60<10?"0":"")+((i*17)%60),
    turnaround:(2.5+(i%5)*0.8), engineer:engineerLine, currency:"USD",
  };});
}
function seedInvoices(samples){
  const methods = PAYMENT_METHODS;
  return samples.slice(0,7).map(function(s,i){
    const base = TIERS[s.tier], gw = methods[(i*3)%methods.length];
    const c = calcInvoice(base, gw);
    const paid = i%3===2 ? Math.round(c.total*0.4*100)/100 : c.total;   // seeded partials
    return {
      id:"INV-2026-"+String(101+i), farmer:s.farmer, tier:s.tier,
      base:base, gw:gw, subtotal:c.subtotal, tax:c.tax, fee:c.fee, total:c.total,
      paid:paid, balance:Math.max(0, c.total-paid), currency:"USD",
      status: invStatus(c.total, paid),
      method:(["ZAAD-TXN-8F2A9C","SAHAL-88231-Q","EDAHAB-2219K","CASH-RCP-041","EVC-CP-77220","BNK-TRANS-9912"])[i%6],
      at:(9+i)+":3"+(i%10),
    };
  });
}
function seedMonth(){
  const days = today.getDate();
  return Array.from({length:days},function(_,i){return {
    day:i+1,
    samples:4+Math.round(6*Math.abs(Math.sin(i*0.9))),
    certs:3+Math.round(5*Math.abs(Math.sin(i*0.7+1))),
  };});
}
function seedRevenue(invoices){
  const months=["Mar","Apr","May","Jun","Jul","Aug"];
  const col=invoices.reduce(function(a,v){return a+v.paid;},0);
  const pen=invoices.reduce(function(a,v){return a+v.balance;},0);
  return months.map(function(m,i){return {month:m,
    collected: i===5?col:190+70*i+Math.round(40*Math.abs(Math.sin(i*1.3))),
    pending: i===5?pen:60+35*Math.abs(Math.sin(i))};});
}
const ENGINEERS = [
  {id:1, name:"Eng. Abdisalan Nur",    license:"LIC-2024-0112"},
  {id:2, name:"Eng. Sahra Mohamud",    license:"LIC-2025-0037"},
  {id:3, name:"Eng. Khalid Sheikh",    license:"LIC-2023-0289"},
];

/* ═════════ MODULE 6 · FIVE-YEAR ROTATION DATA ENGINE ═════════ */
const SEASONS = ["Gu","Deyr"];
const SEASON_SUGGESTIONS = ["Gu","Deyr","Xagaa","Jilaal","Hagaa","Rabi","Kharif","Dry season","Wet season"];
const CROP_LIBRARY = [
  {id:"maize",name:"Maize",family:"Poaceae",minPh:5.5,maxPh:7.5,color:"#f59e0b"},
  {id:"sorghum",name:"Sorghum",family:"Poaceae",minPh:5.5,maxPh:8.5,color:"#fb923c"},
  {id:"pearl_millet",name:"Pearl Millet",family:"Poaceae",minPh:5.0,maxPh:8.5,color:"#eab308"},
  {id:"cowpea",name:"Cowpea",family:"Fabaceae",minPh:5.5,maxPh:7.5,color:"#22c55e"},
  {id:"beans",name:"Beans",family:"Fabaceae",minPh:5.5,maxPh:7.5,color:"#10b981"},
  {id:"mung_bean",name:"Mung Bean",family:"Fabaceae",minPh:6.0,maxPh:7.5,color:"#34d399"},
  {id:"groundnut",name:"Groundnut",family:"Fabaceae",minPh:5.8,maxPh:7.2,color:"#84cc16"},
  {id:"sesame",name:"Sesame",family:"Pedaliaceae",minPh:5.5,maxPh:8.0,color:"#facc15"},
  {id:"tomato",name:"Tomato",family:"Solanaceae",minPh:5.5,maxPh:7.5,color:"#ef4444"},
  {id:"onion",name:"Onion",family:"Amaryllidaceae",minPh:6.0,maxPh:7.2,color:"#a78bfa"},
  {id:"garlic",name:"Garlic",family:"Amaryllidaceae",minPh:6.0,maxPh:7.5,color:"#c4b5fd"},
  {id:"watermelon",name:"Watermelon",family:"Cucurbitaceae",minPh:5.5,maxPh:7.5,color:"#f43f5e"},
  {id:"butternut",name:"Butternut",family:"Cucurbitaceae",minPh:5.8,maxPh:7.2,color:"#f97316"},
  {id:"red_kuri",name:"Red Kuri",family:"Cucurbitaceae",minPh:5.8,maxPh:7.2,color:"#dc2626"},
  {id:"cabbage",name:"Cabbage",family:"Brassicaceae",minPh:6.0,maxPh:7.5,color:"#14b8a6"},
  {id:"green_manure",name:"Green Manure",family:"Fabaceae",minPh:5.5,maxPh:7.8,color:"#059669"},
  {id:"banana",name:"Banana",family:"Musaceae",minPh:5.5,maxPh:7.5,color:"#fde047"},
  {id:"mango",name:"Mango",family:"Anacardiaceae",minPh:5.5,maxPh:8.0,color:"#fbbf24"},
];
const CROP_ALIASES = {
  corn:"maize",cornmeal:"maize",millet:"pearl_millet",pearlmillet:"pearl_millet",
  bean:"beans",commonbean:"beans",greenbeans:"beans",mungbean:"mung_bean",
  peanuts:"groundnut",peanut:"groundnut",sesame:"sesame",onions:"onion",
  wmelon:"watermelon",melon:"watermelon",butternuts:"butternut",redkuri:"red_kuri",
  greenmanure:"green_manure",covercrop:"green_manure",
};
function slug(value){
  return String(value||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
}
function compact(value){ return slug(value).replace(/_/g,""); }
function libraryCrop(raw){
  const key=compact(raw);
  const alias=CROP_ALIASES[key];
  return CROP_LIBRARY.find(function(c){return compact(c.id)===key||compact(c.name)===key||c.id===alias;})||null;
}
function csvRows(text){
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i+=1){
    const ch=text[i], next=text[i+1];
    if(ch==='"'&&quoted&&next==='"'){cell+='"';i+=1;continue;}
    if(ch==='"'){quoted=!quoted;continue;}
    if(ch===","&&!quoted){row.push(cell.trim());cell="";continue;}
    if((ch==="\n"||ch==="\r")&&!quoted){
      if(ch==="\r"&&next==="\n")i+=1;
      row.push(cell.trim());cell="";
      if(row.some(Boolean))rows.push(row);row=[];continue;
    }
    cell+=ch;
  }
  row.push(cell.trim()); if(row.some(Boolean))rows.push(row);
  return rows;
}
function rotationSlots(){
  const out=[];
  for(let year=1;year<=5;year+=1)SEASONS.forEach(function(season){out.push({key:"y"+year+"-"+season.toLowerCase(),year,season,cropId:""});});
  return out;
}
function defaultRotation(){
  const ids=["maize","cowpea","sorghum","groundnut","sesame","mung_bean","pearl_millet","beans","tomato","green_manure"];
  return rotationSlots().map(function(slot,i){return Object.assign({},slot,{cropId:ids[i]});});
}
function cropRecord(raw,family,minPh,maxPh){
  const known=libraryCrop(raw);
  if(known)return Object.assign({},known,{family:family||known.family,
    minPh:Number.isFinite(minPh)?minPh:known.minPh,maxPh:Number.isFinite(maxPh)?maxPh:known.maxPh});
  const name=String(raw||"").trim();
  return {id:slug(name)||"crop_"+Date.now(),name,family:family||"Unclassified",
    minPh:Number.isFinite(minPh)?minPh:5.5,maxPh:Number.isFinite(maxPh)?maxPh:7.5,color:"#64748b"};
}
function parseCropPlan(text){
  const rows=csvRows(text);
  if(!rows.length)throw new Error("The CSV is empty.");
  const headerIndex=rows.findIndex(function(row){return row.some(function(v){return ["crop","cropname","name"].includes(compact(v));});});
  let catalog=[], sequence=[], assignments=[];
  if(headerIndex>=0){
    const headers=rows[headerIndex].map(compact);
    const at=function(names){return headers.findIndex(function(h){return names.includes(h);});};
    const cropAt=at(["crop","cropname","name"]), familyAt=at(["family","cropfamily"]);
    const minAt=at(["minph","phmin","minimumph"]), maxAt=at(["maxph","phmax","maximumph"]);
    const yearAt=at(["year","planyear"]), seasonAt=at(["season","cycle"]);
    const data=rows.slice(headerIndex+1).filter(function(row){return row[cropAt]&&row[cropAt].trim();});
    const rawYears=data.map(function(r){return Number(r[yearAt]);}).filter(Number.isFinite);
    const actualYears=Array.from(new Set(rawYears.filter(function(y){return y>5;}))).sort();
    data.forEach(function(row){
      const crop=cropRecord(row[cropAt],row[familyAt],parseFloat(row[minAt]),parseFloat(row[maxAt]));
      catalog.push(crop);sequence.push(crop.id);
      let yr=Number(row[yearAt]);
      if(yr>5)yr=actualYears.indexOf(yr)+1;
      if(yr>=1&&yr<=5){
        const season=String(row[seasonAt]||"Gu").trim()||"Gu";
        const slotName=season.toLowerCase().includes("deyr")?"deyr":"gu";
        assignments.push({key:"y"+yr+"-"+slotName,cropId:crop.id,season:season});
      }
    });
  }else{
    const rowSequences=rows.map(function(row){
      const crops=row.map(libraryCrop).filter(Boolean);
      return crops.filter(function(c,i){return i===0||c.id!==crops[i-1].id;});
    }).filter(function(row){return row.length;});
    const best=rowSequences.sort(function(a,b){return b.length-a.length;})[0]||[];
    sequence=best.map(function(c){return c.id;});
    rows.forEach(function(row){row.forEach(function(cell){const crop=libraryCrop(cell);if(crop)catalog.push(crop);});});
  }
  catalog=catalog.filter(function(c,i,all){return all.findIndex(function(x){return x.id===c.id;})===i;});
  if(!catalog.length)throw new Error("No crop names were recognized. Include a 'crop' column or common crop names.");
  const slots=rotationSlots();
  if(assignments.length){assignments.forEach(function(a){const slot=slots.find(function(s){return s.key===a.key;});if(slot){slot.cropId=a.cropId;slot.season=a.season||slot.season;}});}
  let seqAt=0;
  slots.forEach(function(slot){if(!slot.cropId){slot.cropId=(sequence[seqAt%sequence.length]||catalog[seqAt%catalog.length].id);seqAt+=1;}});
  return {catalog,slots,rowCount:rows.length};
}

/* ═════════ UI ATOMS ═════════ */
function iconComponentName(name){
  return String(name||"").split("-").map(function(part){return part.charAt(0).toUpperCase()+part.slice(1);}).join("");
}
function reactSvgAttribute(name){
  if(name==="class")return "className";
  if(name.indexOf("aria-")===0||name.indexOf("data-")===0)return name;
  return name.replace(/-([a-z])/g,function(_,letter){return letter.toUpperCase();});
}
function renderLucideNode(node,key,rootClass){
  if(!node)return null;
  const tag=node[0], raw=node[1]||{}, children=node[2]||[];
  const attrs={key:key};
  Object.keys(raw).forEach(function(name){attrs[reactSvgAttribute(name)]=raw[name];});
  if(rootClass)attrs.className=rootClass;
  if(tag==="svg")attrs["aria-hidden"]="true";
  return e(tag,attrs,children.map(function(child,index){return renderLucideNode(child,key+"-"+index,null);}));
}
function Icon(props){
  const name=iconComponentName(props.name);
  const node=window.lucide&&lucide.icons&&lucide.icons[name];
  return node?renderLucideNode(node,"icon",props.cls||"w-4 h-4"):e("span",{className:props.cls||"w-4 h-4","aria-hidden":"true"});
}
function Panel(props){
  return e("section",{className:"rounded-2xl border border-slate-700/60 bg-slate-900/80 backdrop-blur p-4 shadow-xl "+(props.cls||"")},
    e("div",{className:"flex flex-wrap items-center gap-2 mb-3"},
      e("span",{className:"w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-300 flex items-center justify-center"},e(Icon,{name:props.icon})),
      e("h2",{className:"font-bold text-slate-100 text-sm tracking-wide"},props.title),
      props.right && e("div",{className:"ml-auto"},props.right)),
    props.children);
}
function EngineerPanel(props){
  return e(Panel,{title:"Technical Engineer on Duty",icon:"hard-hat",cls:"2xl:col-span-2",
    right:e("span",{className:"text-[10px] text-emerald-300 border border-emerald-700/60 rounded-full px-2 py-1"},"ACTIVE SHIFT")},
    e("div",{className:"grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3"},
      e("div",{className:"rounded-xl border border-emerald-600/50 bg-emerald-950/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3"},
        e("span",{className:"w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center"},e(Icon,{name:"shield-check",cls:"w-6 h-6"})),
        e("div",null,e("div",{className:"text-[10px] uppercase tracking-widest text-emerald-400"},"Active technical engineer"),
          e("div",{className:"font-bold text-lg text-white"},props.duty.name),
          e("div",{className:"font-mono text-xs text-slate-400"},props.duty.license)),
        e("select",{value:props.duty.id,onChange:function(ev){props.setDutyId(Number(ev.target.value));},
          className:"w-full sm:ml-auto sm:max-w-56 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs"},
          props.engineers.map(function(g){return e("option",{key:g.id,value:g.id},g.name);}))),
      e("div",{className:"rounded-xl border border-slate-700 bg-slate-800/50 p-3"},
        e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-2"},"Add engineer to duty roster"),
        e("div",{className:"grid grid-cols-1 sm:grid-cols-[1fr_150px_auto] gap-2"},
          e("input",{value:props.engName,onChange:function(ev){props.setEngName(ev.target.value);},placeholder:"Engineer full name",
            className:"bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs"}),
          e("input",{value:props.engLic,onChange:function(ev){props.setEngLic(ev.target.value);},placeholder:"License ID",
            className:"bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs"}),
          e("button",{onClick:props.addEngineer,disabled:!props.engName.trim()||!props.engLic.trim(),
            className:"rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 px-4 py-2 text-xs font-bold text-white"},
            e("span",{className:"flex items-center justify-center gap-1.5"},e(Icon,{name:"user-plus",cls:"w-3.5 h-3.5"}),"Add & activate"))),
        e("div",{className:"mt-2 text-[10px] text-slate-500"},props.engineers.length+" engineers in local roster · duty changes apply instantly"))));
}
function RotationPlanner(){
  const [catalog,setCatalog]=useState(function(){
    try{const saved=JSON.parse(localStorage.getItem("lims_crop_catalog"));return Array.isArray(saved)&&saved.length?saved:CROP_LIBRARY;}catch(_){return CROP_LIBRARY;}
  });
  const [rotation,setRotation]=useState(function(){
    try{const saved=JSON.parse(localStorage.getItem("lims_rotation"));return Array.isArray(saved)&&saved.length===10?saved:defaultRotation();}catch(_){return defaultRotation();}
  });
  const [fieldPh,setFieldPh]=useState(function(){return localStorage.getItem("lims_rotation_ph")||"6.5";});
  const [importState,setImportState]=useState({kind:"idle",message:"Upload a crop CSV or use the starter rotation."});
  useEffect(function(){localStorage.setItem("lims_crop_catalog",JSON.stringify(catalog));},[catalog]);
  useEffect(function(){localStorage.setItem("lims_rotation",JSON.stringify(rotation));},[rotation]);
  useEffect(function(){localStorage.setItem("lims_rotation_ph",fieldPh);},[fieldPh]);
  const byId=useMemo(function(){const out={};catalog.forEach(function(c){out[c.id]=c;});return out;},[catalog]);
  const phNum=parseFloat(fieldPh);
  const warnings=useMemo(function(){
    const out=[];
    rotation.forEach(function(slot,index){
      const crop=byId[slot.cropId]; if(!crop)return;
      if(Number.isFinite(phNum)&&(phNum<crop.minPh||phNum>crop.maxPh))out.push({key:slot.key,type:"pH",
        message:"Year "+slot.year+" "+slot.season+": "+crop.name+" prefers pH "+crop.minPh+"–"+crop.maxPh+" (field "+phNum.toFixed(1)+")."});
      const previous=index>0?byId[rotation[index-1].cropId]:null;
      if(previous&&previous.family===crop.family)out.push({key:slot.key,type:"family",
        message:"Year "+slot.year+" "+slot.season+": back-to-back "+crop.family+" after "+previous.name+" raises pest and nutrient risk."});
    });
    return out;
  },[rotation,byId,phNum]);
  const warningKeys=useMemo(function(){const out={};warnings.forEach(function(w){out[w.key]=(out[w.key]||[]).concat(w.type);});return out;},[warnings]);
  function setCrop(key,cropId){setRotation(function(prev){return prev.map(function(slot){return slot.key===key?Object.assign({},slot,{cropId}):slot;});});}
  function setSeason(key,season){setRotation(function(prev){return prev.map(function(slot){return slot.key===key?Object.assign({},slot,{season}):slot;});});}
  function autoBalance(){
    const suitable=catalog.filter(function(c){return !Number.isFinite(phNum)||(phNum>=c.minPh&&phNum<=c.maxPh);});
    const choices=suitable.length?suitable:catalog; let cursor=0,previous=null;
    const base=rotationSlots().map(function(slot,index){return Object.assign({},slot,{season:(rotation[index]&&rotation[index].season)||slot.season});});
    setRotation(base.map(function(slot){
      let crop=choices[cursor%choices.length];
      for(let tries=0;tries<choices.length&&previous&&crop.family===previous.family;tries+=1){cursor+=1;crop=choices[cursor%choices.length];}
      cursor+=1;previous=crop;return Object.assign({},slot,{cropId:crop.id});
    }));
    setImportState({kind:"ok",message:"Auto-balanced by soil pH and crop family."});
  }
  async function importCsv(ev){
    const file=ev.target.files&&ev.target.files[0]; if(!file)return;
    setImportState({kind:"loading",message:"Reading "+file.name+"…"});
    try{
      const result=parseCropPlan(await file.text());
      setCatalog(result.catalog);setRotation(result.slots);
      setImportState({kind:"ok",message:"Loaded "+result.catalog.length+" crops from "+result.rowCount+" CSV rows."});
    }catch(err){setImportState({kind:"error",message:err.message||"Unable to read crop CSV."});}
    ev.target.value="";
  }
  return e(Panel,{title:"5-Year Crop Rotation Planner",icon:"calendar-range",cls:"2xl:col-span-2",
    right:e("span",{className:"text-[10px] text-slate-500"},"10 crop slots · every season name is editable")},
    e("div",{className:"grid grid-cols-1 lg:grid-cols-[1.3fr_170px_auto] gap-2 items-end"},
      e("label",{className:"rounded-xl border border-dashed border-slate-600 hover:border-emerald-500 bg-slate-800/50 px-3 py-2 cursor-pointer"},
        e("span",{className:"flex items-center gap-2 text-xs font-semibold"},e(Icon,{name:"file-up",cls:"w-4 h-4 text-emerald-300"}),"Load crop CSV data"),
        e("span",{className:"block text-[10px] text-slate-500 mt-0.5"},"Supports crop/family/min_ph/max_ph/year/season rows and matrix templates"),
        e("input",{type:"file",accept:".csv,text/csv",onChange:importCsv,className:"hidden"})),
      e("label",{className:"text-[10px] uppercase tracking-widest text-slate-500"},"Field soil pH",
        e("input",{value:fieldPh,onChange:function(ev){setFieldPh(ev.target.value);},type:"number",min:"3",max:"11",step:"0.1",
          className:"mt-1 w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-lg px-3 py-2 text-sm text-slate-100"})),
      e("div",{className:"flex gap-2"},
        e("button",{onClick:autoBalance,className:"flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white flex items-center justify-center gap-1.5"},e(Icon,{name:"shuffle",cls:"w-3.5 h-3.5"}),"Auto-balance"),
        e("button",{onClick:function(){setRotation(function(prev){return prev.map(function(slot){return Object.assign({},slot,{cropId:""});});});},title:"Clear crops but keep season names",className:"rounded-lg border border-slate-700 hover:border-red-500 px-3 py-2 text-slate-400"},e(Icon,{name:"trash-2",cls:"w-3.5 h-3.5"})))),
    e("datalist",{id:"rotation-season-options"},SEASON_SUGGESTIONS.map(function(season){return e("option",{key:season,value:season});})),
    e("div",{className:"mt-2 text-[11px] "+(importState.kind==="error"?"text-red-300":importState.kind==="ok"?"text-emerald-300":"text-slate-500")},
      importState.kind==="loading"&&e(Icon,{name:"loader-circle",cls:"inline w-3.5 h-3.5 mr-1 animate-spin"}),importState.message),
    e("div",{className:"mt-3 overflow-x-auto pb-2"},
      e("div",{className:"min-w-[980px] grid grid-cols-5 gap-2"},[1,2,3,4,5].map(function(year){
        return e("div",{key:year,className:"rounded-xl border border-slate-700 bg-slate-950/70 p-2"},
          e("div",{className:"flex items-center justify-between mb-2"},e("b",{className:"text-xs text-slate-200"},"Year "+year),
            e("span",{className:"text-[9px] text-slate-600 font-mono"},"Y"+year)),
          rotation.filter(function(slot){return slot.year===year;}).map(function(slot){
            const crop=byId[slot.cropId], flags=warningKeys[slot.key]||[];
            return e("div",{key:slot.key,className:"mb-2 last:mb-0 rounded-lg border p-2 "+(flags.length?"border-amber-600/70 bg-amber-950/20":"border-slate-800 bg-slate-900/70"),
              style:crop?{borderLeftColor:crop.color,borderLeftWidth:"3px"}:null},
              e("div",{className:"flex items-end justify-between gap-1 mb-1.5"},
                e("label",{className:"text-[9px] uppercase tracking-widest text-slate-500 flex-1"},"Season",
                  e("input",{value:slot.season,list:"rotation-season-options",onChange:function(ev){setSeason(slot.key,ev.target.value);},
                    "aria-label":"Season for year "+year,className:"mt-0.5 w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded px-1.5 py-1 text-[10px] normal-case tracking-normal text-slate-200"})),
                flags.length?e(Icon,{name:"triangle-alert",cls:"w-3.5 h-3.5 text-amber-300 mb-1"}):e(Icon,{name:"circle-check",cls:"w-3.5 h-3.5 text-emerald-500 mb-1"})),
              e("select",{value:slot.cropId,onChange:function(ev){setCrop(slot.key,ev.target.value);},
                className:"w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs"},
                e("option",{value:""},"— fallow —"),catalog.map(function(c){return e("option",{key:c.id,value:c.id},c.name);})),
              crop&&e("div",{className:"mt-1.5 text-[9px] text-slate-500 leading-relaxed"},crop.family+" · pH "+crop.minPh+"–"+crop.maxPh));
          }));
      }))),
    e("div",{className:"mt-2 grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-3"},
      e("div",{className:"flex gap-2 text-[10px]"},
        e("span",{className:"rounded-full border border-amber-700 bg-amber-950/30 text-amber-200 px-2 py-1"},warnings.length+" warning"+(warnings.length===1?"":"s")),
        e("span",{className:"rounded-full border border-slate-700 text-slate-400 px-2 py-1"},catalog.length+" crops available")),
      warnings.length?e("div",{className:"max-h-24 overflow-y-auto space-y-1 pr-1"},warnings.map(function(w,i){return e("div",{key:w.key+"-"+w.type+"-"+i,className:"text-[10px] text-amber-200 flex gap-1.5"},e(Icon,{name:w.type==="pH"?"flask-conical":"repeat-2",cls:"w-3 h-3 flex-none mt-0.5"}),w.message);}))
        :e("div",{className:"text-[11px] text-emerald-300 flex items-center gap-1.5"},e(Icon,{name:"badge-check",cls:"w-3.5 h-3.5"}),"Rotation passes pH and consecutive-family checks.")));
}

/* ═════════ CERTIFICATE MODAL (Module 2) ═════════ */
function Certificate(props){
  const sample = props.sample;
  const v = phVerdict(sample.ph);
  useEffect(function(){ props.onIssued(); },[]);
  return e("div",{className:"fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4", role:"dialog","aria-modal":"true"},
    e("div",{className:"cert-wrap bg-white text-slate-900 rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto"},
      e("div",{className:"p-8"},
        e("div",{className:"border-b-2 border-emerald-700 pb-3 mb-4 flex items-center justify-between"},
          e("div",null,
            e("div",{className:"text-xl font-bold text-emerald-800 tracking-wide"},"SOMALI SPATIALBIO ENGINE"),
            e("div",{className:"text-[11px] tracking-widest text-slate-500 uppercase"},"Official Soil Analysis Certificate")),
          e("svg",{viewBox:"0 0 120 120",className:"w-20 h-20 seal"},
            e("defs",null,e("path",{id:"sa",d:"M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"})),
            e("circle",{cx:60,cy:60,r:56,fill:"none",stroke:"#047857",strokeWidth:2.2}),
            e("circle",{cx:60,cy:60,r:50,fill:"none",stroke:"#047857",strokeWidth:.8,strokeDasharray:"3 3"}),
            e("text",{fontSize:9,fill:"#047857",letterSpacing:2,fontFamily:"Arial"},
              e("textPath",{href:"#sa"},"SOMALI SPATIALBIO ENGINE \u2022 LAB CERTIFIED \u2022")),
            e("text",{x:60,y:62,textAnchor:"middle",fontSize:24,fill:"#047857"},"\u2714"),
            e("text",{x:60,y:78,textAnchor:"middle",fontSize:8,fill:"#047857",fontFamily:"monospace"},sample.id))),
        e("table",{className:"w-full text-sm"},
          e("tbody",null,[
            ["Sample Reference", "#"+sample.id],
            ["Client / Farmer", sample.farmer],
            ["Farm Location", sample.location+" — "+sample.texture],
            ["Test Tier", sample.tier],
            ["Date & Time", today.toDateString()+" · "+sample.time],
            ["Analyzing Engineer", sample.engineer],
          ].map(function(row,i){return e("tr",{key:row[0],className:i<5?"border-b border-slate-200":""},
            e("td",{className:"py-2 text-slate-500 w-40"},row[0]),e("td",{className:"py-2 font-semibold"},row[1]));}))),
        e("div",{className:"mt-4 grid grid-cols-3 gap-2 text-center"},
          [["Soil pH",sample.ph,"text-amber-600"],["EC dS/m",sample.ec,"text-sky-600"],["Organic %",sample.om,"text-emerald-600"]]
          .map(function(c){return e("div",{key:c[0],className:"rounded-lg bg-slate-100 p-2.5"},
            e("div",{className:"text-[10px] uppercase text-slate-500"},c[0]),
            e("div",{className:"text-2xl font-mono font-bold "+c[2]},c[1]));})),
        e("div",{className:"mt-4 rounded-lg border-2 p-3 " + (v.status==="Critically Acidic"?"border-red-300 bg-red-50":v.status==="Mildly Acidic"?"border-amber-300 bg-amber-50":v.status==="Alkaline"?"border-sky-300 bg-sky-50":"border-emerald-300 bg-emerald-50")},
          e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500"},"Chemical status"),
          e("div",{className:"font-bold text-lg "+v.color.replace("300","700")},v.status),
          e("div",{className:"mt-1 text-sm text-slate-700"},"\u2697 "+v.rec)),
        e("div",{className:"mt-6 flex justify-between text-xs text-slate-500"},
          e("span",null,"Analyst: ____________________"),
          e("span",null,"Supervisor: __________________")),
        e("div",{className:"mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center"},
          "Laboratory decision-support output — Somali SpatialBio Engine \u00B7 "+today.getFullYear())),
      e("div",{className:"flex gap-2 p-4 border-t bg-slate-50 rounded-b-2xl"},
        e("button",{onClick:function(){window.print();},className:"flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm"},"\uD83D\uDAF6 Print certificate"),
        e("button",{onClick:props.onClose,className:"px-4 py-2 rounded-lg bg-slate-200 text-sm"},"Close"))));
}

/* ═════════ MAIN APP ═════════ */
function App(){
  const [spectrum, setSpectrum] = useState(function(){const saved=localStorage.getItem("lims_spectrum");return SPECTRUM.some(function(s){return s.id===saved;})?saved:"slate";});
  const [spectrumOpen, setSpectrumOpen] = useState(false);
  const [engineers, setEngineers] = useState(function(){return JSON.parse(localStorage.getItem("lims_engineers")||"null")||ENGINEERS;});
  const [dutyId, setDutyId] = useState(function(){return parseInt(localStorage.getItem("lims_duty")||"1");});
  const duty = engineers.find(function(x){return x.id===dutyId;})||engineers[0];
  const firstEng = engineers[0].name+" — "+engineers[0].license;
  const [samples, setSamples] = useState(function(){return seedSamples(firstEng);});
  const [invoices, setInvoices] = useState(function(){return seedInvoices(samples);});
  const [month, setMonth] = useState(seedMonth);
  const [revenue, setRevenue] = useState(function(){return seedRevenue(seedInvoices(samples));});
  const [openCert, setOpenCert] = useState(null);
  const [issued, setIssued] = useState(0);
  const [engName, setEngName] = useState(""); const [engLic, setEngLic] = useState("");
  const [payName, setPayName] = useState(""); const [payTier, setPayTier] = useState("Basic pH Test");
  const [payBase, setPayBase] = useState("25"); const [payPaid, setPayPaid] = useState("");
  const [payGw, setPayGw] = useState("ZAAD");
  const [isSampleIds] = useState(new Set());
  /* Module 6 state — Option-2 asynchronous dictionary engine */
  const [diseases, setDiseases] = useState(null);          /* null = still loading (mock API) */
  const [catTab, setCatTab] = useState("All");
  const [disSearch, setDisSearch] = useState("");
  const [selHost, setSelHost] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [issueClient, setIssueClient] = useState(FARMERS[0][0]);
  const [issueDisease, setIssueDisease] = useState("");
  const [issueFeed, setIssueFeed] = useState([]);

  useEffect(function(){ localStorage.setItem("lims_spectrum",spectrum); },[spectrum]);
  useEffect(function(){ localStorage.setItem("lims_engineers",JSON.stringify(engineers)); },[engineers]);
  useEffect(function(){ localStorage.setItem("lims_duty",String(duty.id)); },[duty.id]);

  /* Mock asynchronous repository; cancellation avoids updates after unmount. */
  useEffect(function(){
    let active=true;
    loadDiseaseDictionary().then(function(records){if(active)setDiseases(records);});
    return function(){active=false;};
  },[]);

  const diseaseFiltered = useMemo(function(){
    if(!diseases) return [];
    const q=disSearch.trim().toLowerCase();
    return diseases.filter(function(d){
      if(catTab!=="All"&&d.cat!==catTab) return false;
      if(!q) return true;
      const hay=(d.plant+" "+d.disease+" "+d.cause+" "+d.symptoms.join(" ")+" "+d.remedy).toLowerCase();
      return hay.indexOf(q)>=0;
    });
  },[diseases,catTab,disSearch]);

  const catCounts = useMemo(function(){
    const m={All:(diseases||[]).length};
    DISEASE_CATEGORIES.slice(1).forEach(function(c){ m[c]=0; });
    (diseases||[]).forEach(function(d){ m[d.cat]=(m[d.cat]||0)+1; });
    return m;
  },[diseases]);

  const hostGroups = useMemo(function(){
    const m={};
    diseaseFiltered.forEach(function(d){
      if(!m[d.plant]) m[d.plant]={plant:d.plant,cat:d.cat,items:[]};
      m[d.plant].items.push(d);
    });
    return Object.keys(m).map(function(k){ return m[k]; });
  },[diseaseFiltered]);

  /* prune selections that the current filter set no longer contains */
  useEffect(function(){
    if(selHost && hostGroups.every(function(g){ return g.plant!==selHost; })) setSelHost(null);
    if(issueDisease && diseaseFiltered.every(function(d){ return (d.disease+"|"+d.plant)!==issueDisease; })) setIssueDisease("");
  });

  const totals = useMemo(function(){return {
    tested: samples.length, certs: issued,
    avgTAT: (samples.reduce(function(a,s){return a+s.turnaround;},0)/samples.length).toFixed(1)+" h",
    collected: invoices.reduce(function(a,v){return a+v.paid;},0),
    pending: invoices.reduce(function(a,v){return a+v.balance;},0),
  };},[samples,invoices,issued]);

  function addEngineer(){
    if(!engName.trim()||!engLic.trim())return;
    const ne={id:Date.now(),name:engName.trim(),license:engLic.trim()};
    setEngineers(engineers.concat([ne])); setEngName(""); setEngLic(""); setDutyId(ne.id);
  }

  /* payment intake — typed amounts */
  const baseNum = parseFloat(payBase)||0;
  const paidNum = payPaid===""?null:parseFloat(payPaid);
  const live = calcInvoice(baseNum, payGw);
  const liveBalance = paidNum==null?live.total:Math.max(0, live.total-paidNum);
  const liveCredit  = paidNum==null?0:Math.max(0, paidNum-live.total);
  function pickTier(t){ setPayTier(t); setPayBase(String(TIERS[t])); }
  function receivePay(){
    if(!payName.trim()||baseNum<=0)return;
    const c = calcInvoice(baseNum, payGw);
    const paid = paidNum==null?0:Math.max(0,paidNum);
    const inv={ id:"INV-2026-"+String(101+invoices.length), farmer:payName.trim(), tier:payTier,
      base:baseNum, gw:payGw, subtotal:c.subtotal, tax:c.tax, fee:c.fee, total:c.total,
      paid:paid, balance:Math.max(0,c.total-paid), currency:"USD",
      status:invStatus(c.total,paid),
      method:payGw+"-AUTO-"+Math.floor(Math.random()*89999+10000),
      at:new Date().toTimeString().slice(0,5), engineer:duty.name+" — "+duty.license };
    setInvoices(invoices.concat([inv]));
    setRevenue(function(prev){return prev.map(function(r){return r.month==="Aug"
      ? {month:r.month, collected:r.collected+inv.paid, pending:r.pending+inv.balance} : r;});});
    setPayName(""); setPayPaid("");
  }
  function settleInvoice(id){
    setInvoices(invoices.map(function(v){
      if(v.id!==id)return v;
      const newPaid=v.total;
      setRevenue(function(prev){return prev.map(function(r){return r.month==="Aug"
        ? {month:r.month, collected:r.collected+(v.total-v.paid), pending:Math.max(0,r.pending-v.balance)} : r;});});
      return Object.assign({},v,{paid:newPaid,balance:0,status:"PAID"});
    }));
  }
  function registerSample(){
    const ph=parseFloat(document.getElementById("s-ph").value);
    const nm=document.getElementById("s-name").value, lc=document.getElementById("s-loc").value;
    const tr=document.getElementById("s-tier").value;
    if(!nm.trim()||!lc.trim()||isNaN(ph)||ph<3||ph>14)return;
    const s={ id:"SMP-"+String(100+samples.length+1).slice(-3),
      farmer:nm.trim(), location:lc.trim(), texture:"field sample", tier:tr,
      ph:Math.round(ph*10)/10, ec:"—", om:"—",
      time:new Date().toTimeString().slice(0,5), turnaround:2.5,
      engineer:duty.name+" — "+duty.license, currency:"USD" };
    setSamples(samples.concat([s]));
    setMonth(function(m){return m.map(function(r){return r.day===today.getDate()?Object.assign({},r,{samples:r.samples+1}):r;});});
    document.getElementById("s-name").value="";document.getElementById("s-loc").value="";document.getElementById("s-ph").value="";
  }
  function appendIssue(rec){
    if(!rec||!issueClient.trim())return;
    const entry={ t:new Date().toTimeString().slice(0,5), client:issueClient,
      plant:rec.plant, disease:rec.disease, cat:rec.cat };
    setIssueFeed(function(f){ return [entry].concat(f).slice(0,12); });
  }
  function logIssue(){
    if(!issueDisease)return;
    const parts=issueDisease.split("|");
    appendIssue((diseases||[]).filter(function(d){ return d.disease===parts[0]&&d.plant===parts[1]; })[0]);
  }

  const themeCls = (SPECTRUM.find(function(s){return s.id===spectrum;})||{}).cls || "bg-slate-950";

  return e("div",{className:themeCls+" min-h-screen text-slate-100 transition-colors duration-500"},
    /* ── HEADER ── */
    e("header",{className:"sticky top-0 z-40 border-b border-slate-700/60 bg-black/30 backdrop-blur px-3 sm:px-4 min-h-14 py-2 flex flex-wrap items-center gap-2 sm:gap-3"},
      e("div",{className:"font-extrabold tracking-widest text-xs sm:text-sm"},
        e("span",{className:"text-emerald-400"},"SOMALI "),e("span",null,"SPATIALBIO "),e("span",{className:"text-sky-400"},"ENGINE"),
        e("span",{className:"hidden sm:inline text-slate-400 font-normal ml-2 text-xs"},"· LabOps LIMS")),
      e("a",{href:GIS_ENGINE_URL,title:"Open GIS Engine",className:"text-xs px-2.5 py-1.5 rounded-lg border border-slate-600 hover:border-emerald-500 text-slate-300 flex items-center gap-1"},e(Icon,{name:"map",cls:"w-3.5 h-3.5"}),e("span",{className:"hidden sm:inline"},"GIS Engine")),
      e("div",{className:"flex-1"}),
      e("div",{className:"hidden md:flex items-center gap-2 rounded-full border border-emerald-600/50 bg-emerald-900/30 px-3 py-1.5"},
        e("span",{className:"relative flex h-2 w-2"},
          e("span",{className:"animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"}),
          e("span",{className:"relative inline-flex rounded-full h-2 w-2 bg-emerald-400"})),
        e("span",{className:"text-xs"},"On duty: ",e("b",null,duty.name), e("span",{className:"text-slate-400 font-mono text-[10px] ml-1"},duty.license))),
      e("div",{className:"relative"},
        e("button",{onClick:function(){setSpectrumOpen(!spectrumOpen);},"aria-label":"Background spectrum","aria-expanded":spectrumOpen,
          className:"p-2 rounded-lg border border-slate-600 hover:border-emerald-500"},e(Icon,{name:"palette"})),
        spectrumOpen && e("div",{className:"absolute right-0 mt-2 w-52 rounded-xl border border-slate-600 bg-slate-900 shadow-2xl p-2 z-50"},
          e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 px-1 pb-1.5"},"Background spectrum"),
          SPECTRUM.map(function(s){return e("button",{key:s.id,onClick:function(){setSpectrum(s.id);setSpectrumOpen(false);},
            className:"w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left hover:bg-slate-800 "+(s.id===spectrum?"text-emerald-300":"text-slate-300")},
            e("span",{className:"w-3.5 h-3.5 rounded-full border border-white/20",style:{backgroundColor:s.swatch}}),s.label);}))),
    ),

    /* ── LAYOUT ── */
    e("div",{className:"grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-3 sm:gap-4 p-3 sm:p-4"},

      /* ══ LEFT · MONTHLY ANALYTICS ══ */
      e(Panel,{title:"Monthly Lab Analytics",icon:"calendar-days",cls:"xl:sticky xl:top-20 self-start"},
        e("div",{className:"space-y-2"},
          [["Total Samples Tested",totals.tested,"flask-conical","text-emerald-300"],
           ["Certificates Issued",totals.certs,"badge-check","text-sky-300"],
           ["Avg. Turnaround Time",totals.avgTAT,"timer","text-amber-300"],
           ["Revenue Collected (mo.)",money(totals.collected),"banknote","text-emerald-300"],
           ["Outstanding Balances",money(totals.pending),"hourglass","text-red-300"]]
          .map(function(c){return e("div",{key:c[0],className:"flex items-center justify-between rounded-xl border border-slate-700/60 bg-slate-800/60 px-3 py-2.5"},
            e("span",{className:"text-xs text-slate-400 flex items-center gap-2"},e(Icon,{name:c[2],cls:"w-3.5 h-3.5 "+c[3]}),c[0]),
            e("b",{className:"text-sm "+c[3]},c[1]));})),
        e("div",{className:"mt-3 h-44"},
          e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-1"},"Daily lab throughput — "+today.toLocaleString('en',{month:'long'})+" "+today.getFullYear()),
          e(ResponsiveContainer,{width:"100%",height:"100%"},
            e(BarChart,{data:month,margin:{top:4,right:4,left:-22,bottom:-6}},
              e(CartesianGrid,{stroke:"#1e293b",strokeDasharray:"3 3"}),
              e(XAxis,{dataKey:"day",tick:{fill:"#64748b",fontSize:9},tickLine:false,axisLine:{stroke:"#334155"}}),
              e(YAxis,{tick:{fill:"#64748b",fontSize:9},tickLine:false,axisLine:false}),
              e(Tooltip,{contentStyle:{background:"#0f172a",border:"1px solid #334155",borderRadius:10,fontSize:11}}),
              e(Legend,{wrapperStyle:{fontSize:10}}),
              e(Bar,{dataKey:"samples",name:"Samples",fill:"#34d399",radius:[2,2,0,0]}),
              e(Bar,{dataKey:"certs",name:"Certificates",fill:"#38bdf8",radius:[2,2,0,0]})))),
        e("div",{className:"mt-4 h-36"},
          e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-1"},"Monthly revenue · USD"),
          e(ResponsiveContainer,{width:"100%",height:"100%"},
            e(LineChart,{data:revenue,margin:{top:4,right:4,left:-24,bottom:-5}},
              e(CartesianGrid,{stroke:"#1e293b",strokeDasharray:"3 3"}),
              e(XAxis,{dataKey:"month",tick:{fill:"#64748b",fontSize:9},tickLine:false,axisLine:{stroke:"#334155"}}),
              e(YAxis,{tick:{fill:"#64748b",fontSize:8},tickLine:false,axisLine:false}),
              e(Tooltip,{contentStyle:{background:"#0f172a",border:"1px solid #334155",borderRadius:10,fontSize:10},formatter:function(v){return money(v);}}),
              e(Line,{type:"monotone",dataKey:"collected",name:"Revenue",stroke:"#34d399",strokeWidth:2.3,dot:{r:2}}))))
      ),

      /* ══ RIGHT AREA ══ */
      e("div",{className:"grid grid-cols-1 2xl:grid-cols-2 gap-4 content-start"},

        e(EngineerPanel,{duty,engineers,dutyId,setDutyId,engName,setEngName,engLic,setEngLic,addEngineer}),

        /* Module 2 — daily ledger */
        e(Panel,{title:"Daily Work History — Today "+today.toLocaleDateString(),icon:"clipboard-list",cls:"2xl:col-span-2",
          right:e("span",{className:"text-[10px] text-slate-500"},"click a row → certificate")},
          e("div",{className:"overflow-x-auto"},
            e("table",{className:"w-full text-xs"},
              e("thead",null,e("tr",{className:"text-left text-slate-500 border-b border-slate-700"},
                ["Ref","Farmer","Location","Test Tier","pH","Status","Engineer","Time"].map(function(h){return e("th",{key:h,className:"py-2 pr-3 font-medium"},h);}))),
              e("tbody",null,samples.map(function(s){
                const v=phVerdict(s.ph);
                return e("tr",{key:s.id,onClick:function(){setOpenCert(s);},onKeyDown:function(ev){if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();setOpenCert(s);}},role:"button",tabIndex:0,
                  className:"border-b border-slate-800 hover:bg-emerald-900/20 focus:bg-emerald-900/30 focus:outline-none cursor-pointer transition-colors"},
                  e("td",{className:"py-2 pr-3 font-mono text-emerald-300"},s.id),
                  e("td",{className:"py-2 pr-3"},s.farmer),
                  e("td",{className:"py-2 pr-3 text-slate-400"},s.location),
                  e("td",{className:"py-2 pr-3 text-slate-400"},s.tier),
                  e("td",{className:"py-2 pr-3 font-mono font-bold"},s.ph),
                  e("td",{className:"py-2 pr-3"},e("span",{className:"px-2 py-0.5 rounded-full border text-[10px] "+v.chip},v.status)),
                  e("td",{className:"py-2 pr-3 text-slate-400"},s.engineer.split(" — ")[0]),
                  e("td",{className:"py-2 text-slate-500"},s.time));
              })))),
          e("div",{className:"mt-3 rounded-xl border border-slate-700 bg-slate-800/50 p-3"},
            e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"},e(Icon,{name:"flask-conical",cls:"w-3.5 h-3.5"}),"Register New Sample — assigned to on-duty engineer"),
            e("div",{className:"grid grid-cols-2 lg:grid-cols-5 gap-2 text-xs"},
              e("input",{id:"s-name",placeholder:"Farmer name",className:"bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2"}),
              e("input",{id:"s-loc",placeholder:"Farm location",className:"bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2"}),
              e("select",{id:"s-tier",className:"bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2"},
                Object.keys(TIERS).map(function(t){return e("option",{key:t,value:t},t);})),
              e("input",{id:"s-ph",placeholder:"Measured pH",type:"number",step:"0.1",min:"3",max:"14",className:"bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2"}),
              e("button",{onClick:registerSample,className:"rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"},"Add Sample"))))),

        /* Module 5 — invoices + typed payment intake */
        e(Panel,{title:"Financial Ledger · Cash Intake",icon:"receipt"},
          e("div",{className:"overflow-x-auto max-h-56 overflow-y-auto pr-1"},
            e("table",{className:"w-full text-xs"},
              e("thead",null,e("tr",{className:"text-left text-slate-500 border-b border-slate-700"},
                ["Invoice","Client Name","Currency","Method","Charge","Tax 5%","Gateway Fee","Total USD","Paid","Balance","Status"].map(function(h){return e("th",{key:h,className:"py-2 pr-3 font-medium"},h);}))),
              e("tbody",null,invoices.map(function(v){
                const chip=v.status==="PAID"?"border-emerald-700 bg-emerald-900/40 text-emerald-300":v.status==="PARTIAL"?"border-amber-700 bg-amber-900/40 text-amber-300":"border-red-800 bg-red-900/40 text-red-300";
                return e("tr",{key:v.id,className:"border-b border-slate-800"},
                  e("td",{className:"py-1.5 pr-3 font-mono text-sky-300"},v.id),
                  e("td",{className:"py-1.5 pr-3"},v.farmer),
                  e("td",{className:"py-1.5 pr-3 font-mono text-slate-400"},v.currency),
                  e("td",{className:"py-1.5 pr-3 text-slate-400"},v.gw),
                  e("td",{className:"py-1.5 pr-3"},money(v.subtotal)),
                  e("td",{className:"py-1.5 pr-3"},money(v.tax)),
                  e("td",{className:"py-1.5 pr-3 text-slate-400"},money(v.fee)+" ("+(GATEWAYS[v.gw]*100).toFixed(1)+"%)"),
                  e("td",{className:"py-1.5 pr-3 font-bold text-emerald-300"},money(v.total)),
                  e("td",{className:"py-1.5 pr-3"},money(v.paid)),
                  e("td",{className:"py-1.5 pr-3 "+(v.balance>0?"text-red-300":"text-slate-500")},money(v.balance)),
                  e("td",{className:"py-1.5"},v.status==="PAID"
                    ? e("span",{className:"px-2 py-0.5 rounded-full border text-[10px] "+chip},"PAID")
                    : e("button",{onClick:function(){settleInvoice(v.id);},title:"Settle full balance",className:"px-2 py-0.5 rounded-full border text-[10px] "+chip+" hover:opacity-80"},v.status+" ⧉ settle")));
              }))))),
          e("div",{className:"mt-3 rounded-xl border border-slate-700 bg-slate-800/50 p-3"},
            e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"},e(Icon,{name:"banknote",cls:"w-3.5 h-3.5"}),"Cash Intake · Client, charge, USD currency & payment method"),
            e("div",{className:"grid grid-cols-2 lg:grid-cols-7 gap-2 text-xs"},
              e("input",{value:payName,onChange:function(ev){setPayName(ev.target.value);},placeholder:"Client Name","aria-label":"Client Name",className:"bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2"}),
              e("select",{value:payTier,onChange:function(ev){pickTier(ev.target.value);},className:"bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2"},
                Object.keys(TIERS).map(function(t){return e("option",{key:t,value:t},t+" ~ "+money(TIERS[t]));})),
              e("input",{value:payBase,onChange:function(ev){setPayBase(ev.target.value);},type:"number",min:"0",step:"0.01","aria-label":"Charge in USD",title:"Charge in USD (tier is only a suggestion)",className:"bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2"}),
              e("input",{value:"USD",readOnly:true,"aria-label":"Currency",className:"bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 font-mono text-emerald-300"}),
              e("select",{value:payGw,onChange:function(ev){setPayGw(ev.target.value);},"aria-label":"Payment method",className:"bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2"},
                PAYMENT_METHODS.map(function(g){return e("option",{key:g,value:g},g+" ("+(GATEWAYS[g]*100).toFixed(1)+"% fee)");})),
              e("input",{value:payPaid,onChange:function(ev){setPayPaid(ev.target.value);},type:"number",min:"0",step:"0.01",placeholder:"Amount paid USD",title:"What the farmer handed over today",className:"bg-slate-900 border border-emerald-700 rounded-lg px-2.5 py-2"}),
              e("button",{onClick:receivePay,disabled:!payName.trim()||baseNum<=0,className:"rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold"},"Record")),
            e("div",{className:"mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]"},
              e("span",{className:"text-slate-400"},"Subtotal ",e("b",null,money(live.subtotal))),
              e("span",{className:"text-slate-400"},"Gov. Tax 5% ",e("b",null,money(live.tax))),
              e("span",{className:"text-slate-400"},"Gateway Fee ",e("b",null,money(live.fee))),
              e("span",{className:"text-slate-400"},"Total Due ",e("b",{className:"text-emerald-300"},money(live.total))," USD"),
              e("span",{className:paidNum==null?"text-slate-500":"text-amber-300"},"Paid ",e("b",null,paidNum==null?"—":money(paidNum))),
              liveCredit>0?e("span",{className:"text-sky-300"},"Change/Credit ",e("b",null,money(liveCredit)))
                :e("span",{className:"text-red-300"},"Balance Owing ",e("b",null,money(liveBalance)))))),

        /* revenue chart */
        e(Panel,{title:"Revenue Trends",icon:"trending-up"},
          e("div",{className:"h-64"},
            e(ResponsiveContainer,{width:"100%",height:"100%"},
              e(LineChart,{data:revenue,margin:{top:4,right:8,left:-14,bottom:-4}},
                e(CartesianGrid,{stroke:"#1e293b",strokeDasharray:"3 3"}),
                e(XAxis,{dataKey:"month",tick:{fill:"#64748b",fontSize:10},tickLine:false,axisLine:{stroke:"#334155"}}),
                e(YAxis,{tick:{fill:"#64748b",fontSize:10},tickLine:false,axisLine:false}),
                e(Tooltip,{contentStyle:{background:"#0f172a",border:"1px solid #334155",borderRadius:10,fontSize:11},formatter:function(v){return money(v);}}),
                e(Legend,{wrapperStyle:{fontSize:11}}),
                e(Line,{type:"monotone",dataKey:"collected",name:"Income collected",stroke:"#34d399",strokeWidth:2.4,dot:{r:2.5}}),
                e(Line,{type:"monotone",dataKey:"pending",name:"Outstanding balances",stroke:"#f59e0b",strokeWidth:2.2,strokeDasharray:"6 4",dot:{r:2.2}})))),

        e(RotationPlanner),

        /* Module 5 — CROP PATHOLOGY · asynchronous dictionary */
        e(Panel,{title:"Crop Pathology Log · Disease & Treatment Intelligence",icon:"stethoscope",cls:"2xl:col-span-2"},
          /* control sector — category tabs with count badges + fuzzy search */
          e("div",{className:"flex flex-wrap items-center gap-1.5"},
            DISEASE_CATEGORIES.map(function(c){return e("button",{key:c,onClick:function(){setCatTab(c);},
              className:"flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition "+(catTab===c?"border-emerald-500 bg-emerald-900/40 text-emerald-200":"border-slate-700 text-slate-400 hover:border-slate-500")},
              e(Icon,{name:DISEASE_CAT_ICONS[c],cls:"w-3.5 h-3.5"}),c,
              e("span",{className:"ml-0.5 rounded-full bg-slate-800 border border-slate-600 px-1.5 py-0.5 text-[10px] font-bold"},String(catCounts[c]!=null?catCounts[c]:0)));}),
            e("div",{className:"relative flex-1 min-w-[220px]"},
              e(Icon,{name:"search",cls:"w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"}),
              e("input",{value:disSearch,onChange:function(ev){setDisSearch(ev.target.value);},placeholder:"Fuzzy search host, disease, pathogen or symptom text…",className:"w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg pl-8 pr-3 py-2 text-xs"}))),
          /* async body — skeleton during the 600ms mock fetch */
          diseases==null ? e("div",{className:"mt-3 space-y-2"},
            e("div",{className:"flex items-center gap-2 text-xs text-slate-500"},
              e(Icon,{name:"refresh-cw",cls:"w-3.5 h-3.5 animate-spin"}),
              "Syncing disease repository… (600 ms mock API latency)"),
            [0,1,2,3].map(function(i){return e("div",{key:i,className:"animate-pulse rounded-xl bg-slate-800/70 border border-slate-700/60 h-14"});}))
          : e("div",{className:"grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-3 mt-3"},
            /* Step 1 — searchable host-card grid */
            e("div",null,
              e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-1.5"},"Step 1 · Target Host — "+hostGroups.length+" match"+(hostGroups.length===1?"":"es")),
              e("div",{className:"grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1"},
                hostGroups.map(function(g){return e("button",{key:g.plant,onClick:function(){setSelHost(selHost===g.plant?null:g.plant);},
                  className:"rounded-xl border px-3 py-2.5 text-left transition "+(selHost===g.plant?"border-emerald-500 bg-emerald-900/25":"border-slate-700 bg-slate-800/60 hover:border-slate-500")},
                  e("div",{className:"flex items-center gap-2"},
                    e(Icon,{name:DISEASE_CAT_ICONS[g.cat]||"leaf",cls:"w-4 h-4 "+(selHost===g.plant?"text-emerald-300":"text-slate-500")}),
                    e("div",{className:"text-sm font-bold"},g.plant)),
                  e("div",{className:"text-[10px] text-slate-500 mt-0.5"},g.cat+" · "+g.items.length+" diagnosis"+(g.items.length>1?"es":"")));})),
              /* Farmer Field Issue integration */
              e("div",{className:"mt-3 rounded-xl border border-slate-700 bg-slate-800/50 p-3"},
                e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5"},
                  e(Icon,{name:"clipboard-list",cls:"w-3.5 h-3.5"}),"Writable Farmer Field Issue Logger"),
                e("input",{value:issueClient,onChange:function(ev){setIssueClient(ev.target.value);},list:"farmer-client-suggestions",
                  placeholder:"Type farmer or client name","aria-label":"Farmer or client name",
                  className:"w-full mb-1.5 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-2 text-xs"}),
                e("datalist",{id:"farmer-client-suggestions"},FARMERS.map(function(f){return e("option",{key:f[0],value:f[0]},f[1]);})),
                e("select",{value:issueDisease,onChange:function(ev){setIssueDisease(ev.target.value);},className:"w-full mb-1.5 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs"},
                  e("option",{value:""},"— link a filtered disease card —"),
                  diseaseFiltered.map(function(d){return e("option",{key:d.disease+"|"+d.plant,value:d.disease+"|"+d.plant},d.plant+" — "+d.disease);})),
                e("div",{className:"mb-1.5 text-[9px] text-slate-500"},diseaseFiltered.length+" diagnoses linked to the current pathology filters; clicking a diagnosis selects it here."),
                e("button",{onClick:logIssue,disabled:!issueClient.trim()||!issueDisease,
                  className:"w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-semibold px-3 py-2"},
                  "Log Field Issue & Issue Treatment Sheet")),
              issueFeed.length>0 && e("div",{className:"mt-2"},
                e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-1"},"Live diagnostic history (latest "+issueFeed.length+")"),
                e("div",{className:"max-h-36 overflow-y-auto space-y-1 pr-1"},
                  issueFeed.map(function(it,i){return e("div",{key:i,className:"rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] flex items-center gap-1.5 flex-wrap"},
                    e("span",{className:"text-slate-500"},"["+it.t+"]"),
                    e("b",null,it.client),
                    e("span",{className:"text-slate-600"},it.cat),
                    e("span",{className:"text-amber-300"},it.plant+" → "+it.disease),
                    e("span",{className:"text-slate-600 ml-auto"},"sheet issued ✓"));}))),
            ),
            /* Step 2 — diagnoses of the chosen host */
            e("div",null,
              selHost==null ? e("div",{className:"h-full min-h-44 flex flex-col items-center justify-center gap-2 text-slate-600 text-xs border border-dashed border-slate-700 rounded-xl"},
                e(Icon,{name:"scan-search",cls:"w-6 h-6"}),
                "Search or filter hosts, then click a card to list its diagnoses")
              : e("div",null,
                e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-1.5"},"Step 2 · "+selHost+" diagnoses — click any card to open its treatment manifest"),
                e("div",{className:"space-y-1.5 max-h-[26rem] overflow-y-auto pr-1"},
                  ((hostGroups.filter(function(g){return g.plant===selHost;})[0])||{items:[]}).items.map(function(d){return e("button",{key:d.disease,onClick:function(){setIssueDisease(d.disease+"|"+d.plant);setManifest(d);},
                    className:"w-full rounded-xl border border-slate-700 bg-slate-800/60 hover:border-amber-500 px-3 py-3 text-left transition"},
                    e("div",{className:"text-sm font-bold text-amber-300 flex items-center gap-2"},
                      e(Icon,{name:"bug",cls:"w-4 h-4"}),d.disease,
                      e("span",{className:"ml-auto text-[10px] font-normal text-slate-500 border border-slate-600 rounded-full px-2 py-0.5"},d.cat)),
                    e("div",{className:"text-[11px] text-slate-500 italic mt-0.5"},d.cause),
                    e("div",{className:"mt-1.5 flex flex-wrap gap-1"},
                      d.symptoms.slice(0,3).map(function(sx){return e("span",{key:sx,className:"rounded-full border border-slate-600 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-400"},sx);})));})))),
          /* Step 3 — Actionable Treatment Manifest overlay window */
          manifest && e("div",{className:"fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4",onClick:function(){setManifest(null);}},
            e("div",{className:"max-w-xl w-full rounded-2xl border border-amber-700/60 bg-slate-900 shadow-2xl p-5 max-h-[85vh] overflow-y-auto",onClick:function(ev){ev.stopPropagation();}},
              e("div",{className:"flex items-start gap-2"},
                e("div",null,
                  e("div",{className:"text-[10px] uppercase tracking-widest text-amber-400 font-bold"},"Step 3 · Actionable Treatment Manifest"),
                  e("div",{className:"text-lg font-bold mt-0.5"},manifest.disease,
                    e("span",{className:"text-slate-500 text-sm font-normal ml-2"},manifest.plant+" · "+manifest.cat))),
                e("button",{onClick:function(){setManifest(null);},className:"ml-auto p-1.5 rounded-lg border border-slate-700 hover:border-red-500 text-slate-400"},
                  e(Icon,{name:"x",cls:"w-4 h-4"}))),
              e("div",{className:"mt-3 rounded-lg bg-slate-900/70 border border-slate-700 p-3"},
                e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-0.5"},"Biological root cause / pathogen"),
                e("div",{className:"text-sm italic text-red-300"},manifest.cause)),
              e("div",{className:"mt-2 rounded-lg bg-slate-900/70 border border-slate-700 p-3"},
                e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-1"},"Observable visual symptoms"),
                e("div",{className:"flex flex-wrap gap-1.5"},
                  manifest.symptoms.map(function(sx){return e("span",{key:sx,className:"rounded-full border border-amber-700/60 bg-amber-950/30 px-2.5 py-1 text-[11px] text-amber-200"},sx);}))),
              e("div",{className:"mt-2 rounded-lg bg-slate-900/70 border border-slate-700 p-3"},
                e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-1"},"Immediate field mitigation steps"),
                e("ul",{className:"text-sm space-y-1"},manifest.immediate.map(function(step,i){return e("li",{key:i,className:"flex gap-2"},
                  e("span",{className:"text-emerald-400 font-bold"},(i+1)+"."),
                  e("span",null,step));}))),
              e("div",{className:"mt-2 rounded-lg bg-slate-900/70 border border-slate-700 p-3"},
                e("div",{className:"text-[10px] uppercase tracking-widest text-slate-500 mb-0.5"},"Chemical / cultural treatment programme"),
                e("div",{className:"text-sm text-sky-300"},manifest.remedy)),
              e("button",{onClick:function(){appendIssue(manifest);setManifest(null);},
                className:"mt-3 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 flex items-center justify-center gap-2"},
                e(Icon,{name:"history",cls:"w-3.5 h-3.5"}),"Log issue to treatment timeline")))
            ),
        ),
      ),

    /* footer */
    e("footer",{className:"px-4 pb-4 text-[10px] text-slate-500 flex items-center gap-2"},
      e(Icon,{name:"satellite",cls:"w-3.5 h-3.5 text-sky-400"}),
      "Somali SpatialBio Engine · LabOps LIMS — fully local state, same-origin assets. Currency: USD."),

    /* certificate modal */
    openCert && e(Certificate,{sample:openCert,onClose:function(){setOpenCert(null);},
      onIssued:function(){ if(!isSampleIds.has(openCert.id)){isSampleIds.add(openCert.id);setIssued(function(i){return i+1;});} }}),
  );
}

/* self-check: offline-safe vendor guard */
(function(){
  var root=document.getElementById("root");
  if(!window.React||!window.ReactDOM||!window.Recharts||!window.lucide){
    root.innerHTML='<div style="margin:2rem;padding:1rem;border:2px solid #ef4444;border-radius:12px;color:#fff;background:#7f1d1d;font-family:sans-serif">⚠ LIMS library load failure — a vendored asset failed to load. Check <code>/web/vendor/</code> files.</div>';
    return;
  }
  ReactDOM.createRoot(root).render(e(App));
})();
