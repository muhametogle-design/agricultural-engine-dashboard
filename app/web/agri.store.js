/* Unified offline catalog store shared by LIMS and GIS tabs/windows. */
(function(global){
  "use strict";
  const DB_NAME="agri-unified-catalog",STORE="produce",META="metadata",CHANNEL="agri-catalog-sync";
  const channel=typeof BroadcastChannel!=="undefined"?new BroadcastChannel(CHANNEL):null;
  let dbPromise=null;
  function open(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      if(!global.indexedDB){reject(new Error("IndexedDB unavailable"));return;}
      const request=indexedDB.open(DB_NAME,1);
      request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});if(!db.objectStoreNames.contains(META))db.createObjectStore(META,{keyPath:"key"});};
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    });
    return dbPromise;
  }
  async function request(storeName,mode,action){
    const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(storeName,mode),req=action(tx.objectStore(storeName));req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
  }
  const all=async()=>{const rows=await request(STORE,"readonly",store=>store.getAll());return rows.sort((a,b)=>a.name.localeCompare(b.name));};
  async function seed(){
    const shared=global.AGRI_SHARED;if(!shared)return [];
    const version=await request(META,"readonly",store=>store.get("catalog-version"));
    if(version&&version.value===shared.version)return all();
    const db=await open();await new Promise((resolve,reject)=>{const tx=db.transaction([STORE,META],"readwrite"),produce=tx.objectStore(STORE),meta=tx.objectStore(META);produce.clear();shared.catalog.forEach(item=>produce.put(Object.assign({catalogSource:"shared-seed"},item)));meta.put({key:"catalog-version",value:shared.version,seededAt:new Date().toISOString()});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    return all();
  }
  function notify(){channel&&channel.postMessage({type:"catalog-changed",at:Date.now()});global.dispatchEvent(new CustomEvent("agri-catalog-changed"));}
  async function upsert(item){await request(STORE,"readwrite",store=>store.put(Object.assign({catalogSource:"local"},item)));notify();return item;}
  async function upsertMany(items){const db=await open();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);items.forEach(item=>store.put(Object.assign({catalogSource:"local"},item)));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});notify();return items;}
  async function remove(id){await request(STORE,"readwrite",store=>store.delete(id));notify();}
  function subscribe(callback){const refresh=()=>all().then(callback).catch(console.warn),listener=event=>{if(event.data?.type==="catalog-changed")refresh();};channel&&channel.addEventListener("message",listener);global.addEventListener("agri-catalog-changed",refresh);return()=>{channel&&channel.removeEventListener("message",listener);global.removeEventListener("agri-catalog-changed",refresh);};}
  const ready=seed();
  global.AGRI_DATA_STORE={version:1,ready,all,upsert,upsertMany,remove,subscribe};
})(window);
