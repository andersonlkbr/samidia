const params = new URLSearchParams(window.location.search);
const tvId = params.get("tv");

const conteudo = document.getElementById("conteudo");

let playlist = [];
let noticias = [];
let indice = 0;
let anunciosRodados = 0;

let watchdogTimer = null;
let playlistHash = "";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/* =========================
   CACHE UTIL
========================= */
function salvarCache(chave, dados) {
  localStorage.setItem(
    chave,
    JSON.stringify({
      time: Date.now(),
      data: dados
    })
  );
}

function lerCache(chave) {
  try {
    const raw = localStorage.getItem(chave);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.time > CACHE_TTL) return null;

    return parsed.data;
  } catch {
    return null;
  }
}

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
    console.warn("⏱️ Watchdog acionado");
    tocar();
  }, ms);
}

/* =========================
   PLAYLIST HEALTH
========================= */
function itemValido(item) {
  if (!item || !item.tipo) return false;

  if (item.tipo === "imagem" || item.tipo === "video") {
    return !!item.url;
  }

  return false;
}

function getProximoItemValido() {
  let tentativas = 0;

  while (tentativas < playlist.length) {
    const item = playlist[indice];
    indice = (indice + 1) % playlist.length;
    tentativas++;

    if (itemValido(item)) return item;
  }

  return null;
}

/* =========================
   PRELOAD
========================= */
function preloadMidia(midia) {
  return new Promise(resolve => {
    if (midia.tipo === "imagem") {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = midia.url;
    }

    if (midia.tipo === "video") {
      const video = document.createElement("video");
      video.preload = "auto";
      video.oncanplaythrough = () => resolve(video);
      video.onerror = () => resolve(null);
      video.src = midia.url;
      video.load();
    }
  });
}

/* =========================
   CARREGAR DADOS (CACHE)
========================= */
async function carregarDados() {
  try {
    const res = await fetch(`/api/playlist/${tvId}`, { cache: "no-store" });
    playlist = (await res.json()).filter(itemValido);
    salvarCache("playlist", playlist);
  } catch {
    playlist = lerCache("playlist") || [];
  }

  try {
    const res = await fetch(`/api/noticias/${tvId}`, { cache: "no-store" });
    noticias = await res.json();
    salvarCache("noticias", noticias);
  } catch {
    noticias = lerCache("noticias") || [];
  }

  playlistHash = gerarHashPlaylist(playlist);
}

/* =========================
   HASH & SYNC PLAYLIST
========================= */
function gerarHashPlaylist(lista) {
  try {
    return JSON.stringify(
      lista.map(i => ({
        tipo: i.tipo,
        url: i.url,
        duracao: i.duracao
      }))
    );
  } catch {
    return "";
  }
}

async function sincronizarPlaylist() {
  try {
    const res = await fetch(`/api/playlist/${tvId}`, { cache: "no-store" });
    const nova = (await res.json()).filter(itemValido);

    if (!nova.length) return;

    const novoHash = gerarHashPlaylist(nova);

    if (novoHash !== playlistHash) {
      console.log("🔄 Playlist atualizada automaticamente");

      playlistHash = novoHash;
      playlist = nova;

      if (indice >= playlist.length) indice = 0;
    }
  } catch {
    console.warn("⚠️ Falha ao sincronizar playlist");
  }
}

setInterval(sincronizarPlaylist, 60000);

/* =========================
   RENDER MÍDIA
========================= */
async function renderMidia(item) {
  fadeOut();
  clearWatchdog();

  const elemento = await preloadMidia(item);
  if (!elemento) return tocar();

  setTimeout(() => {
    limpar();

    if (item.tipo === "imagem") {
      elemento.className = "midia-img";
      elemento.onerror = () => {
        elemento.src = "/img/fallback.jpg";
        elemento.classList.add("fallback");
      };

      conteudo.appendChild(elemento);
      fadeIn();

      armWatchdog((item.duracao || 8) * 1000);
      setTimeout(tocar, (item.duracao || 8) * 1000);
    }

    if (item.tipo === "video") {
      elemento.className = "midia-video";
      elemento.autoplay = true;
      elemento.muted = true;
      elemento.playsInline = true;

      const timeoutVideo = setTimeout(
        () => tocar(),
        (item.duracao || 15) * 1000
      );

      elemento.onended = () => {
        clearTimeout(timeoutVideo);
        tocar();
      };

      elemento.onerror = () => {
        clearTimeout(timeoutVideo);
        tocar();
      };

      conteudo.appendChild(elemento);
      fadeIn();
    }
  }, 500);
}

