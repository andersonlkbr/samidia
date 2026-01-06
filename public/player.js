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
   RENDER NOTÍCIA (PORTAL)
========================= */
function renderNoticia(noticia) {
  fadeOut();

  setTimeout(() => {
    limpar();

    const box = document.createElement("div");
    box.className = "noticia-box";

    const imagem = noticia.imagem
      ? `<div class="noticia-imagem">
           <img src="${noticia.imagem}" onerror="this.style.display='none'">
         </div>`
      : "";

    box.innerHTML = `
      ${imagem}
      <div class="noticia-conteudo">
        <div class="noticia-tag">NOTÍCIAS</div>
        <div class="noticia-titulo">${noticia.titulo}</div>
        <div class="noticia-resumo">
          ${resumoCurto(noticia.resumo, 220)}
        </div>
      </div>
    `;

    conteudo.appendChild(box);
    fadeIn();

    setTimeout(tocar, 10000);
  }, 500);
}


/* =========================
   RENDER CLIMA FULLSCREEN
========================= */
function renderClima() {
  fadeOut();

  setTimeout(() => {
    limpar();

    const box = document.createElement("div");
    box.className = "clima-box";

    box.innerHTML = `
      <div class="clima-cidade">${climaAtual.cidade}</div>

      <div class="clima-principal">
        <div class="clima-temp">${climaAtual.temperatura}°C</div>
        <img class="clima-icone" src="${climaAtual.icone}" />
      </div>

      <div class="clima-desc">${climaAtual.descricao}</div>
    `;

    conteudo.appendChild(box);
    fadeIn();

    setTimeout(tocar, 8000);
  }, 500);
}


/* =========================
   LOOP PRINCIPAL
========================= */
function tocar() {
  if (!playlist.length) return;

  anunciosRodados++;

  // A cada 5 itens → clima
  if (anunciosRodados % 5 === 0 && climaAtual) {
    return renderClima();
  }

  // A cada 3 itens → notícia
  if (anunciosRodados % 3 === 0 && noticias.length) {
    const noticia = noticias[Math.floor(Math.random() * noticias.length)];
    return renderNoticia(noticia);
  }

  const item = playlist[indice];
  indice = (indice + 1) % playlist.length;

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
    const res = await fetch(`/api/clima/${tvId}`);
    climaAtual = await res.json();

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
