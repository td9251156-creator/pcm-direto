import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {executarComRecursos} from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
const origem='http://127.0.0.1:4197';
await executarComRecursos({limiteTotal:180000,criarServidor:async()=>{const s=await createServer({server:{host:'127.0.0.1',port:4197,strictPort:true,watch:{ignored:['**/artifacts/**']}}});await s.listen();return s;},criarNavegador:()=>chromium.launch(),executar:async({navegador})=>{
  const c=await navegador.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});const p=await c.newPage();p.setDefaultTimeout(20000);
  const erros=[];p.on('pageerror',e=>erros.push(e.message));
  await p.route('**/src/estado.js*',async route=>{
    const r=await route.fetch();const texto=await r.text();const alvo='export async function salvar(opcoes = {}) {';assert.ok(texto.includes(alvo));
    await route.fulfill({response:r,body:texto.replace(alvo,alvo+'\nif(globalThis.__pausarAssistente)await new Promise(r=>(globalThis.__retomarAssistente??=[]).push(r));')});
  });
  await p.goto(origem+'/#assistente');await p.locator('#org-nome').fill('Fábrica fictícia');await p.evaluate(()=>{globalThis.__pausarAssistente=true;});
  await p.locator('#proximo').evaluate(b=>{b.click();b.click();});await p.waitForFunction(()=>globalThis.__retomarAssistente?.length);
  assert.equal(await p.evaluate(()=>globalThis.__retomarAssistente.length),1,'Um toque repetido não deve enfileirar duas gravações');
  assert.equal(await p.locator('#proximo').isDisabled(),true);assert.equal(await p.locator('#anterior').isDisabled(),true);
  assert.equal(await p.evaluate(async()=>(await import('/src/estado.js')).estado.metadados.passo),1,'A etapa ainda não foi confirmada');
  await p.evaluate(()=>{location.hash='mais';});await p.locator('#buscar-ferramentas').waitFor();
  await p.evaluate(()=>{location.hash='assistente';});await p.locator('#org-nome').waitFor();assert.equal(await p.locator('#org-nome').inputValue(),'Fábrica fictícia');assert.equal(await p.locator('#proximo').isDisabled(),true);
  await p.evaluate(()=>{location.hash='mais';});await p.locator('#buscar-ferramentas').waitFor();
  await p.evaluate(()=>{globalThis.__pausarAssistente=false;globalThis.__retomarAssistente.splice(0).forEach(r=>r());});
  await p.waitForFunction(async()=>(await import('/src/estado.js')).estado.metadados.passo===2);assert.equal(await p.locator('#buscar-ferramentas').count(),1,'Gravação atrasada não substitui outra tela');
  await p.evaluate(()=>{location.hash='assistente';});await p.getByRole('heading',{name:'Prepare seu PCM · passo 2 de 4'}).waitFor();await p.reload();await p.getByRole('heading',{name:'Prepare seu PCM · passo 2 de 4'}).waitFor();
  await p.evaluate(()=>{location.hash='mais';});const busca=p.locator('#buscar-ferramentas');await busca.fill('backup');assert.equal(await p.locator('#ferramentas .modulo').count(),1);assert.equal(await p.locator('#ferramentas a[href="#dados"]').count(),1);
  await busca.fill('modelo equipamentos');assert.equal(await p.locator('#ferramentas a[href="#entrega-modelos"]').count(),1);await busca.fill('zzzinexistente');assert.equal(await p.locator('#ferramentas .modulo').count(),0);await busca.fill('');assert.ok(await p.locator('#ferramentas .modulo').count()===18);
  for(const width of [320,390,820,1280]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  assert.deepEqual(erros,[]);await c.close();

  const q=await navegador.newContext({serviceWorkers:'block'});await q.addInitScript(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...a){if(globalThis.__quotaAssistente){this.transaction.abort();throw new DOMException('Quota fictícia','QuotaExceededError');}return put.apply(this,a);};});
  const pagina=await q.newPage();await pagina.goto(origem+'/#assistente');await pagina.locator('#org-nome').fill('Organização fictícia preservada');await pagina.evaluate(()=>{location.hash='mais';});await pagina.locator('#buscar-ferramentas').waitFor();await pagina.evaluate(()=>{location.hash='assistente';});await pagina.locator('#org-nome').waitFor();assert.equal(await pagina.locator('#org-nome').inputValue(),'Organização fictícia preservada');await pagina.evaluate(()=>{globalThis.__quotaAssistente=true;});await pagina.locator('#proximo').click();await pagina.locator('#status-assistente').filter({hasText:'Não foi possível'}).waitFor();
  assert.equal(await pagina.locator('#org-nome').inputValue(),'Organização fictícia preservada');assert.equal(await pagina.evaluate(async()=>(await import('/src/estado.js')).estado.metadados.passo),1);assert.equal(await pagina.locator('#proximo').isEnabled(),true);await q.close();

  const teclado=await navegador.newPage({serviceWorkers:'block'});await teclado.goto(origem+'/#assistente');await teclado.locator('#org-nome').fill('Exemplo por teclado');await teclado.locator('#org-nome').press('Enter');await teclado.getByRole('heading',{name:'Prepare seu PCM · passo 2 de 4'}).waitFor();await teclado.close();
  console.log('Assistente e rotina: envio único, persistência confirmada, navegação durante gravação, quota preservando campos, teclado, busca e celular aprovados.');
}});
