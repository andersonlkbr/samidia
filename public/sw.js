const CACHE_NAME = "samidia-player-v1";

const ARQUIVOS_BASE = [
  "/player.html",
  "/player.css",
  "/player.js",
  "img/fallback.jpg"
];

/* =========================
   INSTALL
========================= */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ARQUIVOS_BASE);
    })
  );
  self.skipWaiting();
});

/* =========================
   ACTIVATE
========================= */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* =========================
   FETCH
========================= */
self.addEventListener("fetch", event => {
  const req = event.request;

  // API: tenta online, cai pro cache
  if (req.url.includes("/api/")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Arquivos estáticos
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req);
    })
  );
});
