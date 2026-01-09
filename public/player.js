const params = new URLSearchParams(window.location.search);
const tvId = params.get("tv");

const conteudo = document.getElementById("conteudo");

let playlist = [];
let noticias = [];
let indice = 0;
let anunciosRodados = 0;
let watchdogTimer = null;

// Controle de atualização
let ultimaAtualizacao = Date.now();
const INTERVALO_ATUALIZACAO = 2 * 60 * 1000; 

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
      video.preload = "auto";
      video.src = item.url;
      video.muted = true;
      video.playsInline = true;
      video.onloadeddata = () => resolve(video); 
      video.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 3000); 
    }
  });
}

/* =========================
   DADOS
========================= */
async function carregarDados() {
  try {
    const novaPlaylist = await fetch(`/api/playlist/${tvId}?_=${Date.now()}`).then(r => r.json());
    if (novaPlaylist && novaPlaylist.length > 0) playlist = novaPlaylist;
  } catch (e) { console.error(e); }

  try {
    const novasNoticias = await fetch(`/api/noticias/${tvId}?_=${Date.now()}`).then(r => r.json());
    if (novasNoticias) noticias = novasNoticias;
  } catch (e) { console.error(e); }
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
      el.muted = true;
      el.playsInline = true;
      el.onended = tocar;
      el.onerror = tocar;
      
      conteudo.appendChild(el);
      el.play().catch(() => tocar());

      fadeIn();
      const duracaoSeguranca = (item.duracao || el.duration || 15) + 5;
      armWatchdog(duracaoSeguranca * 1000);
    }
  }, 500);
}

/* =========================
   NOTÍCIA (DESIGN NOVO)
========================= */
function renderNoticia(n) {
  fadeOut();
  clearWatchdog();

  setTimeout(() => {
    limpar();
    // HTML Estruturado para o novo CSS
    conteudo.innerHTML = `
      <div class="noticia-full">
        <div class="noticia-imagem">
            <img src="${n.imagem || '/img/fallback.jpg'}">
        </div>
        <div class="noticia-overlay">
            <div class="noticia-badge">Últimas Notícias</div>
            <div class="noticia-titulo">${n.titulo || ""}</div>
        </div>
      </div>
    `;
    fadeIn();
    armWatchdog(10000); // 10s por notícia
  }, 400);
}

/* =========================
   CLIMA (DESIGN NOVO)
========================= */
function getIconClima(d) {
  if (!d) return "☁️";
  d = d.toLowerCase();
  if (d.includes("chuva")) return "🌧️";
  if (d.includes("sol") || d.includes("limpo")) return "☀️";
  if (d.includes("nublado") || d.includes("nuvens")) return "☁️";
  return "🌡️";
}

async function renderClima() {
  fadeOut();
  clearWatchdog();

  setTimeout(async () => {
    limpar();

    let c;
    try { c = await fetch(`/api/clima/${tvId}`).then(r => r.json()); } 
    catch { return tocar(); }

    // HTML Estruturado com Glassmorphism
    conteudo.innerHTML = `
      <div class="clima-full">
        <div class="clima-card">
            <div class="clima-esquerda">
                <div class="clima-icon">${getIconClima(c.descricao)}</div>
            </div>
            <div class="clima-direita">
                <div class="clima-cidade">${c.cidade}</div>
                <div class="clima-temp">${c.temperatura}°</div>
                <div class="clima-desc">${c.descricao}</div>
            </div>
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
async function tocar() {
  clearWatchdog();

  if (Date.now() - ultimaAtualizacao > INTERVALO_ATUALIZACAO) {
      ultimaAtualizacao = Date.now();
      await carregarDados();
      if (!playlist.length) {
          setTimeout(tocar, 5000);
          return;
      }
  }

  if (!playlist.length) {
      setTimeout(carregarDados, 5000);
      return;
  }

  if (anunciosRodados === 2 && noticias.length) {
    anunciosRodados++;
    return renderNoticia(noticias[Math.floor(Math.random() * noticias.length)]);
  }

  if (anunciosRodados === 4) {
    anunciosRodados = 0;
    return renderClima();
  }

  if (indice >= playlist.length) indice = 0;
  const item = playlist[indice];
  indice = (indice + 1) % playlist.length;
  anunciosRodados++;
  
  renderMidia(item);
}

/* =========================
   RODAPÉ
========================= */
function atualizarHora() {
  const el = document.getElementById("dataHora");
  if (!el) return;
  const d = new Date();
  // Formato HH:MM mais limpo
  const hora = d.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
  const data = d.toLocaleDateString("pt-BR");
  el.innerHTML = `<b>${hora}</b> <span style="opacity:0.6; margin-left:10px">${data}</span>`;
}
setInterval(atualizarHora, 1000);

async function atualizarClimaRodape() {
  const el = document.getElementById("clima");
  if (!el) return;
  try {
    const c = await fetch(`/api/clima/${tvId}`).then(r => r.json());
    el.innerText = `${c.cidade} ${c.temperatura}°`;
  } catch { el.innerText = ""; }
}
setInterval(atualizarClimaRodape, 60000);

(async () => {
  atualizarHora();
  atualizarClimaRodape();
  await carregarDados();
  tocar();
})();