const LIBS = [
  'https://cdn.jsdelivr.net/npm/video.js/dist/video.min.js',
  'https://cdn.jsdelivr.net/npm/videojs-contrib-quality-levels/dist/videojs-contrib-quality-levels.min.js',
  'https://cdn.jsdelivr.net/npm/videojs-hls-quality-selector/dist/videojs-hls-quality-selector.min.js'
];

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload  = () => res(src);
    s.onerror = () => rej(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

(async function loadVideoJSLibs() {
  for (let url of LIBS) {
    try {
      await loadScript(url);
    } catch (e) {
      console.error(e);
    }
  }
  if (window.videojs && window.videojsHlsQualitySelector) {
    if (!videojs.getPlugin('hlsQualitySelector')) {
      videojs.registerPlugin('hlsQualitySelector', window.videojsHlsQualitySelector);
    }
  }
  initApp();
})();

function initApp() {
  const originalTitle = document.title;
  const cache        = [];
  const params       = new URLSearchParams(location.search);
  const animeParam   = params.get('anime');
  const videoParam   = params.get('video');
  const overlay      = document.getElementById('video-overlay');
  const closeBtn     = document.getElementById('video-close');
  let player         = null;

  window.cerrarModal = () => {
    document.getElementById('modal').style.display = 'none';
    history.replaceState(null,'',location.pathname);
    document.title = originalTitle;
  };

  function slugify(t) {
    return t.toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-');
  }

  function mostrarModal(t, c, tipo) {
    const mc = document.getElementById('modal-content');
    mc.innerHTML =
      `<span class="modal-close" onclick="cerrarModal()">×</span>` +
      `<span class="categoria ${tipo}">${tipo}</span>` +
      `<h2>${t}</h2>` + c;
    document.getElementById('modal').style.display = 'flex';
    document.title = t;
  }

  async function cargarPaginas() {
    const res  = await fetch('/feeds/pages/default?alt=json');
    const data = await res.json();
    const cont = document.getElementById('pages-container');
    for (let e of data.feed.entry||[]) {
      const title   = e.title.$t;
      const content = e.content.$t;
      const imgM    = content.match(/<div class="caraturla">.*?<img[^>]+src="([^">]+)"/s);
      if (!imgM) continue;
      const img    = imgM[1];
      const tipoM  = content.match(/<span class="categoria">(SERIE|OVA|PELI)<\/span>/i);
      const tipo   = tipoM ? tipoM[1].toUpperCase() : 'OVA';
      const enc    = encodeURIComponent(title.trim());
      const slug   = slugify(title);
      const card   = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<span class="categoria ${tipo}">${tipo}</span>`
                     + `<img src="${img}" alt="${title}"/><h3>${title}</h3>`;
      card.onclick = () => {
        history.replaceState(null,'',`?anime=${enc}#${slug}`);
        mostrarModal(title, content, tipo);
      };
      cont.appendChild(card);
      cache.push({title,content,tipo});
    }
  }

  function verificarAnimePorURL() {
    if (!animeParam) return;
    const dec = decodeURIComponent(animeParam).toLowerCase().trim();
    (function intento(){
      const m = cache.find(p=>p.title.toLowerCase().trim()===dec);
      if (m) mostrarModal(m.title,m.content,m.tipo);
      else setTimeout(intento,100);
    })();
  }

  document.addEventListener('DOMContentLoaded',() => {
    cargarPaginas().then(()=>{
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

  function updateURL(k,v) {
    const p = new URLSearchParams(location.search);
    if (v==null) p.delete(k); else p.set(k,v);
    history.replaceState(v?{video:v}:null,'',location.pathname + (p.toString()?`?${p.toString()}`:''));
  }

  window.showVideo = (src,ep) => {
    if (!player && window.videojs) {
      videojs.options.html5.vhs.overrideNative = true;
      player = videojs('overlay-player');
      if (player.hlsQualitySelector) {
        player.hlsQualitySelector({displayCurrentQuality:true});
      }
    }
    player.src([{src,type:'application/vnd.apple.mpegurl'}]);
    player.play();
    overlay.classList.add('active');
    updateURL('video',ep);
  };

  window.hideVideo = () => {
    if (player) {
      player.pause();
      player.currentTime(0);
    }
    overlay.classList.remove('active');
    updateURL('video',null);
  };

  closeBtn.addEventListener('click',window.hideVideo);
  window.addEventListener('popstate',e=>{
    if (!e.state||!e.state.video) window.hideVideo();
  });
}
