const params = new URLSearchParams(window.location.search);
const tvId = params.get('tv');

let playlist = [];
let index = 0;
let ativo = 'A';
let timer = null;
let lastChange = Date.now();

const layerA = document.getElementById('layerA');
const layerB = document.getElementById('layerB');
const dataHoraEl = document.getElementById('dataHora');
const climaEl = document.getElementById('clima');
const rodape = document.getElementById('rodape');

/* ===============================
   TEMA
================================ */
async function carregarTema() {
  try {
    const r = await fetch(`/api/tv/${tvId}/tema`);
    const tema = await r.json();

    if (!tema) return;

    rodape.style.background = tema.tema_cor || 'rgba(0,0,0,0.75)';
    rodape.style.color = tema.tema_texto || '#fff';

    if (tema.logo) {
      const logo = document.createElement('img');
      logo.src = tema.logo;
      logo.style.cssText = `
        position:absolute;
        top:20px;
        left:20px;
        max-height:80px;
        z-index:10;
      `;
      document.body.appendChild(logo);
    }
  } catch {}
}

/* ===============================
   FULLSCREEN
================================ */
function entrarFullscreen() {
  document.documentElement.requestFullscreen?.();
}
document.addEventListener('click', entrarFullscreen);
setTimeout(entrarFullscreen, 1500);

/* DATA / HORA */
function atualizarHora() {
  const agora = new Date();
  dataHoraEl.textContent =
    agora.toLocaleDateString('pt-BR') +
    ' - ' +
    agora.toLocaleTimeString('pt-BR');
}
setInterval(atualizarHora, 1000);
atualizarHora();

/* CLIMA */
async function carregarClima() {
  try {
    const r = await fetch(`/api/clima/${tvId}`);
    const d = await r.json();
    climaEl.textContent = `${d.cidade} • ${d.temperatura}°C • ${d.descricao}`;
  } catch {
    climaEl.textContent = 'Clima indisponível';
  }
}
carregarClima();
setInterval(carregarClima, 600000);

/* PLAYLIST */
async function carregarPlaylist() {
  const midias = await (await fetch(`/api/midia/${tvId}`)).json();
  const noticias = await (await fetch(`/api/noticias/${tvId}`)).json();

  playlist = [];
  let n = 0;

  midias.forEach((m, i) => {
    playlist.push(m);
    if ((i + 1) % 2 === 0 && noticias[n]) {
      playlist.push(noticias[n++]);
    }
  });
}

/* RELATÓRIO */
function registrarExibicao(item) {
  fetch('/api/relatorio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tv_id: tvId,
      midia_id: item.id || null,
      tipo: item.tipo,
      duracao: item.duracao || 0
    })
  });
}

/* RENDER */
function render(item, layer) {
  layer.innerHTML = '';
  registrarExibicao(item);

  if (item.tipo === 'imagem') {
    const img = document.createElement('img');
    img.src = item.url;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover';
    layer.appendChild(img);
  }

  else if (item.tipo === 'video') {
    const v = document.createElement('video');
    v.src = item.url;
    v.autoplay = true;
    v.muted = true;
    v.playsInline = true;
    v.style.cssText = 'width:100%;height:100%;object-fit:cover';
    v.onended = proximo;
    layer.appendChild(v);
  }

  else if (item.tipo === 'noticia') {
    const wrap = document.createElement('div');
    wrap.className = 'news-wrap';

    const bg = document.createElement('img');
    bg.src = item.imagem || '/news-fallback.jpg';
    bg.className = 'news-bg';

    const box = document.createElement('div');
    box.className = 'news-box';

    box.innerHTML = `
      <div class="news-title">${item.titulo}</div>
      <div class="news-resumo">${item.resumo}</div>
    `;

    wrap.appendChild(bg);
    wrap.appendChild(box);
    layer.appendChild(wrap);
  }
}

/* TRANSIÇÃO */
function proximo() {
  lastChange = Date.now();

  const atual = ativo === 'A' ? layerA : layerB;
  const prox = ativo === 'A' ? layerB : layerA;

  index = (index + 1) % playlist.length;
  const item = playlist[index];

  render(item, prox);

  prox.classList.add('active');
  atual.classList.remove('active');

  ativo = ativo === 'A' ? 'B' : 'A';

  if (item.tipo !== 'video') {
    timer = setTimeout(proximo, (item.duracao || 10) * 1000);
  }
}

/* WATCHDOG */
setInterval(() => {
  if (Date.now() - lastChange > 90000) location.reload();
}, 30000);

/* PING */
setInterval(() => {
  fetch(`/api/ping/${tvId}`, { method: 'POST' });
}, 30000);

/* START */
(async () => {
  await carregarTema();
  await carregarPlaylist();

  if (!playlist.length) return setTimeout(() => location.reload(), 15000);

  render(playlist[0], layerA);
  if (playlist[0].tipo !== 'video') {
    timer = setTimeout(proximo, (playlist[0].duracao || 10) * 1000);
  }
})();
