// Fluxo real da entrada por necessidade, sem contas ou conteúdo operacional real.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iniciarServidor, executarComRecursos, aguardarOffline } from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
await executarComRecursos({
  criarServidor:()=>iniciarServidor({raiz:fileURLToPath(new URL('../',import.meta.url)),porta:4201}),
  criarNavegador:()=>chromium.launch({executablePath:process.env.PCM_CHROMIUM||undefined,args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),
  executar:async({navegador})=>{
    const contexto=await navegador.newContext({viewport:{width:390,height:844},acceptDownloads:true});
    await contexto.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
    const p=await contexto.newPage();const erros=[];p.on('pageerror',e=>erros.push(e.message));
    const ir=async rota=>{await p.goto('http://127.0.0.1:4201/app.html#'+rota);await p.locator('#conteudo h2').first().waitFor();};
    const lista=p.locator('#banco-modelos article');
    await ir('comunidade');await lista.first().waitFor();assert.equal(await lista.count(),3);
    const ids=()=>lista.locator('h4').evaluateAll(es=>es.map(e=>e.id));
    for(const [caminho,codigos] of [['semana',['003','002','004']],['os',['004','003','006']],['falhas',['008','009','011']],['plano',['002','005','016']]]){
      const b=p.locator(`[data-caminho="${caminho}"]`);await b.focus();await b.press('Enter');
      assert.deepEqual(await ids(),codigos.map(c=>'modelo-PCM-MAN-'+c));
      assert.equal(await b.evaluate(e=>getComputedStyle(e).outlineColor),'rgb(184, 86, 0)','O foco se distingue da seleção');
    }
    await ir('apoio');await ir('comunidade');assert.equal(await p.locator('[data-caminho=plano]').getAttribute('aria-pressed'),'true');
    await p.reload();await lista.first().waitFor();assert.equal(await p.locator('[data-caminho=os]').getAttribute('aria-pressed'),'true');
    await p.locator('#buscar-modelos').fill('estoque peças');assert.deepEqual(await ids(),['modelo-PCM-MAN-010']);
    await p.locator('#buscar-modelos').fill('');assert.equal(await lista.count(),3);
    await p.locator('#ver-todos-modelos').click();assert.equal(await lista.count(),19);
    assert.equal(await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return new Set(ids).size===ids.length;}),true);
    const orientacao=p.getByRole('button',{name:'Como usar Controle documental',exact:true});
    await orientacao.focus();await orientacao.press('Enter');const dialogo=p.getByRole('dialog');await dialogo.waitFor();
    for(let i=0;i<5;i++){await p.keyboard.press('Tab');assert.equal(await dialogo.evaluate(d=>d.contains(document.activeElement)),true);}
    await p.keyboard.press('Escape');assert.equal(await orientacao.evaluate(e=>e===document.activeElement),true);
    for(const width of [320,390,820,1280]){
      await p.setViewportSize({width,height:900});await p.locator('[data-caminho=os]').click();
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if(width===390)assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<5500),'Abertura abaixo de 5.500 px');
      await p.getByRole('button',{name:'Como usar Ordens de serviço',exact:true}).click();
      assert.equal(await dialogo.evaluate(d=>d.scrollWidth<=d.clientWidth),true);await p.keyboard.press('Escape');
    }
    await p.locator('#categoria-maquinas').click();assert.equal(await lista.count(),JSON.parse(await readFile(new URL('../src/dados/biblioteca.json',import.meta.url),'utf8')).tipos.length);
    await p.locator('#buscar-modelos').fill('motor');await p.locator('.previa-tarefas summary').first().click();assert.ok(await p.locator('.previa-tarefas').first().locator('li').count()>0);
    await p.locator('[data-caminho=os]').click();await aguardarOffline(p);await contexto.setOffline(true);
    await p.reload();await lista.first().waitFor();await p.getByRole('button',{name:'Como usar Ordens de serviço',exact:true}).click();
    const [download]=await Promise.all([p.waitForEvent('download'),dialogo.getByRole('link').click()]);
    assert.deepEqual(await readFile(await download.path()),await readFile('public/modelos/biblioteca-v2/PCM-MAN-004_Ordens-de-Servico_R00.xlsx'));
    await p.keyboard.press('Escape');await contexto.setOffline(false);
    const biblioteca=JSON.parse(await readFile('src/dados/biblioteca.json','utf8'));
    const backup={aplicativo:'PCM Direto',versao:1,biblioteca,rascunho:{equipamentos:[{id:'ficticio',setor:'TST',tipo:'motor_eletrico',numero:1,tag:'TST-MOT-001',descricao:'Motor fictício',fabricante:'',modelo:''}],ajustes:{},execucoes:{},exemplo:false,inicio:'2026-11-02',capacidade:{}}};
    await ir('dados');await p.locator('#restaurar-backup').setInputFiles({name:'exemplo-ficticio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await p.locator('#confirmar-backup').click();await p.waitForURL('**/app.html#semana');
    await ir('comunidade');assert.equal(await p.getByRole('link',{name:'Continuar configuração',exact:true}).getAttribute('href'),'#assistente');
    const antes=await p.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('pcm-direto:base:v3',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const q=db.transaction('base').objectStore('base').get('principal');q.onsuccess=()=>{db.close();resolve(q.result);};};}));
    await p.locator('[data-demonstrar]').click();await p.locator('#sair-demo').waitFor();await ir('comunidade');
    await p.locator('[data-sair-exemplo]').click();assert.equal(await p.locator('[data-demonstrar]').count(),1);
    const depois=await p.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('pcm-direto:base:v3',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result;const q=db.transaction('base').objectStore('base').get('principal');q.onsuccess=()=>{db.close();resolve(q.result);};};}));
    assert.deepEqual(depois,antes,'A demonstração não grava na base de trabalho');
    // A abertura do exemplo pode esperar uma etapa do assistente; navegar cancela essa abertura.
    for(const destino of ['cadastros','assistente']){
      await ir('assistente');await p.locator('#org-nome').fill('Organização fictícia');
      await p.evaluate(()=>{const prototipo=IDBTransaction.prototype;const original=Object.getOwnPropertyDescriptor(prototipo,'oncomplete');Object.defineProperty(prototipo,'oncomplete',{...original,set(callback){if(this.mode==='readwrite'){Object.defineProperty(prototipo,'oncomplete',original);original.set.call(this,event=>setTimeout(()=>callback.call(this,event),600));}else original.set.call(this,callback);}});});
      await p.locator('#proximo').click();
      await p.evaluate(()=>{location.hash='comunidade';});await p.locator('[data-demonstrar]').waitFor();await p.locator('[data-demonstrar]').click();
      await p.evaluate(destino=>{location.hash=destino;},destino);
      if(destino==='cadastros'){
        await p.locator('#g-nome').waitFor();assert.equal(await p.locator('#g-nome').inputValue(),'Organização fictícia');
        await p.locator('#g-nome').fill('Organização conferida');await p.locator('#salvar-organizacao').click();
        await p.waitForFunction(()=>document.querySelector('#mensagens').textContent.includes('guardados'));
      }else{
        await p.locator('#anterior').waitFor();await p.locator('#anterior').click();await p.locator('#org-nome').waitFor();
        await p.locator('#org-nome').fill('Organização novamente');await p.locator('#proximo').click();await p.locator('#passo-assistente .equip').first().waitFor();
      }
      await p.reload();await p.locator('#conteudo h2').first().waitFor();assert.equal(await p.locator('.aviso-demo').count(),0);
      // Volta ao primeiro passo para repetir o cenário sem reaproveitar um passo avançado.
      await ir('assistente');if(await p.locator('#org-nome').count()===0){await p.locator('#anterior').click();await p.locator('#org-nome').waitFor();}
    }
    await mkdir('artifacts',{recursive:true});await p.setViewportSize({width:390,height:844});await p.screenshot({path:'artifacts/comunidade-necessidade-390.png',fullPage:true});
    assert.deepEqual(erros,[]);await contexto.close();
    console.log('Entrada: caminhos, 19 modelos, busca, diálogo/teclado, memória da sessão, celular, download original offline e demonstração isolada aprovados.');
  },
});
