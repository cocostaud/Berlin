const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let activeTab='map', searchText='', activeCategory='Tous', activeQuarter='Tous';
let map, markerLayer, userMarker, currentPlace=null, lastFitKey='';
const legacyImageCache=new Map();
const curatedImageCache=new Map();
const legacyImageIndex=JSON.parse(localStorage.getItem('berlin-photo-index')||'{}');
const curatedImageIndex=JSON.parse(localStorage.getItem('berlin-v2-photo-index')||'{}');
const CATEGORIES=[...new Set(PLACES.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,'fr'));
const QUARTERS=[...new Set(PLACES.map(p=>p.quarter))].sort((a,b)=>a.localeCompare(b,'fr'));

function escapeHtml(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function baseFilteredPlaces(){return PLACES.filter(p=>{const hay=`${p.name} ${p.address} ${p.category} ${p.quarter}`.toLowerCase();return !searchText||hay.includes(searchText)});}
function filteredPlaces(){return baseFilteredPlaces().filter(p=>(activeCategory==='Tous'||p.category===activeCategory)&&(activeQuarter==='Tous'||p.quarter===activeQuarter));}
function setTab(tab){activeTab=tab;$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$$('.view').forEach(v=>v.classList.remove('active'));$('#'+tab+'View').classList.add('active');renderAll();if(tab==='map')setTimeout(()=>{map.invalidateSize();fitVisible(true)},60);}
function setCategory(v,toMap=false){activeCategory=v;renderAll();if(toMap)setTab('map');}
function setQuarter(v,toMap=false){activeQuarter=v;renderAll();if(toMap)setTab('map');}
function resetFilters(){activeCategory='Tous';activeQuarter='Tous';searchText='';$('#search').value='';renderAll();if(activeTab==='map')fitVisible(true);}
function renderActiveFilters(){const arr=[];if(activeCategory!=='Tous')arr.push(`Catégorie : ${activeCategory}`);if(activeQuarter!=='Tous')arr.push(`Quartier : ${activeQuarter}`);if(searchText)arr.push(`Recherche : “${searchText}”`);const el=$('#activeFilters');el.hidden=!arr.length;el.innerHTML=arr.map(x=>`<span>${escapeHtml(x)}</span>`).join('')+(arr.length?'<button id="inlineReset">Tout afficher</button>':'');if(arr.length)$('#inlineReset').onclick=resetFilters;}
function card(p){const el=document.createElement('article');el.className='card';el.innerHTML=`<div class="photo-shell"><img alt="${escapeHtml(p.name)}" loading="lazy"><div class="mini-photo-state"></div></div><div class="card-body"><div class="card-category">${escapeHtml(p.category)}</div><h3>${escapeHtml(p.name)}</h3><div class="card-meta">${escapeHtml(p.quarter)}</div></div>`;el.onclick=()=>openPlace(p);loadPhoto(p,el.querySelector('img'),el.querySelector('.mini-photo-state'));return el;}
function grouped(holder,key,filterSetter){const rows=baseFilteredPlaces().filter(p=>key==='category'?(activeQuarter==='Tous'||p.quarter===activeQuarter):(activeCategory==='Tous'||p.category===activeCategory));const mapGroups=new Map();rows.forEach(p=>{const k=p[key];if(!mapGroups.has(k))mapGroups.set(k,[]);mapGroups.get(k).push(p)});holder.innerHTML='';[...mapGroups.entries()].sort(([a],[b])=>a.localeCompare(b,'fr')).forEach(([name,items])=>{const section=document.createElement('section');section.className='group';section.innerHTML=`<div class="group-head"><div><h3>${escapeHtml(name)}</h3><span>${items.length} lieu${items.length>1?'x':''}</span></div><button>Voir sur la carte</button></div><div class="grid"></div>`;section.querySelector('button').onclick=()=>filterSetter(name,true);const grid=section.querySelector('.grid');items.forEach(p=>grid.appendChild(card(p)));holder.appendChild(section)});if(!rows.length)holder.innerHTML='<div class="empty">Aucun lieu avec ces filtres.</div>';}
function renderAll(){const fp=filteredPlaces();$('#countLabel').textContent=`${fp.length} lieu${fp.length>1?'x':''} affiché${fp.length>1?'s':''} · ${PLACES.length} au total`;renderActiveFilters();grouped($('#categoryGroups'),'category',setCategory);grouped($('#quarterGroups'),'quarter',setQuarter);if(map)renderMarkers();}
function markerIcon(p){const special=p.kind==='hotel'?'hotel':p.kind==='work'?'work':'spot';const symbol=p.kind==='hotel'?'⌂':p.kind==='work'?'◆':'•';return L.divIcon({className:'custom-marker-wrap',html:`<div class="custom-marker ${special}">${symbol}</div>`,iconSize:[28,34],iconAnchor:[14,30],popupAnchor:[0,-27]});}
function initMap(){map=L.map('map',{zoomControl:true}).setView([52.52,13.405],11);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);markerLayer=L.layerGroup().addTo(map);renderMarkers();fitVisible(true);}
function renderMarkers(){if(!markerLayer)return;markerLayer.clearLayers();const fp=filteredPlaces();fp.forEach(p=>{const m=L.marker([p.lat,p.lng],{icon:markerIcon(p)}).addTo(markerLayer);m.bindPopup(`<div class="popup-name">${escapeHtml(p.name)}</div><div class="popup-cat">${escapeHtml(p.category)} · ${escapeHtml(p.quarter)}</div><button class="popup-open" onclick="window.openPlaceById(${p.id})">Voir la fiche</button>`)});$('#mapStatus').textContent=`Carte : ${fp.length}/${fp.length} lieux affichés · ${PLACES.length}/${PLACES.length} positionnés`;}
function fitVisible(force=false){const fp=filteredPlaces();if(!fp.length)return;const key=fp.map(p=>p.id).join(',');if(!force&&key===lastFitKey)return;lastFitKey=key;const bounds=L.latLngBounds(fp.map(p=>[p.lat,p.lng]));if(fp.length===1)map.setView([fp[0].lat,fp[0].lng],15);else map.fitBounds(bounds,{padding:[28,28],maxZoom:14});}
window.openPlaceById=id=>openPlace(PLACES.find(p=>p.id===id));
function commonsFileUrl(file){return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(file)}?width=1200`;}
function placeholder(p){const title=escapeHtml(p.name).replace(/&/g,'&amp;');const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760"><rect width="100%" height="100%" fill="#ece9e3"/><path d="M0 570 L260 370 420 490 650 250 1200 650 1200 760 0 760Z" fill="#d7d2c8"/><text x="70" y="105" font-family="Arial,sans-serif" font-size="28" fill="#786f63" letter-spacing="3">PHOTO À VALIDER</text><text x="70" y="180" font-family="Arial,sans-serif" font-size="46" font-weight="700" fill="#1d1d1b">${title.slice(0,38)}</text></svg>`;return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}
async function legacyCommonsImages(p){
  if(legacyImageCache.has(p.id))return legacyImageCache.get(p.id);
  const q=encodeURIComponent(p.photoQuery);
  const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url&iiurlwidth=1000&format=json&origin=*`;
  try{
    const r=await fetch(url); const j=await r.json();
    const imgs=Object.values(j.query?.pages||{}).map(x=>x.imageinfo?.[0]?.thumburl||x.imageinfo?.[0]?.url).filter(Boolean);
    legacyImageCache.set(p.id,imgs); return imgs;
  }catch(e){ legacyImageCache.set(p.id,[]); return []; }
}
async function curatedCommonsImages(p){
  if(curatedImageCache.has(p.id))return curatedImageCache.get(p.id);
  const list=[];
  if(p.photoUrl)list.push(p.photoUrl);
  if(p.photoFile)list.push(commonsFileUrl(p.photoFile));
  const q=encodeURIComponent(`"${p.photoQuery}" Berlin`);
  const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=12&prop=imageinfo&iiprop=url&iiurlwidth=1200&format=json&origin=*`;
  try{
    const r=await fetch(url); const j=await r.json();
    const bad=/logo|karte|map|plan|poster|icon|svg|coat.of.arms|wappen/i;
    Object.values(j.query?.pages||{}).sort((a,b)=>(a.index||99)-(b.index||99)).forEach(x=>{
      if(bad.test(x.title||''))return;
      const u=x.imageinfo?.[0]?.thumburl||x.imageinfo?.[0]?.url;
      if(u&&!list.includes(u))list.push(u);
    });
  }catch(e){}
  curatedImageCache.set(p.id,list); return list;
}
async function photosFor(p){return p.photoMode==='legacy'?legacyCommonsImages(p):curatedCommonsImages(p);}
function indexStoreFor(p){return p.photoMode==='legacy'?legacyImageIndex:curatedImageIndex;}
function indexKeyFor(p){return p.photoMode==='legacy'?'berlin-photo-index':'berlin-v2-photo-index';}
async function loadPhoto(p,img,state,forceIndex){
  if(state)state.textContent='Chargement…';
  const imgs=await photosFor(p);
  const store=indexStoreFor(p);
  let idx=forceIndex??(store[p.id]||0);
  if(imgs.length)idx%=imgs.length;
  const candidates=imgs.length?imgs:[placeholder(p)];
  let tries=0;
  const tryOne=()=>{
    const src=candidates[(idx+tries)%candidates.length];
    img.classList.remove('loaded');
    img.onload=()=>{img.classList.add('loaded');if(state)state.textContent=imgs.length?'':'Photo à valider';};
    img.onerror=()=>{tries++;if(tries<candidates.length)tryOne();else{img.onerror=null;img.src=placeholder(p);if(state)state.textContent='Photo à valider';}};
    img.src=src;
  };
  tryOne();
}
async function openPlace(p){currentPlace=p;$('#dialogName').textContent=p.name;$('#dialogCategory').textContent=`${p.category} · ${p.quarter}`;$('#dialogNote').textContent=p.note;$('#dialogAddress').textContent=p.address;const dest=`${p.lat},${p.lng}`;$('#googleLink').href=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;$('#appleLink').href=`https://maps.apple.com/?daddr=${encodeURIComponent(dest)}`;const img=$('#dialogPhoto');img.alt=p.name;img.src='';await loadPhoto(p,img,$('#photoState'));$('#placeDialog').showModal();}
$('#nextPhoto').onclick=async()=>{if(!currentPlace)return;const imgs=await photosFor(currentPlace);if(!imgs.length)return;const store=indexStoreFor(currentPlace);store[currentPlace.id]=((store[currentPlace.id]||0)+1)%imgs.length;localStorage.setItem(indexKeyFor(currentPlace),JSON.stringify(store));loadPhoto(currentPlace,$('#dialogPhoto'),$('#photoState'),store[currentPlace.id]);};
$('#closeDialog').onclick=()=>$('#placeDialog').close();$('#placeDialog').addEventListener('click',e=>{if(e.target===$('#placeDialog'))$('#placeDialog').close()});
$('#search').addEventListener('input',e=>{searchText=e.target.value.trim().toLowerCase();renderAll();if(activeTab==='map')fitVisible(true)});$('#clearFilters').onclick=resetFilters;$$('.tab').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('#fitBtn').onclick=()=>fitVisible(true);$('#locateBtn').onclick=()=>{if(!navigator.geolocation){alert('Localisation non disponible.');return}navigator.geolocation.getCurrentPosition(pos=>{const ll=[pos.coords.latitude,pos.coords.longitude];if(userMarker)userMarker.remove();userMarker=L.circleMarker(ll,{radius:8,weight:3,fillOpacity:.8}).addTo(map).bindPopup('Vous êtes ici').openPopup();map.setView(ll,14);},()=>alert('Impossible d’obtenir votre position.'));};
let deferredPrompt;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true}};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').then(r=>r.update()).catch(()=>{});
initMap();renderAll();
