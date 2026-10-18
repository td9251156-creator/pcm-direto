// Service worker simples: guarda os arquivos do app para abrir sem internet.
// A lista ARQUIVOS é preenchida automaticamente no "npm run build" (veja vite.config.js).
const ARQUIVOS = [/*ARQUIVOS*/];
const CACHE = 'pcm-direto-/*VERSAO*/';

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', ...ARQUIVOS])).then(() => self.skipWaiting()));
});

// Apaga caches de versões anteriores
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// Primeiro o que está guardado; se não tiver, busca na internet
self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  evento.respondWith(
    caches.match(req, { ignoreSearch: true }).then((guardado) => guardado || fetch(req).catch(() => caches.match('./'))),
  );
});
