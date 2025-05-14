const originalTitle = document.title;
const paginasCache = [];

const params = new URLSearchParams(window.location.search);
const animeParam = params.get('anime');

function generarSlug(texto) {
  return texto.toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-');
}

function verificarAnimePorURL() {
  if (!animeParam) return;

  const decodificado = decodeURIComponent(animeParam).toLowerCase().trim();

  const intentoAbrir = () => {
    const match = paginasCache.find(p => p.titulo.toLowerCase().trim() === decodificado);
    if (match) {
      mostrarModal(match.titulo, match.contenido, match.tipo);
    } else {
      setTimeout(intentoAbrir, 100);
    }
  };

  intentoAbrir();
}

function mostrarModal(titulo, contenido, tipo) {
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modal-content');

  modalContent.innerHTML = `
    <span class="modal-close" onclick="cerrarModal()">×</span>
    <span class="categoria ${tipo}">${tipo}</span>
    <h2>${titulo}</h2>
    ${contenido}
  `;
  modal.style.display = 'flex';
  document.title = titulo;
}


function cerrarModal() {
  document.getElementById('modal').style.display = 'none';
  history.replaceState(null, '', window.location.pathname);
  document.title = originalTitle;
}

async function cargarPaginas() {
  const url = '/feeds/pages/default?alt=json';
  const contenedor = document.getElementById('pages-container');

  const res = await fetch(url);
  const data = await res.json();
  const entradas = data.feed.entry || [];

  for (const pagina of entradas) {
    const titulo = pagina.title.$t;
    const contenido = pagina.content.$t;

    const imgMatch = contenido.match(/<div class="caraturla">.*?<img[^>]+src="([^">]+)"/s);
    if (!imgMatch) continue;

    const imagen = imgMatch[1];
    const encoded = encodeURIComponent(titulo.trim());
    const slug = generarSlug(titulo);

    // Detectar tipus
    const tipoMatch = contenido.match(/<span class="categoria">(SERIE|OVA|PELI)<\/span>/i);
    const tipo = tipoMatch ? tipoMatch[1].toUpperCase() : 'OVA';

    // Generar targeta
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <span class="categoria ${tipo}">${tipo}</span>
      <img src="${imagen}" alt="${titulo}" />
      <h3>${titulo}</h3>
    `;

    card.addEventListener('click', () => {
      history.replaceState(null, '', `?anime=${encoded}#${slug}`);
      mostrarModal(titulo, contenido, tipo);
    });

    contenedor.appendChild(card);
    paginasCache.push({ titulo, contenido, tipo });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  cargarPaginas().then(() => {
    verificarAnimePorURL();
    document.getElementById('loader').style.display = 'none';
    document.body.style.visibility = 'visible';
  });
});



const overlay     = document.getElementById('video-overlay');
const overlayVid  = document.getElementById('overlay-player');
const closeButton = document.getElementById('video-close');

// Mostra el vídeo i afegeix &video=<eps> a la URL
function showVideo(src, ep) {
  overlayVid.src = src;
  overlay.classList.add('active');
  overlayVid.play();

  const params = new URLSearchParams(window.location.search);
  params.set('video', ep);
  history.pushState({ video: ep }, '', window.location.pathname + '?' + params);
}

// Amaga l’overlay i neteja el paràmetre video
function hideVideo() {
  overlayVid.pause();
  overlayVid.removeAttribute('src');
  overlay.classList.remove('active');

  const params = new URLSearchParams(window.location.search);
  params.delete('video');
  history.replaceState(null, '', window.location.pathname + (params.toString() ? '?' + params : ''));
}

closeButton.addEventListener('click', hideVideo);

// Si l’usuari fa “atrás” amb el navegador, també tanquem l’overlay
window.addEventListener('popstate', (e) => {
  if (!e.state || !e.state.video) {
    hideVideo();
  }
});
