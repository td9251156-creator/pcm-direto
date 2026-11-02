import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { iniciarServidor,executarComRecursos,aguardarOffline } from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
await executarComRecursos({criarServidor:()=>iniciarServidor({raiz:process.cwd(),porta:4210}),criarNavegador:()=>chromium.launch({args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),executar:async({navegador})=>{
 const c=await navegador.newContext();const p=await c.newPage();
 await p.goto('http://127.0.0.1:4210/');await p.locator('#principal h1').waitFor();
 assert.deepEqual(await p.evaluate(async()=> (await indexedDB.databases()).map(d=>d.name)),[],'Visitar portal não abre a base operacional');
 assert.equal(await p.locator('header nav a').count(),4);
 assert.equal(await p.locator('#principal button, #principal form').count(),0,'A fundação oferece entradas reais, sem simular recursos adiados');
 await mkdir('artifacts',{recursive:true});
 for(const width of [320,390,820,1280]){
  await p.setViewportSize({width,height:900});await p.evaluate(()=>document.fonts.ready);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Sem rolagem horizontal em '+width);
  assert.ok(await p.locator('header nav a[href="./app.html#inicio"]').isVisible(),'Meu PCM permanece disponível no celular');
  assert.ok(await p.locator('.heroi .botao').isVisible(),'Primeiro passo em destaque');
  await p.screenshot({path:`artifacts/portal-fundacao-depois-${width}.png`,fullPage:true});
 }
 await p.keyboard.press('Tab');await p.keyboard.press('Enter');assert.equal(await p.locator('#principal').evaluate(e=>e===document.activeElement),true,'Pular leva o foco ao conteúdo');
 const semJs=await navegador.newContext({javaScriptEnabled:false});const leitura=await semJs.newPage();await leitura.goto('http://127.0.0.1:4210/');
 assert.ok(await leitura.getByRole('heading',{name:'O que você precisa agora?'}).isVisible());
 for(const href of ['modelos','apoio','catalogo','inicio'])assert.ok(await leitura.locator(`header a[href="./app.html#${href}"]`).isVisible());
 await semJs.close();
 await p.locator('header nav a[href="./app.html#apoio"]').click();await p.locator('#conteudo h2').first().waitFor();assert.ok((await p.locator('#conteudo').innerText()).includes('guias curtos'),'O CTA Guias abre o apoio existente');
 await p.goto('http://127.0.0.1:4210/?origem=ficticia#falhas?ativo=ficticio');await p.waitForURL('**/app.html?origem=ficticia#falhas?ativo=ficticio');await p.locator('#conteudo h2').first().waitFor();
 await aguardarOffline(p);
 const biblioteca=JSON.parse(await readFile('src/dados/biblioteca.json','utf8'));
 const backup={aplicativo:'PCM Direto',versao:1,biblioteca,rascunho:{equipamentos:[{id:'ficticio',setor:'TST',tipo:'motor_eletrico',numero:1,tag:'TST-MOT-001',descricao:'Motor fictício',fabricante:'',modelo:''}],ajustes:{},execucoes:{},exemplo:false,inicio:'2026-11-02',capacidade:{}}};
 await p.goto('http://127.0.0.1:4210/app.html#dados');await p.locator('#restaurar-backup').setInputFiles({name:'ficticio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await p.locator('#confirmar-backup').click();await p.waitForURL('**#semana');
 const base=()=>p.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('pcm-direto:base:v3',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const q=db.transaction('base').objectStore('base').get('principal');q.onsuccess=()=>{db.close();resolve(q.result);};};}));
 const antes=await base();await p.goto('http://127.0.0.1:4210/');await p.locator('#principal h1').waitFor();assert.deepEqual(await base(),antes,'Portal preserva base operacional preexistente');
 await c.setOffline(true);await p.goto('http://127.0.0.1:4210/?v=ficticio#apoio');await p.waitForURL('**/app.html?v=ficticio#apoio');await p.reload();await p.locator('#conteudo h2').first().waitFor();
 const versao=JSON.parse(await readFile('dist/versao-atual.json','utf8'));
 await p.goto('http://127.0.0.1:4210/'+versao.entrada+'#apoio');await p.locator('#conteudo h2').first().waitFor();
 assert.ok((await p.locator('#conteudo').innerText()).includes('guias curtos'));
 await c.setOffline(false);
 const instalado=await navegador.newContext();await instalado.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));const janela=await instalado.newPage();await janela.goto('http://127.0.0.1:4210/');await janela.waitForURL('**/app.html*');await janela.locator('#conteudo h2').first().waitFor();await instalado.close();
 await c.close();console.log('Fundação portal: raiz, links antigos com query/hash, zero abertura de base, telas responsivas, app e recuperação offline aprovados.');
}});
