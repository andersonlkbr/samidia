const params = new URLSearchParams(window.location.search);
const tvId = params.get("tv");

const conteudo = document.getElementById("conteudo");

let playlist = [];
let noticias = [];
let climaAtual = null;

let indice = 0;
let anunciosRodados = 0;

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

function resumoCurto(texto, limite = 220) {
  if (!texto) return "";
  return texto.length > limite
    ? texto.slice(0, limite) + "…"
    : texto;
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
   CARREGAR DADOS
========================= */
async function carregarDados() {
  playlist = await fetch(`/api/playlist/${tvId}`).then(r => r.json());
  noticias = await fetch(`/api/noticias/${tvId}`).then(r => r.json());

  try {
    climaAtual = await fetch(`/api/clima/${tvId}`).then(r => r.json());
  } catch {
    climaAtual = null;
  }
}

/* =========================
   RENDER MÍDIA
========================= */
async function renderMidia(item) {
  fadeOut();

  const elemento = await preloadMidia(item);
  if (!elemento) return tocar();

  setTimeout(() => {
    limpar();

    if (item.tipo === "imagem") {
      elemento.className = "midia-img";
      elemento.onerror = () => {
        elemento.src = "/fallback.jpg";
        elemento.classList.add("fallback");
      };

      conteudo.appendChild(elemento);
      fadeIn();

      setTimeout(tocar, item.duracao * 1000);
    }

    if (item.tipo === "video") {
      elemento.className = "midia-video";
      elemento.autoplay = true;
      elemento.muted = true;
      elemento.onended = tocar;

      conteudo.appendChild(elemento);
      fadeIn();
    }
  }, 500);
}

/* =========================
   RENDER NOTÍCIA
========================= */
function renderNoticia(noticia) {
  fadeOut();

  setTimeout(() => {
    limpar();

    const box = document.createElement("div");
    box.className = "noticia-full";

    box.innerHTML = `
      <img class="noticia-imagem" src="${noticia.imagem || 'img/fallback.jpg'}"
        onerror="this.src='img/fallback.jpg'" />

      <div class="noticia-faixa">
        <h1>${noticia.titulo}</h1>
      </div>
    `;

    conteudo.appendChild(box);
    fadeIn();

    setTimeout(tocar, 10000);
  }, 500);
}

/* =========================
   RENDER CLIMA (APP STYLE)
========================= */
function renderClima() {
  fadeOut();

  setTimeout(() => {
    limpar();

    const box = document.createElement("div");
    box.className = "clima-full";
    box.innerHTML = `
      <div class="clima-cidade" id="climaCidade">--</div>
      <img class="clima-icon" id="climaIcon" />
      <div class="clima-temp" id="climaTemp">--°C</div>
      <div class="clima-desc" id="climaDesc">Carregando...</div>
      <div class="clima-previsao" id="climaPrevisao"></div>
    `;

    conteudo.appendChild(box);
    fadeIn();

    carregarClimaCompleto();

    setTimeout(tocar, 10000);
  }, 500);
}

async function carregarClimaCompleto() {
  try {
    // ⚠ ajuste a cidade conforme sua API atual
    const cidade = climaAtual?.cidade || "Porteiras";

    const atual = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&units=metric&lang=pt_br&appid=${API_KEY}`
    ).then(r => r.json());

    const forecast = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${cidade}&units=metric&lang=pt_br&appid=${API_KEY}`
    ).then(r => r.json());

    document.getElementById("climaCidade").innerText = atual.name;
    document.getElementById("climaTemp").innerText = `${Math.round(atual.main.temp)}°C`;
    document.getElementById("climaDesc").innerText = atual.weather[0].description;
    document.getElementById("climaIcon").src =
      `https://openweathermap.org/img/wn/${atual.weather[0].icon}@4x.png`;

    // Previsão – próximos dias (1 por dia)
    const dias = {};
    forecast.list.forEach(item => {
      const dia = item.dt_txt.split(" ")[0];
      if (!dias[dia] && Object.keys(dias).length < 3) {
        dias[dia] = item;
      }
    });

    const previsao = document.getElementById("climaPrevisao");
    previsao.innerHTML = "";

    Object.values(dias).forEach(d => {
      const el = document.createElement("div");
      el.className = "clima-dia";
      el.innerHTML = `
        <span>${new Date(d.dt_txt).toLocaleDateString("pt-BR", { weekday: "short" })}</span>
        <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}.png">
        <span>${Math.round(d.main.temp)}°C</span>
      `;
      previsao.appendChild(el);
    });

  } catch (e) {
    document.getElementById("climaDesc").innerText = "";
  }
}


/* =========================
   LOOP PRINCIPAL
========================= */
function tocar() {
  if (!playlist.length) return;

  // A cada 2 anúncios → notícia
  if (anunciosRodados === 2 && noticias.length) {
    anunciosRodados++;
    return renderNoticia(
      noticias[Math.floor(Math.random() * noticias.length)]
    );
  }

  // A cada 4 anúncios → clima
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
   RODAPÉ
========================= */
function atualizarHora() {
  const agora = new Date();
  document.getElementById("dataHora").innerText =
    agora.toLocaleDateString("pt-BR") +
    " • " +
    agora.toLocaleTimeString("pt-BR");
}

async function atualizarClimaRodape() {
  try {
    climaAtual = await fetch(`/api/clima/${tvId}`).then(r => r.json());
    document.getElementById("clima").innerText =
      `${climaAtual.cidade} • ${climaAtual.temperatura}°C • ${climaAtual.descricao}`;
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
