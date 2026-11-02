import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { iniciarServidor,executarComRecursos,aguardarOffline } from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
await executarComRecursos({criarServidor:()=>iniciarServidor({raiz:process.cwd(),porta:4210}),criarNavegador:()=>chromium.launch({args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),executar:async({navegador})=>{
 const c=await navegador.newContext();const p=await c.newPage();
 await p.goto('http://127.0.0.1:4210/');await p.locator('#principal h1').waitFor();
 assert.deepEqual(await p.evaluate(async()=> (await indexedDB.databases()).map(d=>d.name)),[],'Visitar portal não abre a base operacional');
 for(const width of [320,390,820,1280]){await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await p.goto('http://127.0.0.1:4210/?origem=ficticia#falhas?ativo=ficticio');await p.waitForURL('**/app.html?origem=ficticia#falhas?ativo=ficticio');await p.locator('#conteudo h2').first().waitFor();
 await aguardarOffline(p);await c.setOffline(true);await p.reload();await p.locator('#conteudo h2').first().waitFor();
 const versao=JSON.parse(await readFile('dist/versao-atual.json','utf8'));
 await p.goto('http://127.0.0.1:4210/'+versao.entrada+'#apoio');await p.locator('#conteudo h2').first().waitFor();
 assert.ok((await p.locator('#conteudo').innerText()).includes('guias curtos'));
 await c.close();console.log('Fundação portal: raiz, links antigos com query/hash, zero abertura de base, telas responsivas, app e recuperação offline aprovados.');
}});
