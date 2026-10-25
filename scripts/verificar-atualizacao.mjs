// Duas publicações reais no mesmo endereço, com abas e arquivos de versões diferentes.
// Dados e servidor são fictícios e isolados da fábrica e do domínio publicado.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, mkdir } from 'node:fs/promises';
import { executarComRecursos, aguardarOffline, comPrazo } from './navegador.mjs';

const ferramenta=process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href;
const {chromium}=await import(ferramenta);
const fonte=await readFile(new URL('../src/sw.js',import.meta.url),'utf8');
// Cópia do worker efetivamente publicado antes desta correção, para testar a transição.
const legado=await readFile(new URL('../testes/fixtures/sw-71e0b87.txt',import.meta.url),'utf8');
const atualizacao=await readFile(new URL('../src/servicos/atualizacao.js',import.meta.url),'utf8');
let versao='A';let usarLegado=false;let sinalAtivacao;
let ativouB=new Promise(resolve=>{sinalAtivacao=resolve;});
const origem='http://127.0.0.1:4176';
const html=v=>`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Atualização ${v}</title><body>
<main id="conteudo"><h1>Versão ${v}</h1><label>Rascunho<input id="rascunho"></label><button id="abrir">Abrir recurso offline</button><p id="resultado"></p></main>
<script type="module">${usarLegado&&v==='A'?"navigator.serviceWorker.register('./sw.js');":"import {registrarAtualizacao} from './atualizacao.js';registrarAtualizacao();"}
document.querySelector('#abrir').onclick=async()=>{try{const m=await import('./lazy-${v}.js');document.querySelector('#resultado').textContent=m.versao;}catch{document.querySelector('#resultado').textContent='Falha no recurso';}};</script></body></html>`;

