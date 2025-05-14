// === videojs + Chromecast + AFK Monitor ===
const VIDEO_LIBS = [
  'https://cdn.jsdelivr.net/npm/video.js@7/dist/video.min.js',
  'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1',
  'https://cdn.jsdelivr.net/npm/@silvermine/videojs-chromecast@1/dist/silvermine-videojs-chromecast.min.js',
  'https://cdn.jsdelivr.net/npm/videojs-afk-monitor@1.0.1/dist/videojs.afk-monitor.min.js'
];

function loadScript(src) {
  return new Promise((res,rej) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload  = () => res();
    s.onerror = () => rej(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

;(async()=>{
  for (let url of VIDEO_LIBS) {
    try {
      await loadScript(url);
      console.log(`✅ Loaded ${url}`);
    } catch(e) {
      console.warn(e);
    }
  }
  runApp();
})();

function runApp(){
  const originalTitle = document.title;
  const cache         = [];
  const params        = new URLSearchParams(location.search);
  const animeParam    = params.get('anime');
  const videoParam    = params.get('video');
  const overlay       = document.getElementById('video-overlay');
  const closeBtn      = document.getElementById('video-close');
  let player          = null;

  window.cerrarModal = ()=>{
    document.getElementById('modal').style.display='none';
    history.replaceState(null,'',location.pathname);
    document.title = originalTitle;
  };

  function slugify(t){
    return t.toLowerCase().replace(/[^\w\s-]/g,'').trim().replace(/\s+/g,'-');
  }

  function mostrarModal(t, html, tipo){
    const mc = document.getElementById('modal-content');
    mc.innerHTML =
      `<span class="modal-close" onclick="cerrarModal()">×</span>`+
      `<span class="categoria ${tipo}">${tipo}</span>`+
      `<h2>${t}</h2>`+ html;
    document.getElementById('modal').style.display='flex';
    document.title = t;
  }

  async function cargar(){
    const r = await fetch('/feeds/pages/default?alt=json');
    const j = await r.json();
    const cont = document.getElementById('pages-container');
    for (let e of j.feed.entry||[]){
      const title  = e.title.$t;
      const body   = e.content.$t;
      const mImg   = body.match(/<div class="caraturla">.*?<img[^>]+src="([^">]+)"/s);
      if (!mImg) continue;
      const img    = mImg[1];
      const mTipo  = body.match(/<span class="categoria">(SERIE|OVA|PELI)<\/span>/i);
      const tipo   = mTipo?mTipo[1].toUpperCase():'OVA';
      const enc    = encodeURIComponent(title.trim());
      const slug   = slugify(title);
      const card   = document.createElement('div');
      card.className='card';
      card.innerHTML =
        `<span class="categoria ${tipo}">${tipo}</span>`+
        `<img src="${img}" alt="${title}"/><h3>${title}</h3>`;
      card.onclick = ()=>{
        history.replaceState(null,'',`?anime=${enc}#${slug}`);
        mostrarModal(title, body, tipo);
      };
      cont.appendChild(card);
      cache.push({title,body,tipo});
    }
  }

  function checkAnime(){
    if (!animeParam) return;
    const norm = decodeURIComponent(animeParam).toLowerCase().trim();
    (function go(){
      const found = cache.find(p=>p.title.toLowerCase().trim()===norm);
      if (found) mostrarModal(found.title,found.body,found.tipo);
      else setTimeout(go,100);
    })();
  }

  function start(){
    cargar().then(()=>{
      checkAnime();
      document.getElementById('loader').style.display='none';
      document.body.style.visibility='visible';
      if (videoParam){
        const n  = parseInt(videoParam,10);
        const tr = document.querySelector(`table.episodis tr:nth-child(${n})`);
        if (tr) tr.click();
      }
    });
  }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  function updateURL(k,v){
    const p = new URLSearchParams(location.search);
    if (v==null) p.delete(k);
    else p.set(k,v);
    history.replaceState(v?{video:v}:null,'',location.pathname + (p.toString()?`?${p.toString()}`:''));
  }

  window.showVideo = (src, ep)=>{
    if (!player && window.videojs){
      player = videojs('overlay-player',{
        controls: true,
        liveui:   true,
        preload: 'metadata',
        playbackRates:[0.25,0.5,0.75,1,1.25,1.5,2],
        techOrder:['chromecast','html5'],
        controlBar: {
          children:[
            'playToggle','skipBackward','skipForward','volumePanel',
            'currentTimeDisplay','timeDivider','durationDisplay',
            'progressControl','liveDisplay','seekToLive',
            'remainingTimeDisplay','customControlSpacer',
            'playbackRateMenuButton','chaptersButton',
            'descriptionsButton','subsCapsButton',
            'audioTrackButton','pictureInPictureToggle','fullscreenToggle'
          ],
          skipButtons:{ forward:10, backward:10 }
        },
        html5:{ 
          vhs:{ overrideNative:true },
          withCredentials:false
        },
        plugins:{
          chromecast:{
            requestTitleFn:    ()=> document.title,
            requestSubtitleFn: ()=> `Episodi ${ep}`
          }
        }
      });
      player.ready(()=>{
        if (typeof player.AFKMonitor==='function'){
          player.AFKMonitor({
            showMessageAfter:15*60*1000,
            pausePlayerAfter:10*1000,
            containerText:'¿Sigues ahí?',
            continueButtonText:'Sí, continuar',
            stopButtonText:'No',
            waitClass:'vjs-waiting'
          });
        }
      });
    }
    player.src({ src, type:'application/x-mpegURL' });
    player.play();
    overlay.classList.add('active');
    updateURL('video',ep);
  };

  window.hideVideo = ()=>{
    if (player){
      player.pause();
      player.currentTime(0);
    }
    overlay.classList.remove('active');
    updateURL('video',null);
  };

  closeBtn.addEventListener('click', window.hideVideo);
  window.addEventListener('popstate',e=>{
    if (!e.state||!e.state.video) window.hideVideo();
  });
}
