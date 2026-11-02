import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import { iniciarServidor, executarComRecursos, aguardarOffline } from './navegador.mjs';
const {chromium}=await import(process.env.PCM_PLAYWRIGHT||new URL('../ferramentas/navegador/node_modules/playwright/index.mjs',import.meta.url).href);
await executarComRecursos({
  criarServidor:()=>iniciarServidor({raiz:fileURLToPath(new URL('../',import.meta.url)),porta:4202}),
  criarNavegador:()=>chromium.launch({executablePath:process.env.PCM_CHROMIUM||undefined,args:process.env.PCM_SEM_SANDBOX==='1'?['--no-sandbox']:[]}),
  executar:async({navegador})=>{
    const contexto=await navegador.newContext({viewport:{width:390,height:844}});
    const externas=[];await contexto.route('**/*',r=>{if(new URL(r.request().url()).hostname==='127.0.0.1')return r.continue();externas.push(r.request().url());return r.abort();});
    const p=await contexto.newPage();const erros=[];p.on('pageerror',e=>erros.push(e.message));
    const ir=async rota=>{await p.goto('http://127.0.0.1:4202/#'+rota);await p.locator('#conteudo h2').first().waitFor();};
    const navegar=async rota=>{await p.evaluate(rota=>{location.hash=rota;},rota);await p.waitForFunction(rota=>document.body.dataset.tela===rota,rota);};
    await ir('contribuir');assert.equal(await p.getByRole('link',{name:'Relatar um erro',exact:true}).getAttribute('href'),'https://github.com/td9251156-creator/pcm-direto/issues/new?template=1-relatar-erro.yml');
    assert.ok((await p.locator('#conteudo').innerText()).includes('Ferramentas de IA são opcionais'));
    await p.getByRole('link',{name:'Responder sobre minha experiência'}).click();await p.locator('#form-feedback').waitFor();
    const dificuldade=p.locator('#feedback-dificuldade');const comentario=p.locator('#feedback-comentario');
    await p.locator('#copiar-feedback').click();assert.equal(await dificuldade.evaluate(e=>e===document.activeElement),true);
    await dificuldade.fill('Não entendi a ação & revisão? #1 + 2');await comentario.fill('<img src=x onerror=alert(1)> Exemplo fictício.');
    await p.locator('#feedback-apoio').selectOption('Nenhum');
    await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Indisponível no teste');}}}));
    await p.locator('#copiar-feedback').click();assert.equal(await p.locator('#texto-feedback').evaluate(e=>e===document.activeElement),true);
    assert.ok((await p.locator('#texto-feedback').inputValue()).includes('<img src=x'));assert.equal(await p.locator('#conteudo img').count(),0);
    assert.match(await p.locator('#status-feedback').innerText(),/Selecione e copie/);assert.deepEqual(externas,[],'Nada foi enviado ao preencher ou copiar');
    await navegar('apoio');await navegar('feedback');assert.equal(await dificuldade.inputValue(),'Não entendi a ação & revisão? #1 + 2');assert.equal(await p.locator('#feedback-apoio').inputValue(),'Nenhum');
    const [curta]=await Promise.all([p.waitForEvent('popup'),p.locator('#abrir-feedback-github').click()]);
    await p.waitForFunction(()=>document.querySelector('#abrir-feedback-github').href.includes('dificuldade='));
    const curtaUrl=new URL(await p.locator('#abrir-feedback-github').getAttribute('href'));assert.equal(curtaUrl.searchParams.get('dificuldade'),'Não entendi a ação & revisão? #1 + 2');assert.equal(curtaUrl.searchParams.get('comentario'),'<img src=x onerror=alert(1)> Exemplo fictício.');await curta.close();
    await dificuldade.fill('á'.repeat(500));await p.locator('#feedback-faltou').fill('ç'.repeat(500));await comentario.fill('x'.repeat(500));
    assert.equal(new URL(await p.locator('#abrir-feedback-github').getAttribute('href')).searchParams.size,1,'Editar invalida o link e elimina respostas antigas');
    const [longa]=await Promise.all([p.waitForEvent('popup'),p.locator('#abrir-feedback-github').click()]);
    assert.equal(new URL(await p.locator('#abrir-feedback-github').getAttribute('href')).searchParams.size,1);assert.ok((await p.locator('#texto-feedback').inputValue()).includes('á'.repeat(500)));assert.match(await p.locator('#status-feedback').innerText(),/sem preenchimento/);await longa.close();
    for(const width of [320,390,820,1280]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
    await aguardarOffline(p);await contexto.setOffline(true);await p.reload();await dificuldade.waitFor();assert.equal(await dificuldade.inputValue(),'','Recarregar descarta o questionário');
    await navegar('contribuir');assert.ok(await p.getByRole('link',{name:'Responder sobre minha experiência'}).isVisible());
    await navegar('mais');await p.locator('#buscar-ferramentas').fill('contribuir');assert.equal(await p.locator('#ferramentas a[href="#contribuir"]').count(),1);
    await navegar('entrega');assert.equal(await p.getByRole('link',{name:'Como foi sua experiência?',exact:true}).count(),1);
    assert.equal(await p.locator('footer a[href="#contribuir"]').count(),1);
    await navegar('feedback');await mkdir('artifacts',{recursive:true});await p.setViewportSize({width:390,height:844});await p.screenshot({path:'artifacts/feedback-390.png',fullPage:true});
    assert.deepEqual(erros,[]);await contexto.close();
    console.log('Contribuição e feedback: acessos, validação, rascunho em memória, cópia manual, URLs curtas/longas, texto escapado, celular e abertura offline aprovados. Nenhuma issue publicada.');
  },
});
