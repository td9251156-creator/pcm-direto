// Service worker simples: guarda os arquivos do app para abrir sem internet.
// A lista ARQUIVOS é preenchida automaticamente no "npm run build" (veja vite.config.js).
const ARQUIVOS = [/*ARQUIVOS*/];
const PREFIXO = 'pcm-direto-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIXO + '/*VERSAO*/';

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', ...ARQUIVOS])).then(() => self.skipWaiting()));
});

// Apaga caches de versões anteriores
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith(PREFIXO) && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;

  // Página: primeiro a internet (para pegar a versão nova); sem internet, a guardada
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            evento.waitUntil(caches.open(CACHE).then((c) => c.put('./', copia)).catch(() => {}));
          }
          return resp;
        })
        .catch(() => caches.open(CACHE).then((c) => c.match('./'))),
    );
    return;
  }

  // Demais arquivos (nomes mudam a cada versão): primeiro o guardado; se não tiver, busca na internet
  evento.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true })).then((guardado) => guardado || fetch(req)));
});
