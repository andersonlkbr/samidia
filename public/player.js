const params = new URLSearchParams(window.location.search);
const tvId = params.get('tv');

const container = document.getElementById('container');

let playlist = [];
let indexAtual = 0;
let contadorAnuncios = 0;

async function carregarPlaylist() {
  const res = await fetch(`/api/playlist/${tvId}`);
  playlist = await res.json();
}

async function carregarNoticias() {
  const res = await fetch(`/api/noticias/${tvId}`);
  return await res.json();
}

function limparContainer() {
  container.innerHTML = '';
}

/* ==========================
   RENDER ANÚNCIO
========================== */
function renderMidia(item) {
  limparContainer();

  if (item.tipo === 'imagem') {
    const img = document.createElement('img');
    img.src = item.url;
    img.className = 'midia';
    container.appendChild(img);
  }

  if (item.tipo === 'video') {
    const video = document.createElement('video');
    video.src = item.url;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.className = 'midia';
    container.appendChild(video);
  }
}

/* ==========================
   RENDER NOTÍCIA (BOX LINDO)
========================== */
function renderNoticia(noticia) {
  limparContainer();

  container.innerHTML = `
    <div class="news-box fade-in">
      <div class="news-header">
        <span class="news-badge">NEWS</span>
      </div>

      <div class="news-content">
        <div class="news-image">
          <img src="${noticia.imagem}" alt="Notícia">
        </div>

        <div class="news-text">
          <h1>${noticia.titulo}</h1>
          <p>${noticia.resumo}</p>
        </div>
      </div>
    </div>
  `;
}

/* ==========================
   LOOP PRINCIPAL
========================== */
async function tocar() {
  if (!playlist.length) {
    await carregarPlaylist();
  }

  if (!playlist.length) return;

  // A cada 2 anúncios, mostra notícia
  if (contadorAnuncios === 2) {
    contadorAnuncios = 0;
    const noticias = await carregarNoticias();

    if (noticias.length) {
      renderNoticia(noticias[0]);
      setTimeout(tocar, 10000);
      return;
    }
  }

  const item = playlist[indexAtual];
  renderMidia(item);

  contadorAnuncios++;
  indexAtual = (indexAtual + 1) % playlist.length;

  setTimeout(tocar, item.duracao * 1000);
}

carregarPlaylist().then(tocar);
