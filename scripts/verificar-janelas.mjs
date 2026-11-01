// Tela Janelas de parada no navegador: sem revisão ativa avisa; acrescenta e remove janela gravando na base; celular.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { executarComRecursos } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const origem = 'http://127.0.0.1:4198';

await executarComRecursos({ limiteTotal: 180000,
  criarServidor: async () => { const s = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), logLevel: 'silent', server: { host: '127.0.0.1', port: 4198, strictPort: true } }); await s.listen(); return s; },
  criarNavegador: () => chromium.launch(),
  executar: async ({ navegador }) => {
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const p = await contexto.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(e.message)); await p.route('https://**/*', (r) => r.abort());
    await p.goto(`${origem}/#mais`); await p.locator('#buscar-ferramentas').waitFor();
    assert.equal(await p.locator('#ferramentas a[href="#janelas"]').count(), 1);
    await p.goto(`${origem}/#janelas`); await p.locator('#form-janela').waitFor();
    assert.match(await p.locator('main').innerText(), /Ative uma revisão do plano/);
    assert.match(await p.locator('main').innerText(), /nunca é adiada/);
    const futura = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    await p.locator('#g-janela-data').fill(futura); await p.locator('#g-janela-horas').fill('8'); await p.locator('#g-janela-descricao').fill('Parada fictícia');
    await p.locator('#salvar-janela').click(); await p.locator('.janela').first().waitFor();
    const base = () => p.evaluate(async () => (await import('/src/estado.js')).estado.gestao);
    const g = await base(); assert.equal(g.janelasParada.length, 1); assert.equal(g.janelasParada[0].horas, 8); assert.ok(g.versao >= 2);
    assert.match(await p.locator('.janela').innerText(), /Ocupação sugerida: 0 de 8 h/);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolagem lateral em 390 px');
    await p.locator('[data-remover-janela]').click(); await p.locator('.janela').waitFor({ state: 'detached' });
    assert.equal((await base()).janelasParada.length, 0);
    assert.deepEqual(erros, []); await contexto.close();
    console.log('Janelas de parada: menu, aviso sem revisão, regra exibida, acrescentar/remover com gravação e celular aprovados.');
  } });
