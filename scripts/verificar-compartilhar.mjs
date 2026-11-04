// Web Share e clipboard simulados; não envia materiais para pessoas nem usa a área de transferência real.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {iniciarServidor,executarComRecursos,aguardarOffline} from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
const origem='http://127.0.0.1:4226';
async function preparar(contexto,nativo=true,pode=true){
 await contexto.addInitScript(({nativo,pode})=>{
  window.compartilhamentos=[];window.copias=[];window.modoCompartilhar='ok';
  Object.defineProperty(navigator,'share',{configurable:true,value:nativo?async dados=>{
   window.compartilhamentos.push(structuredClone(dados));
   if(window.modoCompartilhar==='cancelar')throw new DOMException('Cancelamento fictício','AbortError');
   if(window.modoCompartilhar==='falhar')throw new DOMException('Falha fictícia','NotAllowedError');
   if(window.modoCompartilhar==='pendente')await new Promise(r=>{window.liberarCompartilhar=r;});
  }:undefined});
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>pode});
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async texto=>{
   if(window.modoCompartilhar==='copia-falha')throw new DOMException('Permissão fictícia','NotAllowedError');
   window.copias.push(texto);
  }}});
 },{nativo,pode});
}
await executarComRecursos({
 criarServidor:()=>iniciarServidor({raiz:process.cwd(),porta:4226}),
 criarNavegador:()=>chromium.launch({args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),
 executar:async({navegador})=>{
  const c=await navegador.newContext({serviceWorkers:'block'});await preparar(c);
  await c.route('https://*.supabase.co/**',r=>r.abort());
  const p=await c.newPage();const erros=[];p.on('pageerror',e=>erros.push(e.message));
  for(const caminho of ['/modelos/pcm-man-004/','/guias/organizar-ordens-de-servico/']){
   const url='https://pcmdireto.me'+caminho;
   await p.goto(origem+caminho+'?origem=ficticia&code=nao-compartilhar#conversa');
   const nativo=p.locator('[data-compartilhar-aparelho]'),copiar=p.locator('[data-copiar-link]'),campo=p.locator('#link-compartilhar'),status=p.locator('#status-compartilhar');
   await nativo.waitFor();assert.equal(await campo.inputValue(),url);
   assert.deepEqual(await p.evaluate(()=>({s:window.compartilhamentos,c:window.copias})),{s:[],c:[]},'Nenhum envio ou cópia automático');
   await campo.focus();await p.keyboard.press('Shift+Tab');assert.equal(await copiar.evaluate(e=>e===document.activeElement),true);await p.keyboard.press('Enter');await status.filter({hasText:'Link copiado.'}).waitFor();
   assert.deepEqual(await p.evaluate(()=>window.copias),[url]);
   await nativo.click();await status.filter({hasText:'Compartilhamento concluído'}).waitFor();
   const dados=await p.evaluate(()=>window.compartilhamentos[0]);assert.deepEqual(Object.keys(dados).sort(),['title','url']);assert.equal(dados.url,url);assert.ok(dados.title.endsWith(' · PCM Direto'));assert.ok(!JSON.stringify(dados).includes('nao-compartilhar'));
   await p.evaluate(()=>{window.modoCompartilhar='cancelar';});await nativo.click();await status.filter({hasText:'cancelado'}).waitFor();assert.equal(await p.evaluate(()=>window.copias.length),1,'Cancelar não copia nem envia por outro caminho');
   await p.evaluate(()=>{window.modoCompartilhar='falhar';});await nativo.click();await status.filter({hasText:'Não foi possível abrir'}).waitFor();assert.equal(await campo.evaluate(e=>e===document.activeElement),true);
   await p.evaluate(()=>{window.modoCompartilhar='copia-falha';});await copiar.click();await status.filter({hasText:'O link está selecionado'}).waitFor();assert.deepEqual(await campo.evaluate(e=>[e.selectionStart,e.selectionEnd]),[0,url.length]);
   await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await copiar.click();await status.filter({hasText:'O link está selecionado'}).waitFor();assert.equal(await p.evaluate(()=>window.copias.length),1,'Sem clipboard, não declara cópia automática');
   await p.evaluate(()=>{window.modoCompartilhar='pendente';document.querySelector('[data-compartilhar-aparelho]').click();document.querySelector('[data-compartilhar-aparelho]').dispatchEvent(new MouseEvent('click',{bubbles:true}));});
   assert.equal(await copiar.isDisabled(),true);assert.equal(await p.locator('[data-compartilhar]').getAttribute('aria-busy'),'true');assert.equal(await p.evaluate(()=>window.compartilhamentos.length),4,'Não duplica o compartilhamento pendente');
   await p.evaluate(()=>window.liberarCompartilhar());await nativo.waitFor({state:'visible'});await p.waitForFunction(()=>!document.querySelector('[data-copiar-link]').disabled);
   const ids=await p.locator('[id]').evaluateAll(n=>n.map(e=>e.id));assert.equal(new Set(ids).size,ids.length);
   assert.deepEqual(await p.evaluate(async()=>(await indexedDB.databases()).map(d=>d.name)),[],'Compartilhar não abre base operacional');
   for(const width of [320,390,820,1280]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  }
  await p.goto(origem+'/modelos/pcm-man-004/');await p.locator('[data-carregar-conversas]').click();await p.locator('[data-comunidade-modelo] > [role=status]').filter({hasText:'Não foi possível'}).waitFor();await p.locator('[data-copiar-link]').click();await p.locator('#status-compartilhar').filter({hasText:'Link copiado.'}).waitFor();
  await mkdir('artifacts',{recursive:true});await p.setViewportSize({width:390,height:900});await p.locator('[data-compartilhar]').screenshot({path:'artifacts/compartilhar-390.png'});
  assert.deepEqual(erros,[]);await c.close();
  for(const [nativo,pode] of [[false,true],[true,false]]){
   const simples=await navegador.newContext({serviceWorkers:'block'});await preparar(simples,nativo,pode);const q=await simples.newPage();await q.goto(origem+'/modelos/pcm-man-002/');await q.locator('[data-copiar-link]').waitFor();assert.equal(await q.locator('[data-compartilhar-aparelho]').isHidden(),true);await q.locator('[data-copiar-link]').click();await q.locator('#status-compartilhar').filter({hasText:'Link copiado.'}).waitFor();await simples.close();
  }
  const semJS=await navegador.newContext({javaScriptEnabled:false,serviceWorkers:'block'});const s=await semJS.newPage();await s.goto(origem+'/modelos/pcm-man-004/');assert.equal(await s.locator('#link-compartilhar').inputValue(),'https://pcmdireto.me/modelos/pcm-man-004/');assert.equal(await s.locator('[data-copiar-link]').isHidden(),true);assert.ok(await s.locator('a[download]').count());await semJS.close();
  const off=await navegador.newContext();await preparar(off,false);const o=await off.newPage();await o.goto(origem+'/app.html#cadastros');await o.locator('#g-nome').fill('Operação fictícia do teste offline');await o.locator('#salvar-organizacao').click();await o.locator('#mensagens').filter({hasText:'Dados guardados'}).waitFor();await aguardarOffline(o);
  const ler=()=>o.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('pcm-direto:base:v3',1);r.onsuccess=()=>{const db=r.result;const tx=db.transaction('base');const q=tx.objectStore('base').get('principal');tx.oncomplete=()=>{db.close();resolve(q.result);};};}));
  const antes=await ler();await o.goto(origem+'/modelos/pcm-man-004/');await o.locator('[data-copiar-link]').waitFor();await off.setOffline(true);await o.reload();await o.locator('[data-copiar-link]').click();await o.locator('#status-compartilhar').filter({hasText:'Link copiado.'}).waitFor();assert.deepEqual(await ler(),antes);
  const [download]=await Promise.all([o.waitForEvent('download'),o.locator('.cabecalho-publico a[download]').click()]);assert.deepEqual(await readFile(await download.path()),await readFile('public/modelos/biblioteca-v2/PCM-MAN-004_Ordens-de-Servico_R00.xlsx'));await off.close();
  console.log('Compartilhar: URL pública sem parâmetros, sem envio automático, Web Share/cancelamento/falha, cópia/seleção manual, envio único, teclado, quatro larguras, sem JS, backend indisponível, offline e base preservada aprovados (APIs do aparelho simuladas).');
 }
});
