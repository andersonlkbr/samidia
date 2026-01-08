const CACHE_NAME = "samidia-player-v2";

const ARQUIVOS_BASE = [
  "/player.html",
  "/player.css",
  "/player.js",
  "/img/fallback.jpg"
];

/* =========================
   INSTALL
========================= */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ARQUIVOS_BASE))
  );
  self.skipWaiting();
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* =========================
   FETCH
========================= */
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = req.url;

  // NÃO interceptar vídeos
  if (
    url.includes(".mp4") ||
    url.includes(".webm") ||
    url.includes("r2.cloudflarestorage.com")
  ) {
    return;
  }

  // APIs
  if (url.includes("/api/")) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // Arquivos estáticos
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});