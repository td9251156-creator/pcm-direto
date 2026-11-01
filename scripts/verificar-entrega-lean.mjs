import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {executarComRecursos} from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
const origem='http://127.0.0.1:4196';
await executarComRecursos({limiteTotal:240000,criarServidor:async()=>{const s=await createServer({server:{host:'127.0.0.1',port:4196,strictPort:true,watch:{ignored:['**/artifacts/**']}}});await s.listen();return s;},criarNavegador:()=>chromium.launch(),executar:async({navegador})=>{
  const context=await navegador.newContext({viewport:{width:390,height:844},acceptDownloads:true,serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(30000);const erros=[];page.on('pageerror',e=>erros.push(e.message));await page.route('https://**/*',r=>r.abort());
  await page.goto(origem+'/#marca');await page.locator('#buscar-documentos').waitFor();assert.equal(new URL(page.url()).hash,'#modelos');
  assert.equal(await page.getByRole('link',{name:/manual da marca/i}).count(),0);assert.equal(await page.locator('a[href$=".zip"]').count(),0);
  assert.equal(await page.locator('.modelo-documental').count(),19);assert.equal(await page.locator('.modelo-documental a[download]').count(),19);assert.equal(await page.locator('.modelo-documental a[href*="/previas/"]').count(),0);
  await page.locator('#grupo-documentos').selectOption('Materiais e custos');assert.equal(await page.locator('.modelo-documental').count(),2);
  await page.locator('#buscar-documentos').fill('estoque peças');assert.equal(await page.locator('.modelo-documental').count(),1);
  await page.evaluate(()=>{location.hash='mais';});await page.locator('#buscar-ferramentas').waitFor();assert.equal(await page.locator('#ferramentas .modulo').count(),18);
  await page.evaluate(()=>{location.hash='modelos';});await page.locator('#buscar-documentos').waitFor();assert.equal(await page.locator('#buscar-documentos').inputValue(),'estoque peças');assert.equal(await page.locator('#grupo-documentos').inputValue(),'Materiais e custos');
  await page.locator('#buscar-documentos').fill('inexistentexyz');await page.locator('#limpar-documentos').click();assert.equal(await page.locator('.modelo-documental').count(),19);assert.equal(await page.locator('#buscar-documentos').evaluate(e=>e===document.activeElement),true);
  // O preenchimento individual dos modelos anteriores foi retirado: o endereço antigo leva a Documentos, só com modelos v2.
  await page.evaluate(()=>{location.hash='entrega-modelos?documento=PCMD-02';});await page.locator('#emissao-pcmd').waitFor();assert.equal(new URL(page.url()).hash,'#entrega');
  assert.equal(await page.locator('[data-documento]').count(),19);assert.equal(await page.locator('[data-documento^="PCMD"],a[href*="/PCMD-"],a[href*="refeitos"]').count(),0);assert.equal(await page.locator('main').getByText(/PCMD|Formato anterior/).count(),0);
  for(const width of [320,390,820,1280]){await page.setViewportSize({width,height:844});for(const rota of ['modelos','entrega','mais']){await page.goto(origem+'/#'+rota);await page.locator('main h2').first().waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),rota+' excedeu '+width+'px');assert.equal(await page.locator('a[href$=".zip"],a[href="#marca"]').count(),0);}}
  await page.goto(origem+'/#entrega');await page.locator('#emissao-elaborador').fill('Pessoa fictícia da revisão');await page.locator('#data-corte').fill('2026-10-20');await page.evaluate(()=>{location.hash='modelos';});await page.locator('#buscar-documentos').waitFor();await page.evaluate(()=>{location.hash='entrega';});await page.locator('#emissao-pcmd').waitFor();assert.equal(await page.locator('#emissao-elaborador').inputValue(),'Pessoa fictícia da revisão');assert.equal(await page.locator('#data-corte').inputValue(),'2026-10-20');
  assert.deepEqual(erros,[]);await context.close();console.log('Experiência dos documentos: marca interna ausente, 19 modelos v2 separados, modelos antigos retirados (endereço antigo leva a Documentos), filtros, navegação e celular aprovados.');
}});
