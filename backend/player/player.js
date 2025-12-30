const TV_ID = 'TV001';
let playlist = [];
let index = 0;

async function carregarPlaylist() {
  const res = await fetch(`http://localhost:3000/api/playlist/${TV_ID}`);
  playlist = await res.json();
}

async function heartbeat() {
  fetch(`http://localhost:3000/api/tv/heartbeat/${TV_ID}`, { method: 'POST' });
}

async function mostrarItem() {
  const item = playlist[index];
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (item.tipo === 'imagem') {
    const img = document.createElement('img');
    img.src = item.conteudo;
    img.style.width = '100%';
    app.appendChild(img);
  }

  if (item.tipo === 'video') {
    const video = document.createElement('video');
    video.src = item.conteudo;
    video.autoplay = true;
    video.muted = true;
    video.style.width = '100%';
    app.appendChild(video);
  }

  if (item.tipo === 'noticias') {
    const res = await fetch('http://localhost:3000/api/noticias');
    const noticias = await res.json();
    const div = document.createElement('div');
    div.className = 'noticias';
    div.innerHTML = noticias.map(n => `• ${n}`).join('<br><br>');
    app.appendChild(div);
  }

  setTimeout(() => {
    index = (index + 1) % playlist.length;
    mostrarItem();
  }, item.duracao * 1000);
}

setInterval(heartbeat, 30000);

carregarPlaylist().then(mostrarItem);
