import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { executarComRecursos } from './navegador.mjs';
import { criarGestao } from '../src/logica/gestao.js';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const biblioteca = JSON.parse(await readFile(new URL('../src/dados/biblioteca.json', import.meta.url), 'utf8'));
const eq = { id: 'eq1', setor: 'UTL', tipo: 'motor_eletrico', descricao: 'Motor fictício', numero: 1, tag: 'UTL-MOT-001' };
const gestao = criarGestao();
gestao.falhas = [1,2,3].map(i => ({ id: `f${i}`, equipamentoId: 'eq1', tag: eq.tag, data: '2026-09-10', sintoma: 'Sintoma fictício', causa: '', acao: '', peca: '', responsavelId: '', horasParada: 2 })); // procedimento 017: HI vem das falhas (3 × 2 h)
const antigo = versao => ({ aplicativo: 'PCM Direto', versao, biblioteca, rascunho: { equipamentos: [eq], ajustes: {}, execucoes: {}, exemplo: false, inicio: '2026-01-05', capacidade: {}, ...(versao === 2 ? { gestao } : {}) } });
await executarComRecursos({
  criarServidor: async () => { const s = await createServer({ server: { host: '127.0.0.1', port: 4199, strictPort: true } }); await s.listen(); return s; },
  criarNavegador: () => chromium.launch({ executablePath: process.env.PCM_CHROMIUM || undefined }),
  executar: async ({ navegador }) => {
    const c = await navegador.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 1280, height: 900 } });
    await c.addInitScript(() => { const Original = Date; window.Date = class extends Original { constructor(...a) { super(...(a.length ? a : ['2026-10-27T12:00:00'])); } static now() { return new Original('2026-10-27T12:00:00').getTime(); } }; });
    const p = await c.newPage(); const erros = []; p.on('pageerror', e => erros.push(e.message));
    const ir = async r => { if (!p.url().startsWith('http://127.0.0.1:4199/')) await p.goto(`http://127.0.0.1:4199/#${r}`); else await p.evaluate(r => { location.hash = r; }, r); await p.locator('#conteudo h2').waitFor(); await p.waitForTimeout(100); };
    await ir('cadastros');
    const metas = p.locator('#form-metas');
    assert.equal(await metas.locator('a[href="#mensal"]').count(), 1, 'Metas orienta e dá acesso aos indicadores disponíveis');
    assert.equal(await metas.locator('#g-disponibilidade').inputValue(), '', 'Meta não definida continua vazia');
    await metas.locator('a[href="#mensal"]').click();
    await p.locator('#indicador-ativo').waitFor();
    await ir('apoio');
    for (const termo of ['Disponibilidade', 'MTBF', 'MTTR']) {
      await p.locator('#buscar-apoio').fill(termo);
      const definicao = await p.locator('dt').filter({ hasText: termo }).locator('xpath=following-sibling::dd[1]').innerText();
      assert.match(definicao, /Mensal/, `${termo} indica a tela onde consultar o cálculo`);
      assert.match(definicao, /mês fechado/, `${termo} informa o período disponível`);
      assert.doesNotMatch(definicao, /ainda não calcula|ainda não definidas/, 'Glossário acompanha a funcionalidade entregue');
    }
    const persistido = () => p.evaluate(() => new Promise((resolve, reject) => { const q = indexedDB.open('pcm-direto:base:v3', 1); q.onerror = () => reject(q.error); q.onsuccess = () => { const db = q.result; const t = db.transaction('base'); const r = t.objectStore('base').get('principal'); t.oncomplete = () => { db.close(); resolve(r.result.dados.rascunho); }; }; }));
    async function restaurar(b) { await ir('dados'); await p.locator('#restaurar-backup').setInputFiles({ name: 'ficticio.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(b)) }); await p.locator('#confirmar-backup').click(); await p.waitForURL('**/#semana'); }
    for (const versao of [1,2]) { await restaurar(antigo(versao)); assert.equal((await persistido()).gestao.versao, 1); }
    await ir('mensal'); await p.locator('#indicador-ativo').selectOption('eq1'); await p.locator('#indicador-mes').fill('2026-09');
    assert.match(await p.locator('#resultado-indicadores').innerText(), /Sem dado/);
    await p.locator('#indicador-planejadas').fill('720'); await p.locator('#indicador-parada').fill('6'); await p.locator('#salvar-indicadores').click();
    await p.waitForFunction(() => document.querySelector('#resultado-indicadores')?.textContent.includes('238'));
    assert.equal((await persistido()).gestao.indicadoresMensais[0].horasParada, 6); assert.equal((await persistido()).gestao.versao, 2);
    await p.locator('#indicador-mes').fill('2026-10'); await p.locator('#salvar-indicadores').click();
    assert.equal((await persistido()).gestao.indicadoresMensais.length, 1, 'Mês aberto não é gravado');
    await p.locator('#indicador-mes').fill('2026-09');
    for (const width of [320,1280]) { await p.setViewportSize({ width, height: 900 }); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await p.locator('#indicador-planejadas').focus(); await p.keyboard.press('Tab'); assert.equal(await p.evaluate(() => document.activeElement.id), 'indicador-parada'); await mkdir('artifacts', { recursive: true }); await p.screenshot({ path: `artifacts/indicadores-${width}.png`, fullPage: true }); }
    await ir('falhas');
    await p.locator('[data-editar-falha="f1"]').click(); await p.locator('#g-dataConclusao').fill('2026-09-01'); await p.locator('#salvar-falha').click();
    assert.equal((await persistido()).gestao.falhas[0].dataConclusao, undefined, 'Conclusão anterior à ocorrência recusada');
    for (const id of ['f1','f2','f3']) { await p.locator(`[data-editar-falha="${id}"]`).click(); await p.locator('#g-dataConclusao').fill('2026-09-20'); await p.locator('#g-horasReparo').fill('2'); await p.locator('#salvar-falha').click(); await p.locator(`[data-editar-falha="${id}"]`).waitFor(); await p.waitForFunction(() => document.querySelector('#salvar-falha')?.textContent === 'Registrar falha'); }
    assert.equal((await persistido()).gestao.falhas.length, 3);
    await ir('mensal'); await p.locator('#indicador-ativo').selectOption('eq1'); await p.locator('#indicador-mes').fill('2026-09');
    const resultado = await p.locator('#resultado-indicadores').innerText(); assert.match(resultado, /238/); assert.match(resultado, /99,17%/); assert.match(resultado, /MTTR\s+2 h/);
    const [arq011] = await Promise.all([p.waitForEvent('download'), p.locator('#gerar-011').click()]); assert.match(arq011.suggestedFilename(), /^PCM-MAN-011_.+_2026\.xlsx$/);
    await ir('dados'); const [d] = await Promise.all([p.waitForEvent('download'), p.locator('#baixar-backup').click()]); const b = JSON.parse(await readFile(await d.path(), 'utf8')); assert.equal(b.versao, 3); await restaurar(b); assert.deepEqual((await persistido()).gestao, b.rascunho.gestao);
    await ir('mensal'); await p.locator('#indicador-ativo').selectOption('eq1'); await p.locator('#indicador-mes').fill('2026-09');
    await p.evaluate(() => new Promise(resolve => { const q = indexedDB.open('pcm-direto:base:v3', 1); q.onsuccess = () => { const db = q.result; const t = db.transaction('base', 'readwrite'); const store = t.objectStore('base'); const manter = () => { const r = store.get('principal'); r.onsuccess = () => { if (!sessionStorage.getItem('liberar-indicadores')) manter(); }; }; t.oncomplete = () => db.close(); manter(); resolve(); }; }));
    await p.locator('#indicador-planejadas').fill('721');
    await p.locator('#salvar-indicadores').click(); assert.ok(await p.locator('#indicador-mes').isDisabled(), 'Seletores bloqueados durante gravação');
    await ir('falhas'); await p.evaluate(() => sessionStorage.setItem('liberar-indicadores', '1'));
    assert.equal((await persistido()).gestao.indicadoresMensais[0].horasPlanejadas, 721, 'Gravação pendente terminou após mudança de tela no mesmo documento');
    assert.equal(await p.locator('#form-falha').count(), 1, 'Resposta da gravação não substitui outra tela');
    await ir('mensal'); await p.locator('#indicador-ativo').selectOption('eq1'); await p.locator('#indicador-mes').fill('2026-09');
    await p.evaluate(() => { const original = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function(...args) { if (sessionStorage.getItem('quota-indicadores')) { this.transaction.abort(); throw new DOMException('Quota fictícia', 'QuotaExceededError'); } return original.apply(this, args); }; sessionStorage.setItem('quota-indicadores', '1'); });
    await p.locator('#indicador-parada').fill('7'); await p.locator('#salvar-indicadores').click();
    await p.getByText('Não foi possível guardar no aparelho. Baixe um backup antes de sair.', { exact: false }).first().waitFor();
    assert.equal(await p.locator('#indicador-parada').inputValue(), '7'); assert.equal((await persistido()).gestao.indicadoresMensais[0].horasParada, 6, 'Quota mantém original persistido');
    await ir('falhas'); await p.locator('[data-editar-falha="f1"]').click(); await p.locator('#g-horasReparo').fill('0'); await p.locator('#salvar-falha').click();
    await p.waitForFunction(async () => { const a = await import('/src/estado.js'); return a.estado.gestao.falhas[0].horasReparo === 0 && !document.querySelector('#salvar-falha').disabled; });
    assert.equal(await p.locator('#g-horasReparo').inputValue(), '0', 'Falha de gravação preserva formulário de reparo'); assert.equal((await persistido()).gestao.falhas[0].horasReparo, 2);
    await ir('dados'); const [recuperacao] = await Promise.all([p.waitForEvent('download'), p.locator('#baixar-backup').click()]);
    const sessao = JSON.parse(await readFile(await recuperacao.path(), 'utf8'));
    assert.equal(sessao.rascunho.gestao.falhas[0].horasReparo, 0, 'Backup recupera reparo aplicado somente na sessão');
    assert.equal(sessao.rascunho.gestao.indicadoresMensais[0].horasParada, 7, 'Backup recupera total aplicado somente na sessão');
    assert.deepEqual(erros, []); await c.close(); console.log('Indicadores: backups1/2/3, totais conferidos, reparos separados, persistência, 320/1280px e teclado aprovados.');
  },
});
