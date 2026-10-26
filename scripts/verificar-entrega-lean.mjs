import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import JSZip from 'jszip';
import {executarComRecursos} from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
const pasta=new URL('../artifacts/entrega-lean/',import.meta.url);await mkdir(pasta,{recursive:true});
await executarComRecursos({limiteTotal:240000,criarServidor:async()=>{const s=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),server:{host:'127.0.0.1',port:4196,strictPort:true,watch:{ignored:['**/artifacts/**']}}});await s.listen();return s;},criarNavegador:()=>chromium.launch(),executar:async({navegador})=>{
  const context=await navegador.newContext({viewport:{width:390,height:844},acceptDownloads:true,serviceWorkers:'block'});const page=await context.newPage();page.setDefaultTimeout(90000);const erros=[];page.on('pageerror',e=>erros.push(e.message));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:4196/#entrega');await page.locator('#pacote-refeito').waitFor();
  assert.equal(await page.locator('[name="pacote"][value="essencial"]').isChecked(),true);assert.equal(await page.locator('#outras-exportacoes').getAttribute('open'),null);assert.equal(await page.locator('[name="documento"]:checked').count(),5);
  await page.locator('#modelo-organizacao').fill('Organização fictícia <&>');await page.locator('#modelo-elaborador').fill('Pessoa fictícia');
  await page.locator('.atalhos a[href="#modelos"]').click();await page.getByRole('link',{name:'4. Entrega',exact:true}).click();
  assert.equal(await page.locator('#modelo-organizacao').inputValue(),'Organização fictícia <&>');assert.equal(await page.locator('#modelo-elaborador').inputValue(),'Pessoa fictícia');
  // O envio capturou os dados; voltar à página durante a geração não deve habilitar um segundo envio.
  let liberar;const espera=new Promise(resolve=>{liberar=resolve;});let capturou;const capturado=new Promise(resolve=>{capturou=resolve;});
  await page.route('**/modelos/PCMD-01-Controle-Documental.xlsx',async route=>{capturou();await espera;await route.continue();});
  const downloadPronto=page.waitForEvent('download');await page.locator('#baixar-modelos-refeitos').click();await capturado;
  await page.locator('.atalhos a[href="#modelos"]').click();await page.getByRole('link',{name:'4. Entrega',exact:true}).click();assert.equal(await page.locator('#baixar-modelos-refeitos').isDisabled(),true);liberar();
  const download=await downloadPronto;const caminho=new URL('essencial.zip',pasta);await download.saveAs(fileURLToPath(caminho));const essential=await JSZip.loadAsync(await readFile(caminho));
  const documentos=Object.keys(essential.files).filter(n=>/\.(xlsx|docx)$/.test(n));assert.equal(documentos.length,5);assert.ok(documentos.every(n=>n.startsWith('preenchidos/')));assert.match(await essential.file('LEIA-ME.txt').async('string'),/5 documentos selecionados/);
  await page.locator('#apos-gerar').waitFor({state:'visible'});assert.equal(await page.locator('#baixar-modelos-refeitos').isEnabled(),true);
  await page.reload();await page.locator('#pacote-refeito').waitFor();assert.equal(await page.locator('#modelo-organizacao').inputValue(),'');assert.equal(await page.locator('#modelo-elaborador').inputValue(),'');
  await page.evaluate(async()=>{const {estado}=await import('/src/estado.js');estado.equipamentos=[];const {telaEntrega}=await import('/src/telas/entrega.js');telaEntrega(document.querySelector('main'));});
  assert.equal(await page.locator('#baixar-modelos-refeitos').isDisabled(),true);assert.match(await page.locator('#bloqueio-documentos').textContent(),/Cadastre ao menos/);
  assert.ok(await page.evaluate(()=>{const a=document.querySelector('#bloqueio-documentos').getBoundingClientRect(),b=document.querySelector('#baixar-modelos-refeitos').getBoundingClientRect();return b.top-a.bottom<70;}),'Motivo do bloqueio deve estar junto do botão');
  await page.locator('[name="pacote"][value="personalizado"]').check();while(await page.locator('[name="documento"]:checked').count())await page.locator('[name="documento"]:checked').first().uncheck();
  assert.equal(await page.locator('#baixar-modelos-refeitos').isDisabled(),true);assert.match(await page.locator('#bloqueio-documentos').textContent(),/Selecione pelo menos/);
  await page.locator('[name="documento"][value="PCMD-K04"]').check();assert.equal(await page.locator('#identificacao-emissao').isVisible(),false);assert.equal(await page.locator('#baixar-modelos-refeitos').isEnabled(),true);
  const [manual]=await Promise.all([page.waitForEvent('download'),page.locator('#baixar-modelos-refeitos').click()]);const manualPath=new URL('manual.zip',pasta);await manual.saveAs(fileURLToPath(manualPath));const manualZip=await JSZip.loadAsync(await readFile(manualPath));const item=Object.keys(manualZip.files).filter(n=>n.endsWith('.xlsx'));assert.equal(item.length,1);assert.ok(item[0].startsWith('preenchimento-manual/'));assert.deepEqual(await manualZip.file(item[0]).async('nodebuffer'),await readFile(new URL('../public/modelos/'+item[0].split('/').at(-1),import.meta.url)));
  await page.reload();
  for(const width of [320,360,390,768,1366]){
    await page.setViewportSize({width,height:844});for(const route of ['entrega','revisao']){await page.goto('http://127.0.0.1:4196/#'+route);await page.locator('main h2').first().waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' excedeu '+width+'px');}
  }
  assert.deepEqual(erros,[]);await context.close();console.log('Entrega lean: seleção essencial/manual, ZIPs reais, bloqueios próximos, rascunho em memória, envio único entre telas, atalhos e larguras de 320 a 1366px aprovados.');
}});
