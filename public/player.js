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
  }, 600);
}

/* =========================
   NOTÍCIA – PADRÃO PORTAL
========================= */
function renderNoticia(noticia) {
  fadeOut();

  setTimeout(() => {
    limpar();

    const box = document.createElement("div");
    box.className = "noticia-full";

    box.innerHTML = `
      <div class="noticia-imagem">
        <img src="${noticia.imagem || '/img/fallback.jpg'}" />
      </div>
      <div class="noticia-faixa">
        <h1>${noticia.titulo}</h1>
      </div>
    `;

    conteudo.appendChild(box);
    fadeIn();

    setTimeout(tocar, 10000);
  }, 600);
}

/* =========================
   CLIMA – FULLSCREEN
========================= */
function renderClima() {
  fadeOut();

  setTimeout(() => {
    limpar();

    const box = document.createElement("div");
    box.className = "clima-full";

    box.innerHTML = `
      <div class="clima-topo">
        <div class="clima-cidade">--</div>
      </div>

      <div class="clima-atual">
        <img class="clima-icone" src="" alt="">
        <div class="clima-temp">--°</div>
        <div class="clima-desc"></div>
      </div>

      <div class="clima-prev">
        <div class="clima-dia"></div>
        <div class="clima-dia"></div>
        <div class="clima-dia"></div>
      </div>
    `;

    conteudo.appendChild(box);
    fadeIn();

    atualizarClimaTela();

    setTimeout(tocar, 9000);
  }, 500);
}

async function atualizarClimaTela() {
  try {
    const res = await fetch(`/api/clima/${tvId}`);
    const c = await res.json();

    document.querySelector(".clima-cidade").innerText = c.cidade;
    document.querySelector(".clima-temp").innerText = `${c.temperatura}°`;
    document.querySelector(".clima-desc").innerText = c.descricao;

    const icone = document.querySelector(".clima-icone");
    if (c.icone) {
      icone.src = `https://openweathermap.org/img/wn/${c.icone}@4x.png`;
      icone.style.display = "block";
    } else {
      icone.style.display = "none";
    }

    const dias = document.querySelectorAll(".clima-dia");
    if (c.previsao && c.previsao.length) {
      dias.forEach((el, i) => {
        const d = c.previsao[i];
        if (!d) return;

        el.innerHTML = `
          <div>${d.dia}</div>
          <img src="https://openweathermap.org/img/wn/${d.icone}@2x.png">
          <div>${d.max}° / ${d.min}°</div>
        `;
      });
    }
  } catch (e) {
    console.warn("Erro clima:", e);
  }
}

/* =========================
   LOOP PRINCIPAL
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
