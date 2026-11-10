// Plano Mestre: base fictícia de nove ativos, filtros combinados e teclado.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { executarComRecursos } from './navegador.mjs';
import { EXEMPLO } from '../src/dados/exemplo.js';
import { atribuirTags } from '../src/logica/tag.js';
import { gerarPlano } from '../src/logica/plano.js';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const biblioteca = JSON.parse(await readFile(new URL('../src/dados/biblioteca.json', import.meta.url), 'utf8'));
const equipamentos = atribuirTags(EXEMPLO.map((e, i) => ({ ...e, id: `eq${i}` })), Object.fromEntries(biblioteca.tipos.map(t => [t.id, t.sigla])));
const plano = gerarPlano(equipamentos, biblioteca).filter(l => l.ativa);
const backup = { aplicativo: 'PCM Direto', versao: 1, biblioteca, rascunho: { equipamentos, ajustes: {}, execucoes: {}, exemplo: false, inicio: '2026-11-01', capacidade: {} } };
await executarComRecursos({
  criarServidor: async () => { const s = await createServer({ server: { host: '127.0.0.1', port: 4205, strictPort: true } }); await s.listen(); return s; },
  criarNavegador: () => chromium.launch({ executablePath: process.env.PCM_CHROMIUM || undefined, args: process.env.PCM_SEM_SANDBOX === '1' ? ['--no-sandbox'] : [] }),
  executar: async ({ navegador }) => {
    const c = await navegador.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    await c.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    const p = await c.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message));
    const ir = async rota => { await p.goto(`http://127.0.0.1:4205/app.html#${rota}`); await p.locator('#conteudo h2').waitFor(); };
    await ir('plano');
    assert.equal(await p.locator('#lista-plano details').count(), 0);
    assert.match(await p.locator('#lista-plano').innerText(), /Nenhuma tarefa ativa/);
    await ir('dados');
    await p.locator('#restaurar-backup').setInputFiles({ name: 'exemplo-antigo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await p.locator('#confirmar-backup').click(); await p.waitForURL('**/app.html#semana');
    await ir('cadastros');
    await p.locator('#g-pessoa-nome').fill('Pessoa fictícia');
    await p.locator('#g-funcao').fill('Manutenção');
    await p.locator('#g-especialidade').fill('Elétrica');
    await p.locator('#salvar-pessoa').click();
    await p.getByRole('button', { name: 'Editar Pessoa fictícia', exact: true }).waitFor();
    await ir('plano');
    assert.equal(await p.locator('#lista-plano details').count(), 9);
    assert.equal(await p.locator('#lista-plano details[open]').count(), 0);
    assert.equal(await p.locator('#lista-plano tbody tr').count(), plano.length);
    await p.locator('#busca-plano').fill('UTL eletrica');
    const encontradas=p.locator('#lista-plano tbody tr');assert.ok(await encontradas.count()>0,'Busca sem acento e por termos separados');
    for(const texto of await encontradas.allTextContents()){
      const normal=texto.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();assert.ok(normal.includes('utl')&&normal.includes('eletrica'));
    }
    await p.locator('#busca-plano').fill('');
    async function atrasar(){
      await p.evaluate(()=>new Promise(resolve=>{
        sessionStorage.removeItem('liberar-plano');const r=indexedDB.open('pcm-direto:base:v3',1);
        r.onsuccess=()=>{const db=r.result,tx=db.transaction('base','readwrite'),s=tx.objectStore('base');
          const manter=()=>{const q=s.get('principal');q.onsuccess=()=>{if(!sessionStorage.getItem('liberar-plano'))manter();};};
          tx.oncomplete=()=>db.close();manter();resolve();};
      }));
    }
    const liberar=()=>p.evaluate(()=>sessionStorage.setItem('liberar-plano','1'));
    const persistido=()=>p.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('pcm-direto:base:v3',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('base'),q=tx.objectStore('base').get('principal');tx.oncomplete=()=>{db.close();resolve(q.result);};};}));
    async function conferirGravacao(){
      await p.locator('#busca-plano').fill('');
      const abrirPrimeiro=async()=>{const d=p.locator('#lista-plano details').first();if(await d.getAttribute('open')===null)await d.locator('summary').press('Enter');};
      await abrirPrimeiro();let campo=p.locator('#lista-plano select').first();
      const chave=await campo.getAttribute('data-chave');const opcao=await campo.locator('option').last().getAttribute('value');
      const valor=await campo.inputValue()===opcao?'':opcao;
      await atrasar();await campo.focus();await campo.selectOption(valor);
      await p.locator('#busca-plano').fill('UTL');await liberar();const salvo=await persistido();
      assert.equal(salvo.dados.rascunho.gestao.responsaveis[chave],valor);
      assert.equal(await p.locator('#busca-plano').evaluate(e=>e===document.activeElement),true,'Conclusão da gravação não rouba foco da busca');
      await p.locator('#busca-plano').fill('');await abrirPrimeiro();campo=p.locator('#lista-plano select').first();
      const outro=await campo.inputValue()===opcao?'':opcao;
      await atrasar();await campo.selectOption(outro);
      assert.equal(await p.locator('#lista-plano').getAttribute('aria-busy'),'true');assert.equal(await p.locator('#lista-plano select:enabled').count(),0);
      await p.evaluate(()=>{location.hash='apoio';});await p.locator('#buscar-apoio').waitFor();
      await p.evaluate(()=>{location.hash='plano';});await p.locator('#busca-plano').waitFor();await abrirPrimeiro();await p.locator('#busca-plano').fill('UTL');
      await liberar();assert.equal((await persistido()).dados.rascunho.gestao.responsaveis[chave],outro);
      assert.equal(await p.locator('#busca-plano').evaluate(e=>e===document.activeElement),true,'Resposta da montagem anterior não foca controle da tela nova');
      await p.locator('#limpar-plano').click();await abrirPrimeiro();
      const antes=await persistido();campo=p.locator('#lista-plano select').first();
      await p.evaluate(()=>{const put=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){this.transaction.abort();throw new DOMException('Quota fictícia','QuotaExceededError');};window.restaurarPutPlano=()=>{IDBObjectStore.prototype.put=put;};});
      await campo.selectOption(await campo.inputValue()===opcao?'':opcao);
      await p.locator('#mensagens').filter({hasText:'baixe um backup'}).waitFor();assert.deepEqual(await persistido(),antes,'Quota preserva cópia persistida');
      assert.equal(await p.locator('#lista-plano select:disabled').count(),0);await p.evaluate(()=>window.restaurarPutPlano());
    }
    const baseAntesDosFiltros=await persistido();
    await mkdir('artifacts', { recursive: true });
    for (const width of [320, 390, 820, 1280]) {
      await p.setViewportSize({ width, height: 844 });
      const medidas = await p.evaluate(() => ({ altura: document.documentElement.scrollHeight, largura: document.documentElement.scrollWidth }));
      assert.ok(medidas.largura <= width, 'Sem rolagem horizontal');
      if (width === 390) assert.ok(medidas.altura < 6000, `Altura de ${medidas.altura} px abaixo de 6.000 px`);
      console.log(`Plano Mestre: nove ativos em ${width} px, altura ${medidas.altura} px.`);
      await p.screenshot({ path: `artifacts/plano-ativos-${width}.png`, fullPage: true });
      const resumo = p.locator('#lista-plano summary').first();
      await resumo.focus(); await resumo.press('Enter');
      assert.equal(await p.locator('#lista-plano details').first().getAttribute('open'), '');
      const sessao = await c.newCDPSession(p);
      const arvore = await sessao.send('Accessibility.getFullAXTree');
      const expansivel = arvore.nodes.find(n => n.role?.value === 'DisclosureTriangle' && n.name?.value.includes(equipamentos[0].tag));
      assert.ok(expansivel, 'Ativo identificado como seção expansível na árvore de acessibilidade');
      assert.equal(expansivel.properties.find(x => x.name === 'expanded')?.value.value, true);
      await sessao.detach();
      assert.equal(await resumo.evaluate(e => getComputedStyle(e).outlineStyle), 'solid', 'Foco visível pelo teclado');
      const responsavel = p.locator('#lista-plano select').first();
      assert.ok((await responsavel.getAttribute('id')).startsWith('resp-'));
      await resumo.press('Tab');
      assert.equal(await responsavel.evaluate(e => document.activeElement === e), true);
      await resumo.focus(); await resumo.press('Space');
      assert.equal(await p.locator('#lista-plano details[open]').count(), 0);
    }
    await p.setViewportSize({ width: 390, height: 844 });
    const especialidade = plano.find(l => l.equipamentoId === 'eq0').especialidade;
    await p.getByLabel('Setor', { exact: true }).selectOption('UTL');
    await p.getByLabel('Especialidade', { exact: true }).selectOption(especialidade);
    await p.getByLabel('Só tarefas sem responsável').check();
    await p.locator('#busca-plano').fill(equipamentos[0].tag);
    const esperado = plano.filter(l => l.equipamentoId === 'eq0' && l.especialidade === especialidade);
    assert.equal(await p.locator('#lista-plano tbody tr').count(), esperado.length, 'Quatro filtros combinados');
    assert.equal(await p.locator('#lista-plano details').count(), 1);
    await p.locator('#lista-plano summary').press('Enter');
    const primeiro = p.locator('#lista-plano select').first(); const id = await primeiro.getAttribute('id');
    const opcao = await primeiro.locator('option').last().getAttribute('value');
    assert.deepEqual(await persistido(),baseAntesDosFiltros,'Filtros não alteram a base persistida');
    await primeiro.focus(); await primeiro.selectOption(opcao);
    await p.waitForFunction(id => !document.getElementById(id), id);
    assert.equal(await p.locator('#sem-responsavel-plano').evaluate(e => document.activeElement === e), true, 'Foco preservado ao sair do filtro');
    assert.equal(await p.locator('#lista-plano tbody tr').count(), esperado.length - 1);
    await p.getByLabel('Só tarefas sem responsável').uncheck();
    assert.equal(await p.locator(`#${id}`).inputValue(), opcao);
    if(await p.locator('#lista-plano details').first().getAttribute('open')===null)await p.locator('#lista-plano summary').press('Enter');
    const campo = p.locator(`#${id}`); await campo.focus(); await campo.selectOption('');
    await p.waitForFunction(id => document.activeElement?.id === id, id);
    assert.equal(await p.locator('#lista-plano details[open]').count(), 1, 'Salvar mantém ativo aberto');
    await p.locator('#busca-plano').fill(equipamentos[0].tag+' '+plano.find(l=>l.equipamentoId==='eq0').tarefaId);
    await p.getByLabel('Só tarefas sem responsável').check();assert.equal(await p.locator('#lista-plano tbody tr').count(),1);
    await p.locator('#lista-plano select').selectOption(opcao);await p.waitForFunction(()=>document.querySelectorAll('#lista-plano details').length===0);
    assert.equal(await p.locator('#sem-responsavel-plano').evaluate(e=>e===document.activeElement),true,'Último resultado removido retorna foco ao filtro');
    await p.locator('#busca-plano').fill('inexistente');
    assert.equal(await p.locator('#lista-plano details').count(), 0);
    assert.match(await p.locator('#lista-plano').innerText(), /Altere a busca/);
    await p.locator('#limpar-plano').click();
    assert.equal(await p.locator('#busca-plano').evaluate(e=>e===document.activeElement),true);
    assert.equal(await p.getByLabel('Só tarefas sem responsável').isChecked(),false);
    assert.equal(await p.locator('#lista-plano tbody tr').count(), plano.length);
    assert.equal(await p.locator('#lista-plano .selo-seguranca').count(), plano.filter(l => l.seguranca).length, 'Segurança permanece no plano');
    await p.reload(); await p.locator('#lista-plano summary').first().waitFor();
    assert.equal(await p.locator('#lista-plano details[open]').count(), 0, 'Reabertura começa recolhida');
    await conferirGravacao();
    assert.deepEqual(erros, []); await c.close();
    const grandes=atribuirTags(Array.from({length:100},(_,i)=>({...EXEMPLO[i%EXEMPLO.length],id:'volume'+i,numero:i+1,tag:''})),Object.fromEntries(biblioteca.tipos.map(t=>[t.id,t.sigla])));
    const volume=await navegador.newContext({serviceWorkers:'block',viewport:{width:320,height:900}});const q=await volume.newPage();
    await volume.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
    await q.goto('http://127.0.0.1:4205/app.html#dados');await q.locator('#restaurar-backup').setInputFiles({name:'cem-ativos-ficticios.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({...backup,rascunho:{...backup.rascunho,equipamentos:grandes}}))});
    await q.locator('#confirmar-backup').click();await q.waitForURL('**/app.html#semana');await q.goto('http://127.0.0.1:4205/app.html#plano');
    await q.locator('#lista-plano summary').first().waitFor();assert.equal(await q.locator('#lista-plano details').count(),100);assert.equal(await q.locator('#lista-plano details[open]').count(),0);
    assert.equal(await q.locator('#lista-plano tbody tr').count(),gerarPlano(grandes,biblioteca).filter(l=>l.ativa).length);
    await q.locator('#busca-plano').fill(grandes[0].tag);assert.equal(await q.locator('#lista-plano details').count(),1);assert.ok(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await volume.close();
    console.log('Plano Mestre: filtros combinados, responsável, foco, teclado, rótulos e segurança aprovados. Leitor de tela real requer conferência manual.');
  },
});
