const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let activeTab='map', searchText='', activeCategory='Tous', activeQuarter='Tous';
let map, markerLayer, geocoding=false, currentPlace=null;
const imageCache=new Map();
const imageIndex=JSON.parse(localStorage.getItem('berlin-photo-index')||'{}');
const coordCache=JSON.parse(localStorage.getItem('berlin-coords')||'{}');

function filteredPlaces(){
  return PLACES.filter(p=>{
    const hay=`${p.name} ${p.address} ${p.category} ${p.quarter}`.toLowerCase();
    if(searchText && !hay.includes(searchText)) return false;
    if(activeTab==='categories' && activeCategory!=='Tous' && p.category!==activeCategory) return false;
    if(activeTab==='quarters' && activeQuarter!=='Tous' && p.quarter!==activeQuarter) return false;
    return true;
  });
}

function setTab(tab){
  activeTab=tab;
  $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  $$('.view').forEach(v=>v.classList.remove('active'));
  $('#'+tab+'View').classList.add('active');
  renderAll();
  if(tab==='map'){ setTimeout(()=>map.invalidateSize(),50); startGeocoding(); }
}

function chips(values, holder, current, onClick){
  holder.innerHTML='';
  ['Tous',...values].forEach(v=>{
    const b=document.createElement('button'); b.className='chip'+(v===current?' active':''); b.textContent=v;
    b.onclick=()=>onClick(v); holder.appendChild(b);
  });
}

function card(p){
  const el=document.createElement('article'); el.className='card';
  el.innerHTML=`<div class="photo-shell"><img alt="${escapeHtml(p.name)}" loading="lazy"></div><div class="card-body"><div class="card-category">${escapeHtml(p.category)}</div><h3>${escapeHtml(p.name)}</h3><div class="card-meta">${escapeHtml(p.quarter)}</div></div>`;
  el.onclick=()=>openPlace(p);
  loadPhoto(p,el.querySelector('img'));
  return el;
}

function renderCards(holder, places){ holder.innerHTML=''; places.forEach(p=>holder.appendChild(card(p))); }
function renderAll(){
  const fp=filteredPlaces(); $('#countLabel').textContent=`${fp.length} lieu${fp.length>1?'x':''} affiché${fp.length>1?'s':''} · 55 au total`;
  const cats=[...new Set(PLACES.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,'fr'));
  const qs=[...new Set(PLACES.map(p=>p.quarter))].sort((a,b)=>a.localeCompare(b,'fr'));
  chips(cats,$('#categoryChips'),activeCategory,v=>{activeCategory=v;renderAll()});
  chips(qs,$('#quarterChips'),activeQuarter,v=>{activeQuarter=v;renderAll()});
  if(activeTab==='categories') renderCards($('#categoryGrid'),fp); else $('#categoryGrid').innerHTML='';
  if(activeTab==='quarters') renderCards($('#quarterGrid'),fp); else $('#quarterGrid').innerHTML='';
  if(map) renderMarkers();
}

function initMap(){
  map=L.map('map',{zoomControl:true}).setView([52.52,13.405],11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  markerLayer=L.layerGroup().addTo(map); renderMarkers();
}
function coordsFor(p){ if(p.lat&&p.lng)return [p.lat,p.lng]; if(coordCache[p.id])return coordCache[p.id]; return null; }
function renderMarkers(){
  if(!markerLayer)return; markerLayer.clearLayers(); let n=0;
  filteredPlaces().forEach(p=>{ const c=coordsFor(p); if(!c)return; n++; const m=L.marker(c).addTo(markerLayer); m.bindPopup(`<div class="popup-name">${escapeHtml(p.name)}</div><div class="popup-cat">${escapeHtml(p.category)} · ${escapeHtml(p.quarter)}</div><button class="popup-open" onclick="window.openPlaceById(${p.id})">Voir la fiche</button>`); });
  const known=PLACES.filter(p=>coordsFor(p)).length;
  $('#mapStatus').textContent=`Carte : ${known}/55 lieux positionnés${geocoding?' · positionnement automatique en cours…':''}`;
}
window.openPlaceById=id=>openPlace(PLACES.find(p=>p.id===id));

async function startGeocoding(){
  if(geocoding)return; const missing=PLACES.filter(p=>!coordsFor(p)); if(!missing.length){renderMarkers();return}
  geocoding=true; renderMarkers();
  for(const p of missing){
    try{
      const q=encodeURIComponent(`${p.name}, ${p.address}, Berlin, Germany`);
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${q}`,{headers:{'Accept-Language':'fr'}});
      const j=await r.json();
      if(j[0]){coordCache[p.id]=[Number(j[0].lat),Number(j[0].lon)]; localStorage.setItem('berlin-coords',JSON.stringify(coordCache)); renderMarkers();}
    }catch(e){}
    await new Promise(res=>setTimeout(res,1150));
  }
  geocoding=false; renderMarkers();
}

async function commonsImages(p){
  if(imageCache.has(p.id))return imageCache.get(p.id);
  const q=encodeURIComponent(p.photoQuery);
  const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json&origin=*`;
  try{
    const r=await fetch(url); const j=await r.json();
    const imgs=Object.values(j.query?.pages||{}).map(x=>x.imageinfo?.[0]?.thumburl||x.imageinfo?.[0]?.url).filter(Boolean);
    imageCache.set(p.id,imgs); return imgs;
  }catch(e){ imageCache.set(p.id,[]); return []; }
}
const fallbackPhotos=[
  'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?auto=format&fit=crop&w=1200&q=80'
];
async function loadPhoto(p,img,forceIndex){
  const imgs=await commonsImages(p); let idx=forceIndex??(imageIndex[p.id]||0); if(imgs.length)idx%=imgs.length;
  img.src=imgs[idx]||fallbackPhotos[p.id%fallbackPhotos.length]; img.onload=()=>img.classList.add('loaded');
}
async function openPlace(p){
  currentPlace=p; $('#dialogName').textContent=p.name; $('#dialogCategory').textContent=`${p.category} · ${p.quarter}`; $('#dialogNote').textContent=p.note; $('#dialogAddress').textContent=p.address;
  const query=encodeURIComponent(`${p.name}, ${p.address}`); $('#googleLink').href=`https://www.google.com/maps/search/?api=1&query=${query}`; $('#appleLink').href=`https://maps.apple.com/?q=${query}`;
  const img=$('#dialogPhoto'); img.src=''; await loadPhoto(p,img); $('#placeDialog').showModal();
}
$('#nextPhoto').onclick=async()=>{ if(!currentPlace)return; const imgs=await commonsImages(currentPlace); if(!imgs.length)return; imageIndex[currentPlace.id]=((imageIndex[currentPlace.id]||0)+1)%imgs.length; localStorage.setItem('berlin-photo-index',JSON.stringify(imageIndex)); loadPhoto(currentPlace,$('#dialogPhoto'),imageIndex[currentPlace.id]); };
$('#closeDialog').onclick=()=>$('#placeDialog').close(); $('#placeDialog').addEventListener('click',e=>{if(e.target===$('#placeDialog'))$('#placeDialog').close()});
$('#search').addEventListener('input',e=>{searchText=e.target.value.trim().toLowerCase();renderAll()});
$$('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function escapeHtml(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

let deferredPrompt; window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false}); $('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
initMap(); renderAll(); startGeocoding();
