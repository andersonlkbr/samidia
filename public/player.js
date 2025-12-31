const params = new URLSearchParams(window.location.search);
const tvId = params.get("tv");

const conteudo = document.getElementById("conteudo");
const dataHoraEl = document.getElementById("dataHora");
const climaEl = document.getElementById("clima");

let midias = [];
let noticias = [];
let indiceMidia = 0;
let indiceNoticia = 0;
let contador = 0;

const INTERVALO_NOTICIA = 2;

/* =========================
   DATA / HORA
========================= */
function atualizarHora() {
  const agora = new Date();
  dataHoraEl.textContent =
    agora.toLocaleDateString("pt-BR") +
    " - " +
    agora.toLocaleTimeString("pt-BR");
}
setInterval(atualizarHora, 1000);
atualizarHora();

/* =========================
   CLIMA
========================= */
async function carregarClima() {
  try {
    const res = await fetch(`/api/clima/${tvId}`);
    const dados = await res.json();
    climaEl.textContent =
      `${dados.cidade} • ${dados.temperatura}°C • ${dados.descricao}`;
  } catch {
    climaEl.textContent = "Clima indisponível";
  }
}
carregarClima();
setInterval(carregarClima, 10 * 60 * 1000);

/* =========================
   DADOS
========================= */
async function carregarMidias() {
  const res = await fetch(`/api/playlist/${tvId}`);
  midias = await res.json();
}

async function carregarNoticias() {
  try {
    const res = await fetch(`/api/noticias`);
    noticias = await res.json();
  } catch {
    noticias = [];
  }
}

/* =========================
   LOOP
========================= */
function proximo() {
  conteudo.innerHTML = "";

  // entra notícia?
  if (noticias.length && contador >= INTERVALO_NOTICIA) {
    contador = 0;
    mostrarNoticia();
    return;
  }

  mostrarMidia();
}

/* =========================
   MÍDIA
========================= */
function mostrarMidia() {
  if (!midias.length) return;

  const item = midias[indiceMidia];
  indiceMidia = (indiceMidia + 1) % midias.length;
  contador++;

  if (item.tipo === "imagem") {
    const img = document.createElement("img");
    img.src = item.url;
    img.className = "fade";
    conteudo.appendChild(img);
    requestAnimationFrame(() => img.classList.add("show"));
    setTimeout(proximo, item.duracao * 1000);
  }

  if (item.tipo === "video") {
    const video = document.createElement("video");
    video.src = item.url;
    video.autoplay = true;
    video.muted = true;
    video.className = "fade";
    video.onended = proximo;
    conteudo.appendChild(video);
    requestAnimationFrame(() => video.classList.add("show"));
  }
}

/* =========================
   NOTÍCIA (COMO ERA)
========================= */
function mostrarNoticia() {
  const n = noticias[indiceNoticia];
  indiceNoticia = (indiceNoticia + 1) % noticias.length;

  const wrap = document.createElement("div");
  wrap.className = "noticia fade";

  wrap.innerHTML = `
    <div class="noticia-box">
      <div class="noticia-tag">NOTÍCIAS</div>
      <h1>${n.titulo}</h1>
      <p>${n.resumo}</p>
    </div>
  `;

  conteudo.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add("show"));
  setTimeout(proximo, 10000);
}

/* =========================
   START
========================= */
(async () => {
  await carregarMidias();
  await carregarNoticias();
  proximo();
})();
