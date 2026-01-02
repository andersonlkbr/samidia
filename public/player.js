const params = new URLSearchParams(window.location.search);
const tvId = params.get("tv");

const conteudo = document.getElementById("conteudo");

let playlist = [];
let noticias = [];
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

function resumoCurto(texto, limite = 280) {
  if (!texto) return "";
  return texto.length > limite
    ? texto.slice(0, limite) + "…"
    : texto;
}

/* =========================
   CARREGAR DADOS
========================= */
async function carregarDados() {
  playlist = await fetch(`/api/playlist/${tvId}`).then(r => r.json());
  noticias = await fetch(`/api/noticias/${tvId}`).then(r => r.json());
}

/* =========================
   RENDER MIDIA
========================= */
function renderMidia(item) {
  fadeOut();

  setTimeout(() => {
    limpar();

    if (item.tipo === "imagem") {
      const img = document.createElement("img");
      img.src = item.url;
      img.className = "midia-img";

      img.onerror = () => {
        img.src = "/fallback.jpg";
        img.classList.add("fallback");
      };

      conteudo.appendChild(img);
      fadeIn();

      setTimeout(tocar, item.duracao * 1000);
    }

    if (item.tipo === "video") {
      const video = document.createElement("video");
      video.src = item.url;
      video.autoplay = true;
      video.muted = true;
      video.className = "midia-video";

      video.onended = tocar;

      conteudo.appendChild(video);
      fadeIn();
    }

  }, 600);
}

/* =========================
   RENDER NOTÍCIA
========================= */
function renderNoticia(noticia) {
  fadeOut();

  setTimeout(() => {
    limpar();

    const box = document.createElement("div");
    box.className = "noticia-box";

    box.innerHTML = `
      <div class="noticia-tag">NOTÍCIAS</div>
      <div class="noticia-titulo">${noticia.titulo}</div>
      <div class="noticia-resumo">
        ${resumoCurto(noticia.resumo)}
      </div>
    `;

    conteudo.appendChild(box);
    fadeIn();

    setTimeout(tocar, 10000);
  }, 600);
}

/* =========================
   PLAYER LOOP
========================= */
function tocar() {
  if (!playlist.length) return;

  if (anunciosRodados === 2 && noticias.length) {
    anunciosRodados = 0;
    const noticia = noticias[Math.floor(Math.random() * noticias.length)];
    return renderNoticia(noticia);
  }

  const item = playlist[indice];
  indice = (indice + 1) % playlist.length;
  anunciosRodados++;

  renderMidia(item);
}

/* =========================
   RODAPÉ
========================= */
function atualizarRodape() {
  const agora = new Date();
  document.getElementById("dataHora").innerText =
    agora.toLocaleDateString() + " - " + agora.toLocaleTimeString();

  fetch(`/api/clima/${tvId}`)
    .then(r => r.json())
    .then(c => {
      document.getElementById("clima").innerText =
        `${c.cidade} • ${c.temp}°C • ${c.descricao}`;
    })
    .catch(() => {});
}

setInterval(atualizarRodape, 60000);

/* =========================
   START
========================= */
(async () => {
  await carregarDados();
  atualizarRodape();
  tocar();
})();