await executarComRecursos({
  limiteTotal:120000,
  criarServidor:async()=>{
    const servidor=createServer((req,res)=>{
      const caminho=new URL(req.url,origem).pathname;
      res.setHeader('Cache-Control','no-store');
      if(caminho==='/ativou-B'){sinalAtivacao();res.writeHead(204).end();return;}
      if(caminho==='/sw.js'){
        const arquivos=[`./lazy-${versao}.js`,'./propostas/index.html'];
        if(versao!=='A')arquivos.push('./atualizar.html');
        if(!usarLegado||versao!=='A')arquivos.push('./atualizacao.js');
        const base=usarLegado&&versao==='A'?legado:fonte;
        const sw=base.replace('[/*ARQUIVOS*/]',JSON.stringify(arquivos)).replace('/*VERSAO*/','teste-'+versao);
        res.setHeader('Content-Type','text/javascript');
        res.end(sw+(versao==='B'?`\nself.addEventListener('activate',e=>e.waitUntil(fetch('/ativou-B',{method:'POST'})));`:''));return;
      }
      if(caminho==='/atualizacao.js'){res.setHeader('Content-Type','text/javascript');res.end(atualizacao);return;}
      if(caminho===`/lazy-${versao}.js`&&versao!=='C'){res.setHeader('Content-Type','text/javascript');res.end(`export const versao='Recurso ${versao}';`);return;}
      if(caminho==='/propostas/index.html'){res.setHeader('Content-Type','text/html');res.end('<h1>Propostas isoladas</h1>');return;}
      if(caminho==='/'||caminho==='/index.html'||caminho==='/atualizar.html'){res.setHeader('Content-Type','text/html');res.end(html(versao));return;}
      res.writeHead(404).end('Arquivo ausente nesta publicação');
    });
    servidor.listen(4176,'127.0.0.1');await once(servidor,'listening');
    return {close:()=>new Promise((resolve,reject)=>servidor.close(e=>e?reject(e):resolve()))};
  },
  criarNavegador:()=>chromium.launch({executablePath:process.env.PCM_CHROMIUM||undefined,args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),
  executar:async({navegador})=>{
    const contexto=await navegador.newContext({viewport:{width:900,height:700}});
    contexto.setDefaultTimeout(20000);
    const primeira=await contexto.newPage();const erros=[];
    primeira.on('pageerror',e=>erros.push(e.message));
    await primeira.goto(origem);await aguardarOffline(primeira);
    await primeira.locator('#rascunho').fill('Trabalho ainda não enviado');
    await primeira.evaluate(async()=>{localStorage.setItem('dados-ficticios','preservados');await caches.open('outro-aplicativo');});
    const segunda=await contexto.newPage();await segunda.goto(origem);await aguardarOffline(segunda);
    versao='B';
    await primeira.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
    await primeira.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
    await primeira.locator('#aviso-atualizacao').waitFor();
    assert.equal(await primeira.locator('h1').textContent(),'Versão A');
    assert.equal(await primeira.locator('#rascunho').inputValue(),'Trabalho ainda não enviado');
    await segunda.reload();assert.equal(await segunda.locator('h1').textContent(),'Versão A','HTML continua na versão ativa, mesmo online');
    const recuperada=await contexto.newPage();await recuperada.goto(origem+'/atualizar.html');
    assert.equal(await recuperada.locator('h1').textContent(),'Versão B','Entrada nova abre HTML atual sob worker antigo');
    assert.equal(await recuperada.evaluate(()=>localStorage.getItem('dados-ficticios')),'preservados');
    assert.equal(await primeira.locator('#rascunho').inputValue(),'Trabalho ainda não enviado');
    await recuperada.close();
    await contexto.setOffline(true);
    await primeira.locator('#abrir').click();await primeira.getByText('Recurso A',{exact:true}).waitFor();
    await segunda.reload();assert.equal(await segunda.locator('h1').textContent(),'Versão A');
    const propostas=await contexto.newPage();await propostas.goto(origem+'/propostas/index.html');await propostas.getByRole('heading',{name:'Propostas isoladas'}).waitFor();await propostas.close();
    await segunda.reload();assert.equal(await segunda.locator('h1').textContent(),'Versão A','Propostas não substituem a página principal');
    const cachesAntes=await primeira.evaluate(()=>caches.keys());assert.ok(cachesAntes.some(n=>n.endsWith('teste-A')));assert.ok(cachesAntes.some(n=>n.endsWith('teste-B')));
    await mkdir('artifacts',{recursive:true});await primeira.screenshot({path:'artifacts/atualizacao-pendente.png'});
    await contexto.setOffline(false);await primeira.close();await segunda.close();
    await comPrazo(ativouB,20000,'A nova versão não ativou após fechar todas as abas.');
    const nova=await contexto.newPage();await nova.goto(origem);await aguardarOffline(nova);
    assert.equal(await nova.locator('h1').textContent(),'Versão B');
    assert.equal(await nova.evaluate(()=>localStorage.getItem('dados-ficticios')),'preservados');
    const cachesDepois=await nova.evaluate(()=>caches.keys());assert.ok(!cachesDepois.some(n=>n.endsWith('teste-A')));assert.ok(cachesDepois.includes('outro-aplicativo'));
    // Uma publicação incompleta não pode derrubar a versão B que já funciona.
    versao='C';
    await nova.evaluate(async()=>{
      const registro=await navigator.serviceWorker.getRegistration();
      const falhou=new Promise(resolve=>registro.addEventListener('updatefound',()=>{const worker=registro.installing;worker.addEventListener('statechange',()=>{if(worker.state==='redundant')resolve();});},{once:true}));
      await registro.update();await falhou;
    });
    assert.equal(await nova.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting),false);
    await contexto.setOffline(true);await nova.reload();assert.equal(await nova.locator('h1').textContent(),'Versão B');
    await nova.locator('#abrir').click();await nova.getByText('Recurso B',{exact:true}).waitFor();
    assert.deepEqual(erros,[]);
    await contexto.close();
    // Primeira atualização dos usuários atuais: a aba antiga continua com seus arquivos.
    versao='A';usarLegado=true;ativouB=new Promise(resolve=>{sinalAtivacao=resolve;});
    const transicao=await navegador.newContext();const antiga=await transicao.newPage();
    await antiga.goto(origem);await aguardarOffline(antiga);await antiga.locator('#rascunho').fill('Trabalho na versão publicada');
    await antiga.evaluate(()=>localStorage.setItem('dados-ficticios','legado preservado'));
    versao='B';await antiga.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});
    await antiga.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
    await transicao.setOffline(true);await antiga.locator('#abrir').click();await antiga.getByText('Recurso A',{exact:true}).waitFor();
    assert.equal(await antiga.locator('#rascunho').inputValue(),'Trabalho na versão publicada');
    await transicao.setOffline(false);await antiga.close();await comPrazo(ativouB,20000,'Transição do worker legado não ativou.');
    const migrada=await transicao.newPage();await migrada.goto(origem);await aguardarOffline(migrada);
    assert.equal(await migrada.locator('h1').textContent(),'Versão B');
    assert.equal(await migrada.evaluate(()=>localStorage.getItem('dados-ficticios')),'legado preservado');
    await transicao.close();
    console.log('Aprovado: atualização A→B com duas abas, rascunho em uso, recursos offline, HTML consistente, propostas isoladas, armazenamento preservado e publicação C incompleta recusada.');
  },
});
