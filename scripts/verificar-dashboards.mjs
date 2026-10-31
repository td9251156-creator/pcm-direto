import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { executarComRecursos } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const URL_BASE = 'http://127.0.0.1:4199/';
await executarComRecursos({
  criarServidor: async () => { const s = await createServer({ server: { host: '127.0.0.1', port: 4199, strictPort: true } }); await s.listen(); return s; },
  criarNavegador: () => chromium.launch(process.env.PCM_CHROMIUM ? { executablePath: process.env.PCM_CHROMIUM } : {}),
  executar: async ({ navegador }) => {
    const c = await navegador.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
    const p = await c.newPage();
    const erros = [];
    p.on('pageerror', (e) => erros.push(e.message));
    await p.goto(`${URL_BASE}#dashboards`);
    await p.locator('.pd-cartao').first().waitFor();
    const valores = await p.locator('.pd-valor').allInnerTexts();
    assert.deepEqual(valores.slice(0, 3), ['85 OS', '81 OS', '238,5 h'], 'Controles da demonstração');
    assert.match(await p.locator('.pd-selo-demo').innerText(), /DEMONSTRAÇÃO/);
    assert.equal(await p.locator('.pd-grafico').count(), 2);
    assert.equal(await p.locator('.pd-acoes li').count() <= 3, true);

    // Filtros combinados atualizam a tela sem recarregar e podem ser limpos.
    const setor = (await p.locator('#pd-setor option').allInnerTexts())[1];
    await p.selectOption('#pd-setor', setor);
    await p.waitForFunction(() => document.querySelector('#pd-ativos').textContent.includes('Filtros ativos'));
    assert.notEqual((await p.locator('.pd-valor').first().innerText()), '85 OS');
    await p.getByRole('button', { name: 'Limpar filtros' }).click();
    assert.equal(await p.locator('.pd-valor').first().innerText(), '85 OS');

    // Abrir e fechar a tela várias vezes não duplica eventos nem deixa erros.
    for (let i = 0; i < 3; i++) {
      await p.evaluate(() => { location.hash = 'mais'; });
      await p.locator('#buscar-ferramentas').waitFor();
      await p.evaluate(() => { location.hash = 'dashboards'; });
      await p.locator('.pd-cartao').first().waitFor();
    }

    await p.locator('#pd-conteudo').evaluate((el) => new MutationObserver(() => { window.__muda = (window.__muda || 0) + 1; }).observe(el, { childList: true }));
    await p.selectOption('#pd-familia', { index: 1 });
    await p.waitForTimeout(200);
    const atualizacoes = await p.evaluate(() => window.__muda);
    assert.equal(atualizacoes, 1, 'Um filtro causa uma única atualização');
    await p.getByRole('button', { name: 'Limpar filtros' }).click();

    // Teclado: foco visível nos filtros e detalhes abrem com Enter.
    await p.locator('#pd-setor').focus();
    assert.equal(await p.locator('#pd-setor').evaluate((e) => getComputedStyle(e).outlineStyle !== 'none'), true);
    const resumo = p.locator('.pd-cartao summary').first();
    await resumo.focus();
    await p.keyboard.press('Enter');
    assert.equal(await p.locator('.pd-cartao details').first().evaluate((e) => e.open), true);

    await mkdir('artifacts', { recursive: true });
    for (const largura of [390, 820, 1280]) {
      await p.setViewportSize({ width: largura, height: 900 });
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Sem rolagem horizontal em ${largura}px`);
      await p.screenshot({ path: `artifacts/dashboard-manutencao-${largura}.png`, fullPage: true });
    }
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.getByRole('link', { name: 'Confiabilidade' }).click();
    await p.waitForFunction(() => document.querySelector('.pd-cartao h3')?.textContent === 'Falhas registradas');
    assert.equal(await p.locator('.pd-valor').first().innerText(), '124 falhas');
    assert.equal(await p.locator('.pd-valor').nth(3).innerText(), 'Definição pendente');
    await p.screenshot({ path: 'artifacts/dashboard-confiabilidade-1280.png', fullPage: true });
    await p.getByRole('link', { name: 'Custos' }).click();
    await p.waitForFunction(() => document.querySelector('.pd-cartao h3')?.textContent === 'Realizado');
    assert.deepEqual((await p.locator('.pd-valor').allInnerTexts()).map((t) => t.replace(/\s/g, ' ')), ['R$ 156.034', 'R$ 110.000', 'R$ 46.034', '141,9 %'].map((t) => t.replace(/\s/g, ' ')));
    assert.equal(await p.locator('#pd-familia').count(), 0, 'Custos não oferece filtro sem suporte');
    await p.screenshot({ path: 'artifacts/dashboard-custos-1280.png', fullPage: true });
    // Baixar HTML: mostra o conteúdo antes, baixa, e o arquivo abre sem rede e sem pedidos externos.
    await p.getByRole('button', { name: 'Baixar HTML' }).click();
    assert.match(await p.locator('dialog[open]').innerText(), /não se atualiza sozinho/);
    const [download] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Baixar arquivo' }).click()]);
    assert.equal(download.suggestedFilename(), 'PCM-Direto_Dashboards_DEMO.html');
    // A prévia para aprovação só é gravada fora do repositório quando pedida (PCM_PREVIA_DASHBOARDS=1).
    const destino = new URL(process.env.PCM_PREVIA_DASHBOARDS ? '../../outputs/dashboards-pcm-v2/PCM-Direto_Dashboards_DEMO.html' : '../artifacts/PCM-Direto_Dashboards_DEMO.html', import.meta.url);
    await mkdir(fileURLToPath(new URL('./', destino)), { recursive: true });
    await download.saveAs(fileURLToPath(destino));
    const c2 = await navegador.newContext({ offline: true, viewport: { width: 390, height: 900 } });
    const q = await c2.newPage();
    const externos = [];
    q.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) externos.push(r.url()); });
    await q.goto(destino.href);
    assert.equal(await q.locator('script').count(), 0, 'Sem scripts');
    assert.equal(await q.locator('.pd-cartao').count(), 12);
    assert.match(await q.locator('.pd-meta').innerText(), /Referência[\s\S]*29\/10\/2026[\s\S]*Exportado em/);
    assert.ok(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Arquivo sem rolagem horizontal no celular');
    assert.deepEqual(externos, []);
    await q.screenshot({ path: 'artifacts/dashboard-html-offline-390.png', fullPage: true });
    await c2.close();
    assert.deepEqual(erros, []);
    await c.close();
    console.log('Dashboards: controles, filtros, abrir/fechar, teclado e larguras 390–1280 px aprovados.');
  },
});
