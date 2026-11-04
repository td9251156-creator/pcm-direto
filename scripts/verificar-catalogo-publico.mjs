// Catálogo e páginas públicas: encontrar, entender e baixar sem abrir a base da fábrica.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { iniciarServidor, executarComRecursos, aguardarOffline } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const base = 'http://127.0.0.1:4223';
const manifesto = JSON.parse(await readFile('src/dados/biblioteca-pcm-v2.json', 'utf8'));
const conteudoWorker = await readFile('dist/sw.js', 'utf8');
const precache = JSON.parse(conteudoWorker.match(/^const ARQUIVOS = (.*);$/m)[1]);
assert.ok(precache.some(p => /^\.\/assets\/catalogo-.*\.js$/.test(p)), 'Filtro com nome versionado no cache do núcleo');
assert.ok(!precache.some(p => /^\.\/modelos\/(index\.html|pcm-man-)/.test(p)), 'Páginas editoriais fora do cache obrigatório');
await executarComRecursos({
  criarServidor: () => iniciarServidor({ raiz: process.cwd(), porta: 4223 }),
  criarNavegador: () => chromium.launch({ args: process.env.PCM_SEM_SANDBOX === '1' ? ['--no-sandbox'] : [] }),
  executar: async ({ navegador }) => {
    const c = await navegador.newContext({ serviceWorkers: 'block', acceptDownloads: true });
    // Reproduz o CSS comum retido por uma instalação anterior, sem estilos do catálogo.
    const estiloAnterior = (await readFile('public/portal.css', 'utf8')).split('/* Catálogo público')[0];
    await c.route('**/portal.css', r => r.fulfill({ contentType: 'text/css', body: estiloAnterior }));
    const p = await c.newPage();
    await p.goto(base + '/');
    await p.locator('header nav a[href="./modelos/"]').click();
    const lista = p.locator('#lista-modelos > li:visible');
    const codigos = () => lista.evaluateAll(itens => itens.map(i => i.dataset.modelo));
    await p.locator('[data-filtros]:visible').waitFor();
    assert.equal(await p.locator('link[rel="stylesheet"][href*="assets/"]').count(), 1, 'Estilos novos com nome versionado');
    assert.deepEqual(await codigos(), ['PCM-MAN-004', 'PCM-MAN-003', 'PCM-MAN-006']);
    const [download] = await Promise.all([p.waitForEvent('download'), lista.first().locator('a[download]').click()]);
    assert.deepEqual(await readFile(await download.path()), await readFile('public/modelos/biblioteca-v2/' + manifesto.modelos[3].arquivo));
    const caminhos = { semana: ['003','002','004'], os: ['004','003','006'], falhas: ['008','009','011'], plano: ['002','005','016'] };
    for (const [id, ordem] of Object.entries(caminhos)) {
      await p.locator(`[data-caminho="${id}"]`).click();
      assert.deepEqual(await codigos(), ordem.map(n => 'PCM-MAN-' + n));
    }
    await p.locator('#todos-modelos').click(); assert.equal(await lista.count(), 19);
    for (const termo of ['OS', 'o.s.', '(O.S.)', 'OS serviço', 'PCM MAN 004']) {
      await p.locator('input').fill(termo); assert.deepEqual(await codigos(), ['PCM-MAN-004'], termo);
    }
    for (const [termo, quantidade] of [['Excel',16],['Word',3],['Excel OS',1],['Word OS',0]]) {
      await p.locator('input').fill(termo); assert.equal(await lista.count(),quantidade,termo);
    }
    await p.locator('input').fill('estoque'); assert.deepEqual(await codigos(), ['PCM-MAN-010']);
    await p.locator('input').fill(''); assert.equal(await lista.count(), 19);
    await p.locator('[data-caminho="os"]').click();
    await p.locator('input').fill('orçamento'); assert.deepEqual(await codigos(), ['PCM-MAN-012']);
    await p.locator('#limpar-modelos-publicos').click(); assert.equal(await lista.count(), 3);
    assert.equal(await p.locator('input').evaluate(e => e === document.activeElement), true);
    await p.locator('input').fill('nenhum-modelo-ficticio'); assert.equal(await lista.count(), 0);
    await p.locator('[data-caminho="falhas"]').click(); assert.deepEqual(await codigos(), caminhos.falhas.map(n => 'PCM-MAN-' + n));
    await p.reload(); await p.locator('[data-filtros]:visible').waitFor(); assert.deepEqual(await codigos(), caminhos.os.map(n => 'PCM-MAN-' + n));
    await p.goto(base + '/modelos/#necessidade-plano'); await p.locator('[data-caminho="plano"][aria-pressed="true"]').waitFor(); assert.deepEqual(await codigos(), caminhos.plano.map(n => 'PCM-MAN-' + n));
    await mkdir('artifacts', { recursive: true });
    for (const width of [320,390,820,1280]) {
      await p.setViewportSize({ width, height: 900 }); await p.evaluate(() => document.fonts.ready);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Catálogo cabe em ' + width);
      assert.equal(await p.evaluate(() => { const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length === new Set(ids).size; }), true);
      await p.screenshot({ path: `artifacts/catalogo-publico-${width}.png`, fullPage: true });
    }
    assert.deepEqual(await p.evaluate(async () => (await indexedDB.databases()).map(d => d.name)), []);
    for (const m of manifesto.modelos) {
      const r = await p.goto(base + '/modelos/' + m.codigo.toLowerCase() + '/'); assert.equal(r.status(), 200);
      assert.equal(await p.locator('h1').count(), 1);
      assert.equal(await p.locator('link[rel="canonical"]').getAttribute('href'), 'https://pcmdireto.me/modelos/' + m.codigo.toLowerCase() + '/');
      const link = p.locator('.cabecalho-publico a[download]');
      const arquivo = await c.request.get(await link.evaluate(a => a.href));
      assert.deepEqual(await arquivo.body(), await readFile('public/' + m.url));
    }
    await p.goto(base + '/modelos/pcm-man-004/');
    for (const width of [320,390,820,1280]) {
      await p.setViewportSize({ width, height: 900 });
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Página do modelo cabe em ' + width);
      await p.screenshot({ path: `artifacts/modelo-publico-004-${width}.png`, fullPage: true });
    }
    await p.goto(base + '/modelos/'); await p.keyboard.press('Tab'); await p.keyboard.press('Enter');
    assert.equal(await p.locator('#principal').evaluate(e => e === document.activeElement), true);
    await c.close();
    const semJs = await navegador.newContext({ javaScriptEnabled: false, acceptDownloads: true });
    const s = await semJs.newPage(); await s.goto(base + '/modelos/'); assert.equal(await s.locator('#lista-modelos > li:visible').count(), 19);
    await s.locator('#pcm-man-004').getByRole('link', { name: 'Como usar Ordens de serviço' }).click();
    assert.ok((await s.locator('#como-usar').innerText()).includes('ordem'));
    const [original] = await Promise.all([s.waitForEvent('download'), s.locator('.cabecalho-publico a[download]').click()]);
    assert.deepEqual(await readFile(await original.path()), await readFile('public/' + manifesto.modelos[3].url));
    await semJs.close();
    const offline = await navegador.newContext(); const o = await offline.newPage();
    await o.goto(base + '/app.html#apoio'); await aguardarOffline(o);
    await o.goto(base + '/modelos/'); await o.locator('[data-filtros]:visible').waitFor();
    await o.goto(base + '/modelos/pcm-man-004/'); await o.locator('h1').waitFor();
    await offline.setOffline(true); await o.reload(); assert.ok((await o.locator('h1').innerText()).includes('Ordens'));
    await o.goto(base + '/modelos/'); await o.locator('[data-filtros]:visible').waitFor();
    await o.locator('input').fill('estoque'); assert.equal(await o.locator('#lista-modelos > li:visible').count(), 1);
    await offline.close();
    console.log('Catálogo público: 19 páginas e downloads originais, quatro caminhos, busca global, teclado, quatro larguras, sem JavaScript, zero abertura de base e páginas visitadas offline aprovados.');
  },
});
