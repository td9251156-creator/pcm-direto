// Service worker simples: guarda os arquivos do app para abrir sem internet.
// A lista ARQUIVOS é preenchida automaticamente no "npm run build" (veja vite.config.js).
const ARQUIVOS = [/*ARQUIVOS*/];
const PAGINA = /*PAGINA*/null;
const PORTAL = /*PORTAL*/null;
const PREFIXO = 'pcm-direto-' + encodeURIComponent(self.registration.scope) + '-';
const CACHE = PREFIXO + '/*VERSAO*/';
const CACHE_PUBLICO = CACHE + '-portal';
const CACHE_RECURSOS_PUBLICOS = CACHE + '-portal-recursos';

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
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith(PREFIXO) && n !== CACHE && n !== CACHE_PUBLICO && n !== CACHE_RECURSOS_PUBLICOS).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope) || req.headers.has('Authorization')) return;

  // HTML e arquivos pertencem à mesma versão. Uma aba aberta não troca de versão
  // por receber HTML novo da rede enquanto ainda está no worker antigo.
  if (req.mode === 'navigate') {
    const url = new URL(req.url);
    const inicio = new URL(self.registration.scope);
    if(PORTAL !== null){
      const relativo=url.pathname.slice(inicio.pathname.length);
      const aplicativo=relativo==='app.html'||relativo==='atualizar.html'||/^abrir-[a-f0-9]{16}\.html$/.test(relativo);
      if(aplicativo){evento.respondWith(caches.open(CACHE).then(c=>c.match(req,{ignoreSearch:true,ignoreVary:true})).catch(()=>null).then(r=>r||fetch(req)));return;}
      if(relativo===''||relativo==='index.html'){evento.respondWith(caches.open(CACHE_PUBLICO).then(c=>c.match('./')).catch(()=>null).then(r=>r||new Response(PORTAL,{headers:{'Content-Type':'text/html; charset=utf-8'}})));return;}
      if(url.search || relativo.startsWith('comunidade/acesso/'))return;
      evento.respondWith((async()=>{
        let c;try{c=await caches.open(CACHE_PUBLICO);}catch{/* Leitura online continua sem cache. */}const chave=relativo==='index.html'?new URL('./',inicio).href:req.url;
        try{const r=await fetch(req);if(r.ok&&c){try{await c.put(chave,r.clone());const chaves=(await c.keys()).filter(r=>new URL(r.url).pathname!==inicio.pathname);while(chaves.length>20)await c.delete(chaves.shift());}catch{/* Falta de espaço não impede a leitura online. */}}return r;}
        catch{let r;try{r=c&&await c.match(chave);}catch{/* Cache indisponível. */}return r||paginaSemConexao();}
      })());return;
    }
    const principal = url.pathname === inicio.pathname || url.pathname === inicio.pathname + 'index.html';
    evento.respondWith(caches.open(CACHE)
      .then((c) => c.match(principal ? './' : req, { ignoreSearch: true, ignoreVary: true }))
      .catch(() => null).then((guardado) => guardado || fetch(req)));
    return;
  }

  // Páginas públicas podem chegar de uma publicação nova enquanto a anterior está ativa.
  // Guardar só assets públicos versionados; consultas e endpoints privados ficam fora.
  const url = new URL(req.url);
  const relativo = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (PORTAL !== null && !url.search && /^assets\/[a-zA-Z0-9._-]+-[a-zA-Z0-9_-]{8,}\.(css|js)$/.test(relativo)) {
    evento.respondWith((async () => {
      let publico;
      try {
        const nucleo = await caches.open(CACHE);
        const guardado = await nucleo.match(req, { ignoreVary: true });
        if (guardado) return guardado;
        publico = await caches.open(CACHE_RECURSOS_PUBLICOS);
        const anterior = await publico.match(req, { ignoreVary: true });
        if (anterior) return anterior;
      } catch { /* Cache indisponível não impede buscar o recurso online. */ }
      const resposta = await fetch(req);
      const tipo = resposta.headers.get('Content-Type') || '';
      if (publico && resposta.ok && /^(text\/css|(?:text|application)\/(?:javascript|ecmascript))(?:;|$)/i.test(tipo)) {
        try {
          await publico.put(req, resposta.clone());
          const chaves = await publico.keys();
          while (chaves.length > 80) await publico.delete(chaves.shift());
        } catch { /* Falta de espaço não impede a leitura online. */ }
      }
      return resposta;
    })());
    return;
  }

  // Demais arquivos (nomes mudam a cada versão): primeiro o guardado; se não tiver, busca na internet
  // Arquivos estáticos do próprio app não variam conforme o cabeçalho Origin do navegador.
  evento.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true, ignoreVary: true })).catch(() => null).then((guardado) => guardado || fetch(req)));
});

function paginaSemConexao() {
  const app = new URL('./app.html', self.registration.scope).href;
  return new Response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Material indisponível offline · PCM Direto</title><style>body{font:18px/1.6 system-ui,sans-serif;color:#0b2a5b;background:#f4f6fa;max-width:680px;padding:24px;margin:8vh auto}a{display:inline-block;padding:12px;color:#0b2a5b}a:focus-visible{outline:3px solid #b85600}</style><main><h1>Este material ainda precisa de conexão</h1><p>A página não está guardada neste aparelho. Quando estiver online, abra o material para poder voltar a ele sem internet.</p><p>Se o aplicativo já estiver guardado neste aparelho, você pode continuar o trabalho por ele.</p><a href="${app}">Abrir o aplicativo</a></main></html>`, {status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}
