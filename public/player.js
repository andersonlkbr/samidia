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

    const wrapper = document.createElement("div");
    wrapper.className = "noticia-full";

    const img = document.createElement("img");
    img.className = "noticia-imagem";
    img.src = noticia.imagem || "img/fallback.jpg";
    img.onerror = () => {
      img.src = "img/fallback.jpg";
    };

    const faixa = document.createElement("div");
    faixa.className = "noticia-faixa";
    faixa.innerHTML = `<h1>${noticia.titulo}</h1>`;

    wrapper.appendChild(img);
    wrapper.appendChild(faixa);

    conteudo.appendChild(wrapper);
    fadeIn();

    setTimeout(tocar, 10000);
  }, 500);
}




/* =========================
   RENDER CLIMA FULLSCREEN
========================= */
function renderClima() {
  if (!climaAtual) {
    return tocar();
  }

  fadeOut();

  setTimeout(() => {
    limpar();

    const clima = document.createElement("div");
    clima.className = "clima-full";
    clima.innerHTML = `
      <div class="clima-cidade">${climaAtual.cidade}</div>
      <div class="clima-temp">${climaAtual.temperatura}°C</div>
      <div class="clima-desc">${climaAtual.descricao}</div>
    `;

    conteudo.appendChild(clima);
    fadeIn();

    setTimeout(tocar, 8000);
  }, 500);
}


async function atualizarClimaTela() {
  try {
    const res = await fetch(`/api/clima/${tvId}`);
    const c = await res.json();

    document.getElementById("climaCidade").innerText = c.cidade;
    document.getElementById("climaTemp").innerText = `${c.temperatura}°C`;
    document.getElementById("climaDesc").innerText = c.descricao;
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
    const noticia = noticias[Math.floor(Math.random() * noticias.length)];
    return renderNoticia(noticia);
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
