const params = new URLSearchParams(window.location.search);
const tvId = params.get("tv");

const conteudo = document.getElementById("conteudo");

let playlist = [];
let noticias = [];
let indice = 0;
let anunciosRodados = 0;
let watchdogTimer = null;

// Controle de atualização
let ultimaAtualizacao = Date.now();
const INTERVALO_ATUALIZACAO = 2 * 60 * 1000; // Atualizar a cada 2 minutos

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

function clearWatchdog() {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

function armWatchdog(ms) {
  clearWatchdog();
  watchdogTimer = setTimeout(() => {
    console.warn("Watchdog: tempo limite excedido, avançando...");
    tocar();
  }, ms);
}

/* =========================
   PRELOAD
========================= */
function preloadMidia(item) {
  return new Promise(resolve => {
    if (item.tipo === "imagem") {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = item.url;
    }

    if (item.tipo === "video") {
      const video = document.createElement("video");
      video.preload = "auto"; // Melhor para evitar travamentos
      video.src = item.url;
      video.muted = true;
      video.playsInline = true;
      
      // Resolve apenas quando tiver dados suficientes para tocar
      video.onloadeddata = () => resolve(video); 
      video.onerror = () => resolve(null);
      
      // Timeout de segurança no carregamento (3s)
      setTimeout(() => resolve(null), 3000); 
    }
  });
}

/* =========================
   DADOS (ATUALIZAÇÃO)
========================= */
async function carregarDados() {
  console.log("Atualizando playlist...");
  try {
    // Adicionei um timestamp na URL para evitar cache do navegador
    const novaPlaylist = await fetch(`/api/playlist/${tvId}?_=${Date.now()}`).then(r => r.json());
    if (novaPlaylist && novaPlaylist.length > 0) {
        playlist = novaPlaylist;
    }
  } catch (e) {
    console.error("Erro ao atualizar playlist", e);
  }

  try {
    const novasNoticias = await fetch(`/api/noticias/${tvId}?_=${Date.now()}`).then(r => r.json());
    if (novasNoticias) noticias = novasNoticias;
  } catch (e) {
    console.error("Erro ao atualizar noticias", e);
  }
}

/* =========================
   RENDER MÍDIA
========================= */
async function renderMidia(item) {
  fadeOut();
  clearWatchdog();

  const el = await preloadMidia(item);
  
  // Se falhar o preload, pula para o próximo imediatamente
  if (!el) {
      console.warn("Falha no preload, pulando:", item.url);
      return tocar(); 
  }

  setTimeout(() => {
    limpar();

    if (item.tipo === "imagem") {
      el.className = "midia-img";
      conteudo.appendChild(el);
      fadeIn();
      // Imagem obedece estritamente o tempo cadastrado
      armWatchdog((item.duracao || 8) * 1000);
    }

    if (item.tipo === "video") {
      el.className = "midia-video";
      el.autoplay = true;
      el.muted = true;
      el.playsInline = true;
      
      el.onended = tocar;
      el.onerror = tocar;
      
      conteudo.appendChild(el);
      
      // Tenta tocar (navegadores às vezes bloqueiam autoplay)
      el.play().catch(e => {
          console.error("Erro autoplay:", e);
          tocar();
      });

      fadeIn();
      
      // MELHORIA: O Watchdog do vídeo agora é "Duração + 5s"
      // Isso evita cortar o vídeo antes da hora se o cadastro estiver errado,
      // mas ainda destrava a TV se o vídeo congelar.
      const duracaoSeguranca = (item.duracao || el.duration || 15) + 5;
      armWatchdog(duracaoSeguranca * 1000);
    }
  }, 500); // Aumentei levemente o tempo de fade para suavidade
}

/* =========================
   NOTÍCIA & CLIMA (Inalterados, apenas encapsulados)
========================= */
function renderNoticia(n) {
  fadeOut();
  clearWatchdog();
  setTimeout(() => {
    limpar();
    conteudo.innerHTML = `
      <div class="noticia-full">
        <div class="noticia-imagem"><img src="${n.imagem || '/img/fallback.jpg'}"></div>
        <div class="noticia-faixa"><h1>${n.titulo || ""}</h1></div>
      </div>`;
    fadeIn();
    armWatchdog(10000);
  }, 400);
}

function getIconClima(d) {
  if (!d) return "☁️";
  d = d.toLowerCase();
  if (d.includes("chuva")) return "🌧️";
  if (d.includes("sol") || d.includes("limpo")) return "☀️";
  if (d.includes("nublado") || d.includes("nuvens")) return "☁️";
  return "🌡️";
}

async function renderClima() {
  fadeOut();
  clearWatchdog();
  setTimeout(async () => {
    limpar();
    let c;
    try { c = await fetch(`/api/clima/${tvId}`).then(r => r.json()); } 
    catch { return tocar(); }

    conteudo.innerHTML = `
      <div class="clima-full">
        <div class="clima-cidade">${c.cidade}</div>
        <div class="clima-principal">
          <div class="clima-icon">${getIconClima(c.descricao)}</div>
          <div class="clima-temp">${c.temperatura}°</div>
          <div class="clima-desc">${c.descricao}</div>
        </div>
      </div>`;
    fadeIn();
    armWatchdog(9000);
  }, 400);
}

/* =========================
   LOOP PRINCIPAL
========================= */
async function tocar() {
  clearWatchdog();

  // Verifica se precisa atualizar a playlist (a cada 2 min)
  if (Date.now() - ultimaAtualizacao > INTERVALO_ATUALIZACAO) {
      ultimaAtualizacao = Date.now();
      await carregarDados(); // Atualiza em background (rápido)
      // Se a playlist ficou vazia após atualização (ex: tudo deletado)
      if (!playlist.length) {
          limpar();
          conteudo.innerHTML = "<h1 style='color:#fff; display:flex; justify-content:center; align-items:center; height:100%'>Sem mídias</h1>";
          fadeIn();
          setTimeout(tocar, 5000);
          return;
      }
  }

  if (!playlist.length) {
      // Retry se não tiver playlist inicial
      setTimeout(carregarDados, 5000);
      return;
  }

  // Lógica de intercalação (Notícias e Clima)
  if (anunciosRodados === 2 && noticias.length) {
    anunciosRodados++;
    return renderNoticia(noticias[Math.floor(Math.random() * noticias.length)]);
  }

  if (anunciosRodados === 4) {
    anunciosRodados = 0;
    return renderClima();
  }

  // Garante que o índice não estoure se a playlist diminuiu
  if (indice >= playlist.length) indice = 0;

  const item = playlist[indice];
  indice = (indice + 1) % playlist.length;
  anunciosRodados++;
  
  renderMidia(item);
}

/* =========================
   RODAPÉ (Hora e Clima)
========================= */
function atualizarHora() {
  const el = document.getElementById("dataHora");
  if (!el) return;
  const d = new Date();
  el.innerText = d.toLocaleDateString("pt-BR") + " • " + d.toLocaleTimeString("pt-BR");
}
setInterval(atualizarHora, 1000);

async function atualizarClimaRodape() {
  const el = document.getElementById("clima");
  if (!el) return;
  try {
    const c = await fetch(`/api/clima/${tvId}`).then(r => r.json());
    el.innerText = `${c.cidade} • ${c.temperatura}°C • ${c.descricao}`;
  } catch { el.innerText = ""; }
}
setInterval(atualizarClimaRodape, 60000);

/* =========================
   START
========================= */
(async () => {
  atualizarHora();
  atualizarClimaRodape();
  await carregarDados();
  tocar();
})();