// Service worker simples: guarda os arquivos do app para abrir sem internet.
// A lista ARQUIVOS é preenchida automaticamente no "npm run build" (veja vite.config.js).
const ARQUIVOS = [/*ARQUIVOS*/];
const PAGINA = /*PAGINA*/null;
const PREFIXO = 'pcm-direto-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIXO + '/*VERSAO*/';

self.addEventListener('install', (evento) => {
  // Não forçar ativação: a versão nova espera todas as abas da anterior fecharem.
  evento.waitUntil((async () => {
    const c = await caches.open(CACHE);
    if (PAGINA === null) { await c.addAll(['./', ...ARQUIVOS]); return; }
    // O HTML pertence ao próprio build; não aceitar uma página HTTP anterior
    // referenciando CSS/JS que não estão no cache desta publicação.
    const entradas = new Set(['./', './index.html', './atualizar.html']);
    await c.addAll(ARQUIVOS.filter(a => !entradas.has(a)).map(a =>
      new Request(new URL(a, self.registration.scope), { cache: 'reload' })));
    await Promise.all([...entradas].map(a => c.put(a, new Response(PAGINA, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }))));
  })());
});

// Sem skipWaiting, o navegador só ativa a atualização após liberar os clientes antigos.
// Nesse momento os caches anteriores do mesmo endereço podem ser removidos.
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

  // HTML e arquivos pertencem à mesma versão. Uma aba aberta não troca de versão
  // por receber HTML novo da rede enquanto ainda está no worker antigo.
  if (req.mode === 'navigate') {
    const url = new URL(req.url);
    const inicio = new URL(self.registration.scope);
    const principal = url.pathname === inicio.pathname || url.pathname === inicio.pathname + 'index.html';
    evento.respondWith(caches.open(CACHE)
      .then((c) => c.match(principal ? './' : req, { ignoreSearch: true, ignoreVary: true }))
      .then((guardado) => guardado || fetch(req)));
    return;
  }

  // Demais arquivos (nomes mudam a cada versão): primeiro o guardado; se não tiver, busca na internet
  // Arquivos estáticos do próprio app não variam conforme o cabeçalho Origin do navegador.
  evento.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true, ignoreVary: true })).then((guardado) => guardado || fetch(req)));
});
