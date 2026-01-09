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
    console.warn("⏱️ Watchdog acionado");
    tocar();
  }, ms);
}

/* =========================
   VALIDAÇÃO
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
   PRELOAD (SEGURO TV)
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
      video.preload = "metadata";
      video.src = midia.url;
      video.muted = true;
      video.playsInline = true;
      video.onloadedmetadata = () => resolve(video);
      video.onerror = () => resolve(null);
    }
  });
}

/* =========================
   CARREGAR DADOS
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

  const elemento = await preloadMidia(item);
  if (!elemento) return tocar();

  setTimeout(() => {
    limpar();

    /* IMAGEM */
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

    /* VÍDEO — ANTI-TRAVA DEFINITIVO */
    if (item.tipo === "video") {
      elemento.className = "midia-video";
      elemento.autoplay = true;
      elemento.muted = true;
      elemento.playsInline = true;
      elemento.controls = false;

      let finalizado = false;

      const avancar = () => {
        if (finalizado) return;
        finalizado = true;
        clearWatchdog();
        tocar();
      };

      elemento.onended = avancar;
      elemento.onerror = avancar;

      armWatchdog((item.duracao || 15) * 1000);

      conteudo.appendChild(elemento);
      fadeIn();
    }
  }, 400);
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
  }, 400);
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
      dados = await fetch(`/api/clima/${tvId}`).then(r => r.json());
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
  }, 400);
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
    const c = await fetch(`/api/clima/${tvId}`).then(r => r.json());
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
