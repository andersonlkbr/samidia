/* ==========================
   PARAMS
========================== */
const params = new URLSearchParams(window.location.search);
const tvId = params.get('tv');

let playlist = [];
let index = 0;

const conteudo = document.getElementById('conteudo');
const dataHoraEl = document.getElementById('dataHora');
const climaEl = document.getElementById('clima');

/* ==========================
   DATA E HORA
========================== */
function atualizarHora() {
  const agora = new Date();
  dataHoraEl.textContent =
    agora.toLocaleDateString('pt-BR') +
    ' • ' +
    agora.toLocaleTimeString('pt-BR');
}

setInterval(atualizarHora, 1000);
atualizarHora();

/* ==========================
   CLIMA
========================== */
async function carregarClima() {
  try {
    const res = await fetch(`/api/clima/${tvId}?t=${Date.now()}`);
    const dados = await res.json();

    climaEl.textContent =
      `${dados.cidade} • ${dados.temperatura}°C • ${dados.descricao}`;
  } catch {
    climaEl.textContent = 'Clima indisponível';
  }
}

carregarClima();
setInterval(carregarClima, 10 * 60 * 1000);

/* ==========================
   PLAYLIST (ANTI-CACHE)
========================== */
async function carregarPlaylist() {
  playlist = [];
  index = 0;

  const res = await fetch(`/api/playlist/${tvId}?t=${Date.now()}`);
  playlist = await res.json();
}

/* ==========================
   EXIBIÇÃO
========================== */
function mostrarItem() {
  if (!playlist.length) return;

  const item = playlist[index];
  conteudo.innerHTML = '';

  // Fade in
  conteudo.classList.remove('show');
  void conteudo.offsetWidth;
  conteudo.classList.add('show');

  /* 🖼 IMAGEM */
  if (item.tipo === 'imagem') {
    const img = document.createElement('img');
    img.src = item.url + `?t=${Date.now()}`;
    img.onload = () => {
      setTimeout(proximo, item.duracao * 1000);
    };
    conteudo.appendChild(img);
  }

  /* 🎥 VÍDEO */
  if (item.tipo === 'video') {
    const video = document.createElement('video');
    video.src = item.url;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    video.onended = proximo;
    conteudo.appendChild(video);
  }

  /* 📰 NOTÍCIA */
  if (item.tipo === 'noticia') {
    const box = document.createElement('div');
    box.className = 'noticia-box';

    box.innerHTML = `
      <div class="noticia-header">NOTÍCIAS</div>
      <div class="noticia-titulo">${item.titulo}</div>
      <div class="noticia-resumo">${item.resumo}</div>
    `;

    conteudo.appendChild(box);
    setTimeout(proximo, item.duracao * 1000);
  }
}

function proximo() {
  index = (index + 1) % playlist.length;
  mostrarItem();
}

/* ==========================
   INIT
========================== */
(async () => {
  await carregarPlaylist();
  mostrarItem();
})();

/* ==========================
   WATCHDOG (ANTI-ESTADO ZUMBI)
========================== */
// Recarrega o player a cada 30 min para garantir estado limpo
setInterval(() => {
  location.reload();
}, 30 * 60 * 1000);
