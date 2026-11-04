// Duas publicações fictícias, sem dados reais: HTML editorial novo sob worker anterior.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { executarComRecursos, comPrazo } from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
const fonte=await readFile('src/sw.js','utf8');
const origem='http://127.0.0.1:4227';let versao='A';let sinal;
const ativouB=new Promise(r=>{sinal=r;});
const app=v=>`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>App ${v}</title><h1>App ${v}</h1><label>Rascunho<input id="rascunho"></label><script>document.querySelector('input').value=localStorage.getItem('rascunho-ficticio')||'';navigator.serviceWorker.register('./sw.js');</script></html>`;
const material=v=>`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Material ${v}</title><link rel="stylesheet" href="/assets/leitura-${v.repeat(8)}.css"><script type="module" src="/assets/leitura-${v.repeat(8)}.js"></script><h1>Material ${v}</h1></html>`;
await executarComRecursos({
 criarServidor:async()=>{
  const servidor=createServer((req,res)=>{
   const url=new URL(req.url,origem);res.setHeader('Cache-Control','no-store');
   if(url.pathname==='/ativou-B'){sinal();res.writeHead(204).end();return;}
   if(url.pathname==='/sw.js'){
    const arquivos=['./app.html','./atualizar.html',`./assets/leitura-${versao.repeat(8)}.js`,`./assets/leitura-${versao.repeat(8)}.css`];
    const sw=fonte.replace('[/*ARQUIVOS*/]',JSON.stringify(arquivos)).replace('/*VERSAO*/','portal-teste-'+versao).replace('/*PAGINA*/null',JSON.stringify(app(versao))).replace('/*PORTAL*/null',JSON.stringify('<h1>Portal '+versao+'</h1>'));
    res.setHeader('Content-Type','text/javascript');res.end(sw+"\nself.addEventListener('message',async e=>{if(e.data==='abertura-total-ficticia'){caches.open=async()=>{throw new DOMException('Cache indisponível','QuotaExceededError')};e.ports[0].postMessage('pronto');}if(e.data==='abertura-ficticia'){const original=caches.open.bind(caches);caches.open=async nome=>{if(nome.endsWith('-portal-recursos'))throw new DOMException('Cache indisponível','QuotaExceededError');return original(nome)};e.ports[0].postMessage('pronto');}if(e.data==='quota-ficticia'){const c=await caches.open(CACHE_PUBLICO);Object.getPrototypeOf(c).put=async()=>{throw new DOMException('Quota fictícia','QuotaExceededError')};e.ports[0].postMessage('pronto');}});"+(versao==='B'?"\nself.addEventListener('activate',e=>e.waitUntil(fetch('/ativou-B',{method:'POST'})));":''));return;
   }
   if(url.pathname==='/app.html'||url.pathname==='/atualizar.html'){res.setHeader('Content-Type','text/html');res.end(app(versao));return;}
   if(url.pathname==='/modelos/pcm-man-004/'){res.setHeader('Content-Type','text/html');res.end(material(versao));return;}
   if(url.pathname===`/assets/leitura-${versao.repeat(8)}.css`){res.setHeader('Content-Type','text/css');res.end('h1 {color:rgb(10, 80, 120)}');return;}
   if(url.pathname===`/assets/leitura-${versao.repeat(8)}.js`||url.pathname==='/assets/particular-BBBBBBBB.js'||url.pathname==='/assets/auth-BBBBBBBB.js'||/^\/assets\/limite-[0-9]{8}\.js$/.test(url.pathname)){res.setHeader('Content-Type','text/javascript');res.end(`document.documentElement.dataset.recurso='${versao}';`);return;}
   res.writeHead(404).end('Ausente');
  });servidor.listen(4227,'127.0.0.1');await once(servidor,'listening');return{close:()=>new Promise((r,j)=>servidor.close(e=>e?j(e):r()))};
 },
 criarNavegador:()=>chromium.launch({args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),
 executar:async({navegador})=>{
  const c=await navegador.newContext();const a=await c.newPage();await a.goto(origem+'/app.html');await a.waitForFunction(()=>navigator.serviceWorker.controller);
  await a.evaluate(()=>localStorage.setItem('rascunho-ficticio','Dados fictícios preservados'));await a.locator('input').fill('Edição ainda não salva');
  versao='B';await a.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});await a.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting));
  const p=await c.newPage();await p.goto(origem+'/modelos/pcm-man-004/');await p.waitForFunction(()=>document.documentElement.dataset.recurso==='B');
  await p.evaluate(async()=>{await(await fetch('/assets/particular-BBBBBBBB.js?privado=ficticio')).text();await(await fetch('/assets/auth-BBBBBBBB.js',{headers:{Authorization:'Bearer ficticio'}})).text();});
  await c.setOffline(true);await p.reload();await p.locator('h1').waitFor();
  assert.equal(await p.evaluate(()=>document.documentElement.dataset.recurso),'B','JS da página nova funciona offline sob worker antigo');
  assert.equal(await p.locator('h1').evaluate(e=>getComputedStyle(e).color),'rgb(10, 80, 120)','CSS da página nova funciona offline');
  assert.equal(await a.locator('h1').innerText(),'App A');assert.equal(await a.locator('input').inputValue(),'Edição ainda não salva','Sem atualização forçada');
  assert.equal(await p.evaluate(()=>localStorage.getItem('rascunho-ficticio')),'Dados fictícios preservados');
  const particulares=await p.evaluate(async()=>{const urls=[];for(const nome of await caches.keys())for(const r of await(await caches.open(nome)).keys())if(r.url.includes('privado=')||r.url.includes('/auth-'))urls.push(r.url);return urls;});assert.deepEqual(particulares,[],'Query não entra no cache público');
  const r=await p.goto(origem+'/guias/nao-visitado/');assert.equal(r.status(),503);const voltar=p.getByRole('link',{name:'Abrir o aplicativo'});await voltar.click();assert.equal(await p.locator('h1').innerText(),'App A','Saída offline acessa app em cache');
  await c.setOffline(false);
  await p.evaluate(async()=>{for(let i=0;i<82;i++)await(await fetch('/assets/limite-'+String(i).padStart(8,'0')+'.js')).text();});
  assert.deepEqual(await p.evaluate(async()=>{const totais=[];for(const n of await caches.keys())if(n.endsWith('-portal-recursos'))totais.push((await(await caches.open(n)).keys()).length);return totais;}),[80],'Cache público de recursos limitado');
  await a.close();await p.close();await comPrazo(ativouB,15000);
  const b=await c.newPage();await b.goto(origem+'/app.html');assert.equal(await b.locator('h1').innerText(),'App B');assert.equal(await b.locator('input').inputValue(),'Dados fictícios preservados');
  assert.equal(await b.evaluate(async()=>(await caches.keys()).some(n=>n.includes('portal-teste-A'))),false,'Ativação normal limpa caches antigos');
  await b.evaluate(()=>new Promise(resolve=>{const canal=new MessageChannel();canal.port1.onmessage=resolve;navigator.serviceWorker.controller.postMessage('abertura-ficticia',[canal.port2]);}));
  assert.ok((await b.evaluate(()=>fetch('/assets/limite-99999999.js').then(r=>r.text()))).includes("dataset.recurso='B'"),'Falha ao abrir cache permite recurso online');
  await b.evaluate(async()=>{for(const n of await caches.keys())if(n.endsWith('-portal'))await caches.delete(n);});
  await c.setOffline(true);await b.goto(origem+'/');assert.equal(await b.locator('h1').innerText(),'Portal B','Portal tem fallback se cache público foi removido');await c.setOffline(false);
  await b.evaluate(()=>new Promise(resolve=>{const canal=new MessageChannel();canal.port1.onmessage=resolve;navigator.serviceWorker.controller.postMessage('quota-ficticia',[canal.port2]);}));
  const online=await b.goto(origem+'/modelos/pcm-man-004/');assert.equal(online.status(),200);assert.equal(await b.locator('h1').innerText(),'Material B','Quota no cache não esconde resposta online válida');
  await b.evaluate(()=>new Promise(resolve=>{const canal=new MessageChannel();canal.port1.onmessage=resolve;navigator.serviceWorker.controller.postMessage('abertura-total-ficticia',[canal.port2]);}));
  const semCache=await b.goto(origem+'/modelos/pcm-man-004/');assert.equal(semCache.status(),200);await b.waitForFunction(()=>document.documentElement.dataset.recurso==='B');
  await c.close();
  console.log('Atualização do portal: HTML novo com CSS/JS offline sob worker antigo, app/rascunho preservados, query não guardada, saída offline clicável, limite de recursos, quota sem bloquear leitura e ativação sem forçar aprovados.');
 }
});
