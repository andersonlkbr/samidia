const params = new URLSearchParams(window.location.search);
const tvId = params.get("tv");

const conteudo = document.getElementById("conteudo");

let playlist = [];
let noticias = [];
let indice = 0;
let anunciosRodados = 0;
let watchdogTimer = null;

/* =========================
   UTIL
========================= */
function fadeOut() {
  conteudo.style.opacity = 0;
}

function fadeIn() {
  conteudo.style.opacity = 1;
}

function limpar() {
  conteudo.innerHTML = "";
}

function clearWatchdog() {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

function armWatchdog(ms) {
  clearWatchdog();
  watchdogTimer = setTimeout(() => {
    console.warn("Watchdog: avançando");
    tocar();
  }, ms);
}

/* =========================
   PRELOAD
========================= */
function preloadMidia(item) {
  return new Promise(resolve => {
    if (item.tipo === "imagem") {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = item.url;
    }

    if (item.tipo === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.src = item.url;
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => resolve(video);
      video.onerror = () => resolve(null);
    }
  });
}

/* =========================
   DADOS
========================= */
async function carregarDados() {
  try {
    playlist = await fetch(`/api/playlist/${tvId}`).then(r => r.json());
  } catch {
    playlist = [];
  }

  try {
    noticias = await fetch(`/api/noticias/${tvId}`).then(r => r.json());
  } catch {
    noticias = [];
  }
}

/* =========================
   RENDER MÍDIA
========================= */
async function renderMidia(item) {
  fadeOut();
  clearWatchdog();

  const el = await preloadMidia(item);
  if (!el) return tocar();

  setTimeout(() => {
    limpar();

    if (item.tipo === "imagem") {
      el.className = "midia-img";
      conteudo.appendChild(el);
      fadeIn();
      armWatchdog((item.duracao || 8) * 1000);
    }

    if (item.tipo === "video") {
      el.className = "midia-video";
      el.autoplay = true;
      el.onended = tocar;
      el.onerror = tocar;
      conteudo.appendChild(el);
      fadeIn();
      armWatchdog((item.duracao || 15) * 1000);
    }
  }, 400);
}

/* =========================
   NOTÍCIA
========================= */
function renderNoticia(n) {
  fadeOut();
  clearWatchdog();

  setTimeout(() => {
    limpar();
    conteudo.innerHTML = `
      <div class="noticia-full">
        <div class="noticia-imagem">
          <img src="${n.imagem || '/img/fallback.jpg'}">
        </div>
        <div class="noticia-faixa">
          <h1>${n.titulo || ""}</h1>
        </div>
      </div>
    `;
    fadeIn();
    armWatchdog(10000);
  }, 400);
}

/* =========================
   CLIMA
========================= */
function getIconClima(d) {
  if (!d) return "☁️";
  d = d.toLowerCase();
  if (d.includes("chuva")) return "🌧️";
  if (d.includes("sol")) return "☀️";
  if (d.includes("nublado")) return "☁️";
  return "🌡️";
}

async function renderClima() {
  fadeOut();
  clearWatchdog();

  setTimeout(async () => {
    limpar();

    let c;
    try {
      c = await fetch(`/api/clima/${tvId}`).then(r => r.json());
    } catch {
      return tocar();
    }

    conteudo.innerHTML = `
      <div class="clima-full">
        <div class="clima-cidade">${c.cidade}</div>
        <div class="clima-principal">
          <div class="clima-icon">${getIconClima(c.descricao)}</div>
          <div class="clima-temp">${c.temperatura}°</div>
          <div class="clima-desc">${c.descricao}</div>
        </div>
      </div>
    `;

    fadeIn();
    armWatchdog(9000);
  }, 400);
}

/* =========================
   LOOP
========================= */
function tocar() {
  clearWatchdog();
  if (!playlist.length) return;

  if (anunciosRodados === 2 && noticias.length) {
    anunciosRodados++;
    return renderNoticia(noticias[Math.floor(Math.random() * noticias.length)]);
  }

  if (anunciosRodados === 4) {
    anunciosRodados = 0;
    return renderClima();
  }

  const item = playlist[indice];
  indice = (indice + 1) % playlist.length;
  anunciosRodados++;
  renderMidia(item);
}

/* =========================
   START
========================= */
(async () => {
  await carregarDados();
  tocar();
})();
