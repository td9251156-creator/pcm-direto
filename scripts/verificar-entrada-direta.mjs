// Regressão: CTAs não passam pelo portal; links legados não exibem a tela pública no caminho.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { iniciarServidor, executarComRecursos, comPrazo } from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
const base='http://127.0.0.1:4225';
await executarComRecursos({criarServidor:()=>iniciarServidor({raiz:process.cwd(),porta:4225}),criarNavegador:()=>chromium.launch({args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),executar:async({navegador})=>{
 const c=await navegador.newContext({serviceWorkers:'block'});const p=await c.newPage();
 await p.goto(base+'/conheca.html');
 const links=await p.locator('a').evaluateAll(es=>es.filter(a=>a.textContent.includes('Abrir o app')||a.textContent.includes('Começar meu PCM')).map(a=>a.href));
 assert.equal(links.length,3);assert.ok(links.every(h=>h===base+'/app.html#inicio'),'Os três CTAs abrem diretamente o endereço do app');
 await p.getByRole('link',{name:'Explorar o catálogo de modelos',exact:true}).click();await p.waitForURL('**/modelos/');await p.locator('[data-filtros]:visible').waitFor();
 await p.goto(base+'/conheca.html');
 const rotas=[];p.on('framenavigated',f=>{if(f===p.mainFrame())rotas.push(f.url());});
 await p.getByRole('link',{name:'Abrir o app',exact:true}).click();await p.waitForURL('**/app.html#inicio');await p.locator('#conteudo h2').first().waitFor();
 assert.ok(!rotas.some(u=>new URL(u).pathname==='/'),'Clique no CTA não navega pela raiz');await c.close();
 const legado=await navegador.newContext({serviceWorkers:'block'});const l=await legado.newPage();
 let recebeu;const captura=new Promise(resolve=>recebeu=resolve);
 await l.exposeFunction('registrarEntrada',registro=>recebeu(registro));
 await l.addInitScript(()=>{
   const observador=new MutationObserver(()=>{
     if(document.documentElement?.dataset.entrada!=='app')return;
     const principal=document.getElementById('principal');
     window.registrarEntrada({marcador:document.documentElement.dataset.entrada,portalVisivel:!!principal&&getComputedStyle(principal).visibility!=='hidden'});
     observador.disconnect();
   });
   observador.observe(document,{attributes:true,childList:true,subtree:true});
 });
 await legado.route('**/app.html*',async r=>{await new Promise(resolve=>setTimeout(resolve,100));await r.continue();});
 const navegacao=l.goto(base+'/?origem=ficticia#inicio').catch(e=>{if(!/interrupted|ERR_ABORTED/.test(e.message))throw e;});
 const registro=await comPrazo(captura,5000,'A ponte antecipada não sinalizou a entrada no app.');
 assert.equal(registro.marcador,'app');assert.equal(registro.portalVisivel,false,'Não exibe o portal durante a compatibilidade');
 await navegacao;await l.waitForURL('**/app.html?origem=ficticia#inicio');await l.locator('#conteudo h2').first().waitFor();
 await legado.close();
 const html=await readFile('dist/index.html','utf8');assert.ok(html.indexOf('data-entrada')<html.indexOf('<body>'));assert.ok(html.indexOf('const rotas')<html.indexOf('<link'),'Decisão antecede os estilos externos');assert.ok(!html.includes('<!--ENTRADA-APP-->'));
 console.log('Entrada direta: três CTAs, navegação sem raiz intermediária, compatibilidade sem exibir portal e query/hash preservados aprovados.');
}});
