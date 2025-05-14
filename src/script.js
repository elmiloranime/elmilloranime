const originalTitle     = document.title;
const paginasCache      = [];
const params            = new URLSearchParams(window.location.search);
const animeParam        = params.get('anime');
const videoParam        = params.get('video');
var vjsPlayer           = null;
var overlay             = document.getElementById('video-overlay');
var overlayVid          = document.getElementById('overlay-player');
var closeBtn            = document.getElementById('video-close');

function generarSlug(texto) {
  return texto.toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-');
}

function mostrarModal(titulo, contenido, tipo) {
  const mc = document.getElementById('modal-content');
  mc.innerHTML =
    `<span class="modal-close" onclick="cerrarModal()">×</span>` +
    `<span class="categoria ${tipo}">${tipo}</span>` +
    `<h2>${titulo}</h2>` +
    contenido;
  document.getElementById('modal').style.display = 'flex';
  document.title = titulo;
}

function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  history.replaceState(null,'',window.location.pathname);
  document.title = originalTitle;
}

async function cargarPaginas() {
  const res = await fetch('/feeds/pages/default?alt=json');
  const data = await res.json();
  const cont = document.getElementById('pages-container');
  for (const e of data.feed.entry || []) {
    const titulo = e.title.$t;
    const contenido = e.content.$t;
    const imgM = contenido.match(/<div class="caraturla">.*?<img[^>]+src="([^">]+)"/s);
    if (!imgM) continue;
    const imagen = imgM[1];
    const tipoM = contenido.match(/<span class="categoria">(SERIE|OVA|PELI)<\/span>/i);
    const tipo = tipoM ? tipoM[1].toUpperCase() : 'OVA';
    const enc = encodeURIComponent(titulo.trim());
    const slug = generarSlug(titulo);
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
  (function intento() {
    const match = paginasCache.find(p => p.titulo.toLowerCase().trim() === dec);
    if (match) {
      mostrarModal(match.titulo, match.contenido, match.tipo);
    } else {
      setTimeout(intento, 100);
    }
  })();
}

document.addEventListener('DOMContentLoaded', () => {
  cargarPaginas().then(() => {
    verificarAnimePorURL();
    document.getElementById('loader').style.display = 'none';
    document.body.style.visibility = 'visible';
    if (videoParam) {
      const ep = parseInt(videoParam, 10);
      const row = document.querySelector(`table.episodis tr:nth-child(${ep})`);
      if (row) row.click();
    }
  });
});

function showVideo(src, ep) {
  if (!vjsPlayer) {
    vjsPlayer = videojs('overlay-player', {
      html5: { vhs: { overrideNative: true } }
    });
    videojs.registerPlugin('qualitySelector', window.videojsHlsQualitySelector);
    vjsPlayer.qualitySelector({ displayCurrentQuality: true });
  }
  vjsPlayer.src({ src, type: 'application/x-mpegURL' });
  vjsPlayer.play();
  overlay.classList.add('active');

  const p = new URLSearchParams(window.location.search);
  p.set('video', ep);
  history.pushState({ video: ep }, '', window.location.pathname + '?' + p);
}

function hideVideo() {
  if (vjsPlayer) {
    vjsPlayer.pause();
    vjsPlayer.currentTime(0);
  }
  overlay.classList.remove('active');
  const p = new URLSearchParams(window.location.search);
  p.delete('video');
  history.replaceState(null, '', window.location.pathname + (p.toString() ? '?' + p : ''));
}

closeBtn.addEventListener('click', hideVideo);
window.addEventListener('popstate', e => {
  if (!e.state || !e.state.video) hideVideo();
});
