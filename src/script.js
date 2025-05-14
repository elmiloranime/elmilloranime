const originalTitle = document.title;
const paginasCache  = [];
const params        = new URLSearchParams(window.location.search);
const animeParam    = params.get('anime');
const videoParam    = params.get('video');

function generarSlug(texto) {
  return texto.toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-');
}

function mostrarModal(t, c, tipo) {
  const mc = document.getElementById('modal-content');
  mc.innerHTML =
    `<span class="modal-close" onclick="cerrarModal()">×</span>` +
    `<span class="categoria ${tipo}">${tipo}</span>` +
    `<h2>${t}</h2>` +
    c;
  document.getElementById('modal').style.display = 'flex';
  document.title = t;
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  history.replaceState(null,'',window.location.pathname);
  document.title = originalTitle;
}

async function cargarPaginas() {
  const res  = await fetch('/feeds/pages/default?alt=json');
  const data = await res.json();
  const cont = document.getElementById('pages-container');
  for (const e of data.feed.entry||[]) {
    const titulo    = e.title.$t;
    const contenido = e.content.$t;
    const imgM      = contenido.match(/<div class="caraturla">.*?<img[^>]+src="([^">]+)"/s);
    if (!imgM) continue;
    const imagen = imgM[1];
    const tipoM  = contenido.match(/<span class="categoria">(SERIE|OVA|PELI)<\/span>/i);
    const tipo   = tipoM ? tipoM[1].toUpperCase() : 'OVA';
    const enc    = encodeURIComponent(titulo.trim());
    const slug   = generarSlug(titulo);

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML =
      `<span class="categoria ${tipo}">${tipo}</span>` +
      `<img src="${imagen}" alt="${titulo}"/>` +
      `<h3>${titulo}</h3>`;
    card.onclick = () => {
      history.replaceState(null,'',`?anime=${enc}#${slug}`);
      mostrarModal(titulo, contenido, tipo);
    };
    cont.appendChild(card);
    paginasCache.push({titulo,contenido,tipo});
  }
}

function verificarAnimePorURL() {
  if (!animeParam) return;
  const dec = decodeURIComponent(animeParam).toLowerCase().trim();
  (function intento(){
    const m = paginasCache.find(p=>p.titulo.toLowerCase().trim()===dec);
    if (m) mostrarModal(m.titulo,m.contenido,m.tipo);
    else setTimeout(intento,100);
  })();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarPaginas().then(() => {
    verificarAnimePorURL();
    document.getElementById('loader').style.display='none';
    document.body.style.visibility='visible';
    if (videoParam) {
      const n  = parseInt(videoParam,10);
      const tr = document.querySelector(`table.episodis tr:nth-child(${n})`);
      if (tr) tr.click();
    }
  });
});

let vjsPlayer = null;
const overlay  = document.getElementById('video-overlay');
const closeBtn = document.getElementById('video-close');

function updateURL(k,v){
  const p = new URLSearchParams(window.location.search);
  if (v==null) p.delete(k); else p.set(k,v);
  history.replaceState(v?{video:v}:null,'',window.location.pathname + (p.toString()?`?${p.toString()}`:''));
}

function showVideo(src,ep){
  if (!vjsPlayer) {
    vjsPlayer = videojs('overlay-player',{html5:{vhs:{overrideNative:true}}});
    vjsPlayer.hlsQualitySelector({displayCurrentQuality:true});
  }
  vjsPlayer.src({src,type:'application/x-mpegURL'});
  vjsPlayer.play();
  overlay.classList.add('active');
  updateURL('video',ep);
}

function hideVideo(){
  if (vjsPlayer) {
    vjsPlayer.pause();
    vjsPlayer.currentTime(0);
  }
  overlay.classList.remove('active');
  updateURL('video',null);
}

closeBtn.addEventListener('click',hideVideo);
window.addEventListener('popstate',e=>{
  if (!e.state||!e.state.video) hideVideo();
});