/* =========================
   NOTÍCIA
========================= */
function renderNoticia(noticia) {
  fadeOut();
  clearWatchdog();

  setTimeout(() => {
    limpar();

    conteudo.innerHTML = `
      <div class="noticia-full">
        <div class="noticia-imagem">
          <img src="${noticia.imagem || '/img/fallback.jpg'}"
               onerror="this.src='/img/fallback.jpg'">
        </div>
        <div class="noticia-faixa">
          <h1>${noticia.titulo || ""}</h1>
        </div>
      </div>
    `;

    fadeIn();
    armWatchdog(10000);
    setTimeout(tocar, 10000);
  }, 500);
}

/* =========================
   CLIMA
========================= */
function getIconClima(desc) {
  if (!desc) return "☁️";
  const d = desc.toLowerCase();

  if (d.includes("chuva")) return "🌧️";
  if (d.includes("tempest")) return "⛈️";
  if (d.includes("nublado") || d.includes("nuvens")) return "☁️";
  if (d.includes("sol") || d.includes("limpo")) return "☀️";
  if (d.includes("neblina")) return "🌫️";

  return "🌡️";
}

async function renderClima() {
  fadeOut();
  clearWatchdog();

  setTimeout(async () => {
    limpar();

    let dados;
    try {
      dados = await fetch(`/api/clima/${tvId}`, { cache: "no-store" }).then(r => r.json());
    } catch {
      return tocar();
    }

    conteudo.innerHTML = `
      <div class="clima-full">
        <div class="clima-cidade">${dados.cidade || ""}</div>
        <div class="clima-principal">
          <div class="clima-icon">${getIconClima(dados.descricao)}</div>
          <div class="clima-temp">${dados.temperatura ?? "--"}°</div>
          <div class="clima-desc">${dados.descricao || ""}</div>
        </div>
      </div>
    `;

    fadeIn();
    armWatchdog(9000);
    setTimeout(tocar, 9000);
  }, 500);
}

/* =========================
   LOOP PRINCIPAL
========================= */
function tocar() {
  clearWatchdog();
  if (!playlist.length) return;

  if (anunciosRodados === 2 && noticias.length) {
    anunciosRodados++;
    return renderNoticia(
      noticias[Math.floor(Math.random() * noticias.length)]
    );
  }

  if (anunciosRodados === 4) {
    anunciosRodados = 0;
    return renderClima();
  }

  const item = getProximoItemValido();
  if (!item) return setTimeout(tocar, 3000);

  anunciosRodados++;
  renderMidia(item);
}

/* =========================
   RODAPÉ
========================= */
function atualizarHora() {
  const agora = new Date();
  document.getElementById("dataHora").innerText =
    agora.toLocaleDateString("pt-BR") + " • " +
    agora.toLocaleTimeString("pt-BR");
}

async function atualizarClimaRodape() {
  try {
    const c = await fetch(`/api/clima/${tvId}`, { cache: "no-store" }).then(r => r.json());
    document.getElementById("clima").innerText =
      `${c.cidade} • ${c.temperatura}°C • ${c.descricao}`;
  } catch {
    document.getElementById("clima").innerText = "";
  }
}

setInterval(atualizarHora, 1000);
setInterval(atualizarClimaRodape, 60000);

/* =========================
   START
========================= */
(async () => {
  await carregarDados();
  atualizarHora();
  atualizarClimaRodape();
  tocar();
})();