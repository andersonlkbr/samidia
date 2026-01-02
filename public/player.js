const params = new URLSearchParams(window.location.search);
const tvId = params.get("tv");

const conteudo = document.getElementById("conteudo");

let playlist = [];
let noticias = [];
let indice = 0;
let contadorAnuncios = 0;

async function carregarDados() {
  const p = await fetch(`/api/playlist/${tvId}`).then(r => r.json());
  const n = await fetch(`/api/noticias/${tvId}`).then(r => r.json());

  playlist = p;
  noticias = n;
}

function limpar() {
  conteudo.innerHTML = "";
}

function renderMidia(item) {
  limpar();

  if (item.tipo === "imagem") {
    const img = document.createElement("img");
    img.src = item.url;
    img.className = "midia-img";
    conteudo.appendChild(img);

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
  }
}

function renderNoticia(n) {
  limpar();

  const box = document.createElement("div");
  box.className = "noticia-box";

  box.innerHTML = `
    <div class="noticia-tag">NOTÍCIAS</div>
    <div class="noticia-titulo">${n.titulo}</div>
    <div class="noticia-texto">${n.resumo}</div>
  `;

  conteudo.appendChild(box);

  setTimeout(tocar, 10000);
}

function tocar() {
  if (!playlist.length) return;

  if (contadorAnuncios === 2 && noticias.length) {
    contadorAnuncios = 0;
    const n = noticias[Math.floor(Math.random() * noticias.length)];
    return renderNoticia(n);
  }

  const item = playlist[indice];
  indice = (indice + 1) % playlist.length;
  contadorAnuncios++;

  renderMidia(item);
}

function atualizarRodape() {
  const agora = new Date();
  document.getElementById("dataHora").innerText =
    agora.toLocaleDateString() + " - " + agora.toLocaleTimeString();

  fetch(`/api/clima/${tvId}`)
    .then(r => r.json())
    .then(c => {
      document.getElementById("clima").innerText =
        `${c.cidade} • ${c.temp}°C • ${c.descricao}`;
    });
}

setInterval(atualizarRodape, 60000);

(async () => {
  await carregarDados();
  atualizarRodape();
  tocar();
})();
