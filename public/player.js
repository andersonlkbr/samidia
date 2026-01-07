const params = new URLSearchParams(window.location.search);
const tvId = params.get("tv");

const conteudo = document.getElementById("conteudo");

let playlist = [];
let noticias = [];
let climaAtual = null;

let indice = 0;
let anunciosRodados = 0;

/* =========================
   MAPA DE ÍCONES DE CLIMA
========================= */
const CLIMA_ICONS = {
  "céu limpo": "01d",
  "poucas nuvens": "02d",
  "nuvens dispersas": "03d",
  "nublado": "04d",
  "nuvens": "04d",
  "chuva fraca": "10d",
  "chuva": "09d",
  "trovoada": "11d",
  "neve": "13d",
  "névoa": "50d"
};

function iconFromDescricao(desc = "") {
  desc = desc.toLowerCase();
  for (const key in CLIMA_ICONS) {
    if (desc.includes(key)) return CLIMA_ICONS[key];
  }
  return "01d";
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

function trocarConteudo(el) {
  fadeOut();
  setTimeout(() => {
    limpar();
    conteudo.appendChild(el);
    fadeIn();
  }, 400);
}

/* =========================
   CARREGAR DADOS
========================= */
async function carregarDados() {
  playlist = await fetch(`/api/playlist/${tvId}`).then(r => r.json());
  noticias = await fetch(`/api/noticias/${tvId}`).then(r => r.json());
}

/* =========================
   MÍDIAS
========================= */
function renderMidia(item) {
  const el =
    item.tipo === "imagem"
      ? Object.assign(new Image(), { src: item.url, className: "midia-img" })
      : Object.assign(document.createElement("video"), {
          src: item.url,
          autoplay: true,
          muted: true,
          className: "midia-video"
        });

  el.onerror = () => {
    if (item.tipo === "imagem") {
      el.src = "/fallback.jpg";
      el.classList.add("fallback");
    } else tocar();
  };

  if (item.tipo === "video") {
    el.onended = () => {
      fadeOut();
      setTimeout(tocar, 400);
    };
  }

  trocarConteudo(el);

  if (item.tipo === "imagem") {
    setTimeout(tocar, item.duracao * 1000);
  }
}

/* =========================
   NOTÍCIA
========================= */
function renderNoticia(n) {
  const box = document.createElement("div");
  box.className = "noticia-full";
  box.innerHTML = `
    <img class="noticia-imagem" src="${n.imagem || "/fallback.jpg"}"
      onerror="this.src='/fallback.jpg'" />
    <div class="noticia-overlay"></div>
    <div class="noticia-faixa">
      <h1>${n.titulo}</h1>
    </div>
  `;
  trocarConteudo(box);
  setTimeout(tocar, 10000);
}

/* =========================
   CLIMA
========================= */
function renderClima() {
  if (!climaAtual) return tocar();

  const iconAtual = iconFromDescricao(climaAtual.descricao);

  const prev = (climaAtual.previsao || []).map(p => {
    const icon = iconFromDescricao(p.descricao);
    return `
      <div class="clima-dia">
        <span>${p.dia}</span>
        <img src="https://openweathermap.org/img/wn/${icon}.png" />
        <strong>${p.max}°</strong>
        <small>${p.min}°</small>
      </div>
    `;
  }).join("");

  const box = document.createElement("div");
  box.className = "clima-full";
  box.innerHTML = `
    <div class="clima-cidade">${climaAtual.cidade}</div>
    <img class="clima-icon"
      src="https://openweathermap.org/img/wn/${iconAtual}@4x.png" />
    <div class="clima-temp">${climaAtual.temperatura}°</div>
    <div class="clima-desc">${climaAtual.descricao}</div>
    <div class="clima-prev">${prev}</div>
  `;

  trocarConteudo(box);
  setTimeout(tocar, 9000);
}

/* =========================
   LOOP
========================= */
function tocar() {
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
