/* =========================
   PLAYER COMPATÍVEL COM TV BOX ANTIGA (ES5)
   ========================= */

   /* =========================
   DETECÇÃO DE ORIENTAÇÃO (COMPATÍVEL)
   ========================= */
function detectarOrientacao() {
    var vertical = window.innerHeight > window.innerWidth;
    
    if (vertical) {
        document.body.className = "vertical";
    } else {
        document.body.className = "horizontal";
    }
}

// Detectar ao iniciar
detectarOrientacao();

// Detectar se mudar (Usando function tradicional para compatibilidade)
window.addEventListener("resize", function() {
    detectarOrientacao();
});

var params = new URLSearchParams(window.location.search);
var tvId = params.get("tv") || "1"; // Fallback se não vier id

var conteudo = document.getElementById("conteudo");

var playlist = [];
var noticias = [];
var indice = 0;
var anunciosRodados = 0;

function fadeOut() { conteudo.style.opacity = 0; }
function fadeIn() { conteudo.style.opacity = 1; }
function limpar() { conteudo.innerHTML = ""; }

function resumoCurto(texto, limite) {
    if (!limite) limite = 280;
    if (!texto) return "";
    return texto.length > limite ? texto.slice(0, limite) + "…" : texto;
}

// Preload usando Callbacks (Promises não rodam bem no v52)
function preloadMidia(midia, callback) {
    if (midia.tipo === "imagem") {
        var img = new Image();
        img.onload = function() { callback(img); };
        img.onerror = function() { callback(null); };
        img.src = midia.url;
    } else if (midia.tipo === "video") {
        var video = document.createElement("video");
        video.preload = "auto";
        video.oncanplaythrough = function() { callback(video); };
        video.onerror = function() { callback(null); };
        video.src = midia.url;
        video.load();
    }
}

// Carregar dados usando XMLHttpRequest (Fetch dá erro no v52)
function carregarDados(callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/playlist/' + tvId, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            playlist = JSON.parse(xhr.responseText);
            // Carregar noticias depois
            var xhr2 = new XMLHttpRequest();
            xhr2.open('GET', '/api/noticias/' + tvId, true);
            xhr2.onreadystatechange = function() {
                if (xhr2.readyState == 4 && xhr2.status == 200) {
                    noticias = JSON.parse(xhr2.responseText);
                    callback();
                }
            };
            xhr2.send();
        }
    };
    xhr.send();
}

function renderMidia(item) {
    fadeOut();
    preloadMidia(item, function(elemento) {
        if (!elemento) { tocar(); return; }
        setTimeout(function() {
            limpar();
            if (item.tipo === "imagem") {
                elemento.className = "midia-img";
                conteudo.appendChild(elemento);
                fadeIn();
                setTimeout(tocar, item.duracao * 1000);
            } else if (item.tipo === "video") {
                elemento.className = "midia-video";
                elemento.autoplay = true;
                elemento.muted = true;
                elemento.onended = tocar;
                conteudo.appendChild(elemento);
                fadeIn();
            }
        }, 500);
    });
}

function renderNoticia(noticia) {
  fadeOut();

  setTimeout(() => {
    limpar();

    const box = document.createElement("div");
    box.className = "noticia-full";

    box.innerHTML = `
      <div class="noticia-imagem" style="background-image:url('${noticia.imagem || "img/fallback.jpg"}')"></div>

      <div class="noticia-titulo-faixa">
        ${noticia.titulo}
      </div>

      <div class="noticia-fonte">
        <img src="img/logo-g1.png" alt="g1" />
      </div>
    `;

    conteudo.appendChild(box);
    fadeIn();

    setTimeout(tocar, 12000);
  }, 500);
}


function tocar() {
    if (!playlist || !playlist.length) return;
    if (anunciosRodados === 2 && noticias.length) {
        anunciosRodados = 0;
        var noticia = noticias[Math.floor(Math.random() * noticias.length)];
        renderNoticia(noticia);
        return;
    }
    var item = playlist[indice];
    indice = (indice + 1) % playlist.length;
    anunciosRodados++;
    renderMidia(item);
}

function atualizarHora() {
    var agora = new Date();
    document.getElementById("dataHora").innerText = agora.toLocaleString();
}

function atualizarClima() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/clima/' + tvId, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4 && xhr.status == 200) {
            var c = JSON.parse(xhr.responseText);
            document.getElementById("clima").innerText = c.cidade + " • " + c.temperatura + "°C";
        }
    };
    xhr.send();
}

// Inicialização
carregarDados(function() {
    atualizarHora();
    setInterval(atualizarHora, 1000);
    setInterval(atualizarClima, 60000);
    tocar();
});