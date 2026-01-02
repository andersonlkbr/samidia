let playlist = [];
let noticias = [];
let indice = 0;
let contadorMidias = 0;

let conteudo = null;

const tvId = new URLSearchParams(window.location.search).get('tv');

/* ==========================
   INIT
========================== */
document.addEventListener('DOMContentLoaded', async () => {
  conteudo = document.getElementById('conteudo');

  if (!conteudo) {
    console.error('❌ Elemento #conteudo não encontrado no HTML');
    return;
  }

  await carregarDados();
  tocar();
});

/* ==========================
   FETCH
========================== */
async function carregarDados() {
  try {
    const resPlaylist = await fetch(`/api/playlist/${tvId}`);
    playlist = await resPlaylist.json();
  } catch (e) {
    console.error('Erro playlist', e);
    playlist = [];
  }

  try {
    const resNoticias = await fetch(`/api/noticias/${tvId}`);
    noticias = await resNoticias.json();
  } catch (e) {
    console.error('Erro notícias', e);
    noticias = [];
  }
}

/* ==========================
   PLAYER LOOP
========================== */
function tocar() {
  if (!playlist.length) {
    mostrarTelaVazia();
    setTimeout(tocar, 5000);
    return;
  }

  // A cada 2 mídias → notícia
  if (contadorMidias > 0 && contadorMidias % 2 === 0 && noticias.length) {
    mostrarNoticia();
    contadorMidias++;
    return;
  }

  const midia = playlist[indice];
  indice = (indice + 1) % playlist.length;
  contadorMidias++;

  renderMidia(midia);
}

/* ==========================
   RENDER
========================== */
function limparConteudo() {
  conteudo.classList.remove('fade-in');
  conteudo.innerHTML = '';
}

function renderMidia(midia) {
  limparConteudo();

  let el;

  if (midia.tipo === 'imagem') {
    el = document.createElement('img');
    el.src = midia.url;
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.objectFit = 'contain';

    conteudo.appendChild(el);
    fadeIn();

    setTimeout(tocar, (midia.duracao || 10) * 1000);
  }

  if (midia.tipo === 'video') {
    el = document.createElement('video');
    el.src = midia.url;
    el.autoplay = true;
    el.muted = true;
    el.playsInline = true;
    el.style.width = '100%';
    el.style.height = '100%';
    el.style.objectFit = 'contain';

    el.onended = tocar;

    conteudo.appendChild(el);
    fadeIn();
  }
}

/* ==========================
   NOTÍCIAS
========================== */
function mostrarNoticia() {
  if (!noticias.length) {
    tocar();
    return;
  }

  const noticia = noticias.shift();
  noticias.push(noticia);

  limparConteudo();

  const box = document.createElement('div');
  box.className = 'noticia-box';

  box.innerHTML = `
    <div class="noticia-header">NOTÍCIAS</div>
    <div class="noticia-titulo">${noticia.titulo}</div>
    <div class="noticia-resumo">${noticia.resumo}</div>
  `;

  conteudo.appendChild(box);
  fadeIn();

  setTimeout(tocar, (noticia.duracao || 10) * 1000);
}

/* ==========================
   UI
========================== */
function fadeIn() {
  requestAnimationFrame(() => {
    conteudo.classList.add('fade-in');
  });
}

function mostrarTelaVazia() {
  limparConteudo();
  conteudo.innerHTML = `
    <div style="color:white;font-size:28px;text-align:center">
      Nenhuma mídia disponível
    </div>
  `;
}
