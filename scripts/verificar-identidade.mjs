import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {createServer} from 'vite';
import {executarComRecursos} from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
await executarComRecursos({
  criarServidor:async()=>{const s=await createServer({server:{host:'127.0.0.1',port:4198,strictPort:true}});await s.listen();return s;},
  criarNavegador:()=>chromium.launch(),
  executar:async({navegador})=>{
    const c=await navegador.newContext({serviceWorkers:'block',viewport:{width:1280,height:900}});
    const p=await c.newPage();const erros=[];p.on('pageerror',e=>erros.push(e.message));
    await p.goto('http://127.0.0.1:4198/#cadastros');await p.locator('#conteudo h2').waitFor();
    assert.equal(await p.locator('.etapas a[aria-current="page"]').getAttribute('href'),'#planejar','Subtela mantém a localização no menu');
    const foco=p.locator('.etapas a[href="#planejar"]');await foco.focus();
    assert.equal(await foco.evaluate(e=>getComputedStyle(e).outlineColor),'rgb(184, 86, 0)','Foco contrasta com o menu claro');
    await p.goto('http://127.0.0.1:4198/#mais');const busca=p.locator('#buscar-ferramentas');await busca.fill('backup');
    await p.evaluate(()=>{location.hash='apoio';});await p.locator('#conteudo h2').waitFor();
    await p.evaluate(()=>{location.hash='mais';});await busca.waitFor();assert.equal(await busca.inputValue(),'backup','Busca permanece ao navegar');
    await busca.fill('zzzinexistente');await p.getByRole('button',{name:'Limpar busca'}).click();assert.equal(await busca.inputValue(),'');assert.equal(await busca.evaluate(e=>e===document.activeElement),true);
    await busca.evaluate(e=>e.setAttribute('aria-invalid','true'));assert.equal(await busca.evaluate(e=>getComputedStyle(e).borderTopColor),'rgb(179, 38, 30)');await busca.evaluate(e=>e.removeAttribute('aria-invalid'));
    await busca.evaluate(e=>{e.readOnly=true;});assert.equal(await busca.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(236, 239, 243)');await busca.evaluate(e=>{e.readOnly=false;});
    await busca.fill('zzzinexistente');const limpar=p.getByRole('button',{name:'Limpar busca'});await limpar.evaluate(e=>{e.disabled=true;});await limpar.hover();assert.equal(await limpar.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(236, 239, 243)');await limpar.evaluate(e=>{e.disabled=false;});await limpar.click();
    for(const width of [320,390,820,1024,1280]){
      await p.setViewportSize({width,height:900});
      assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Sem rolagem horizontal');
      const atual=p.locator('.etapas a[aria-current="page"]');assert.equal(await atual.isVisible(),true);assert.equal(await atual.getAttribute('href'),'#mais');
      await busca.fill('backup');
      const medidas=await busca.evaluate(e=>{const s=getComputedStyle(e);return {altura:e.getBoundingClientRect().height,fonte:s.fontSize,fundo:s.backgroundColor,raio:s.borderRadius};});
      assert.ok(medidas.altura>=48);assert.equal(medidas.fonte,'16px');assert.equal(medidas.fundo,'rgb(230, 238, 248)');assert.equal(medidas.raio,'4px');
    }
    await p.setViewportSize({width:1280,height:900});await p.evaluate(()=>{location.hash='plano';});await p.locator('#conteudo h2').waitFor();assert.equal(await p.locator('.etapas a[aria-current="page"]').getAttribute('href'),'#planejar');
    await p.setViewportSize({width:390,height:844});await p.waitForFunction(()=>document.querySelector('.etapas a[aria-current="page"]')?.getAttribute('href')==='#mais');assert.equal(await p.locator('.etapas a[aria-current="page"]').getAttribute('href'),'#mais');
    await mkdir('artifacts',{recursive:true});
    for(const width of [390,1280]){await p.setViewportSize({width,height:900});await p.goto('http://127.0.0.1:4198/#mais');await busca.waitFor();await busca.fill('');await p.screenshot({path:`artifacts/identidade-figma-${width}.png`,fullPage:true});}
    assert.deepEqual(erros,[]);await c.close();
    console.log('Identidade: localização em subtelas, foco contrastante, busca preservada, limpar com foco e componentes responsivos aprovados.');
  },
});
