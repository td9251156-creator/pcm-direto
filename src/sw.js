// Service worker simples: guarda os arquivos do app para abrir sem internet.
// A lista ARQUIVOS é preenchida automaticamente no "npm run build" (veja vite.config.js).
const ARQUIVOS = [/*ARQUIVOS*/];
const PAGINA = /*PAGINA*/null;
const PORTAL = /*PORTAL*/null;
const PREFIXO = 'pcm-direto-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIXO + '/*VERSAO*/';
const CACHE_PUBLICO = CACHE + '-portal';

self.addEventListener('install', (evento) => {
  // Não forçar ativação: a versão nova espera todas as abas da anterior fecharem.
  evento.waitUntil((async () => {
    const c = await caches.open(CACHE);
    if (PAGINA === null) { await c.addAll(['./', ...ARQUIVOS]); return; }
    // O HTML pertence ao próprio build; não aceitar uma página HTTP anterior
    // referenciando CSS/JS que não estão no cache desta publicação.
    const entradas = new Set(PORTAL === null ? ['./', './index.html', './atualizar.html'] : ['./app.html', './atualizar.html', ...ARQUIVOS.filter(a=>/^\.\/abrir-[a-f0-9]{16}\.html$/.test(a))]);
    await c.addAll(ARQUIVOS.filter(a => !entradas.has(a) && !(PORTAL !== null && (a === './index.html' || /\.html$/.test(a) && /\/(guias|comunidade|modelos\/pcm-man-)/.test(a)))).map(a =>
      new Request(new URL(a, self.registration.scope), { cache: 'reload' })));
    await Promise.all([...entradas].map(a => c.put(a, new Response(PAGINA, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }))));
    if(PORTAL !== null){const publico=await caches.open(CACHE_PUBLICO);await publico.put('./',new Response(PORTAL,{headers:{'Content-Type':'text/html; charset=utf-8'}}));}
  })());
});

// Sem skipWaiting, o navegador só ativa a atualização após liberar os clientes antigos.
// Nesse momento os caches anteriores do mesmo endereço podem ser removidos.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith(PREFIXO) && n !== CACHE && n !== CACHE_PUBLICO).map((n) => caches.delete(n))))
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
    if(PORTAL !== null){
      const relativo=url.pathname.slice(inicio.pathname.length);
      const aplicativo=relativo==='app.html'||relativo==='atualizar.html'||/^abrir-[a-f0-9]{16}\.html$/.test(relativo);
      if(aplicativo){evento.respondWith(caches.open(CACHE).then(c=>c.match(req,{ignoreSearch:true,ignoreVary:true})).then(r=>r||fetch(req)));return;}
      if(relativo===''||relativo==='index.html'){evento.respondWith(caches.open(CACHE_PUBLICO).then(c=>c.match('./')));return;}
      if(url.search || relativo.startsWith('comunidade/acesso/'))return;
      evento.respondWith((async()=>{
        const c=await caches.open(CACHE_PUBLICO);const chave=relativo==='index.html'?new URL('./',inicio).href:req.url;
        try{const r=await fetch(req);if(r.ok){await c.put(chave,r.clone());const chaves=(await c.keys()).filter(r=>new URL(r.url).pathname!==inicio.pathname);while(chaves.length>20)await c.delete(chaves.shift());}return r;}
        catch{const r=await c.match(chave);return r||new Response('Esta página do portal precisa de conexão. O aplicativo permanece disponível em app.html.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
      })());return;
    }
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
