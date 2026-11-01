// Etiqueta QR por ativo no navegador: o endereço da etiqueta abre a ficha certa; etiqueta baixada com TAG escapada.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { executarComRecursos } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const origem = 'http://127.0.0.1:4199';

await executarComRecursos({ limiteTotal: 180000,
  criarServidor: async () => { const s = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), logLevel: 'silent', server: { host: '127.0.0.1', port: 4199, strictPort: true } }); await s.listen(); return s; },
  criarNavegador: () => chromium.launch(),
  executar: async ({ navegador }) => {
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
    const p = await contexto.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(e.message)); await p.route('https://**/*', (r) => r.abort());
    await p.goto(`${origem}/#mais`); await p.locator('main h2').first().waitFor();
    const alvo = await p.evaluate(async () => {
      const { estado, adicionar } = await import('/src/estado.js');
      await adicionar([{ id: 'qr1', setor: 'TST', tipo: 'motor_eletrico', descricao: 'Motor <fictício> & 1' }, { id: 'qr2', setor: 'TST', tipo: 'bomba_centrifuga', descricao: 'Bomba fictícia' }]);
      return estado.equipamentos.find((e) => e.id === 'qr2');
    });
    // Endereço gravado no QR do segundo ativo: abre direto a ficha dele (celular).
    await p.goto(`${origem}/#ativos?ativo=qr2`); await p.locator('#titulo-ativo').waitFor();
    assert.match(await p.locator('#titulo-ativo').innerText(), new RegExp(alvo.tag));
    assert.ok(await p.evaluate(() => document.querySelector('main').classList.contains('ativo-aberto')), 'ficha aberta no celular');
    await p.locator('.etiqueta-qr summary').click();
    assert.equal(await p.locator('.etiqueta-qr-corpo svg path').count(), 1);
    const [download] = await Promise.all([p.waitForEvent('download'), p.locator('#baixar-etiqueta').click()]);
    assert.equal(download.suggestedFilename(), `etiqueta-${alvo.tag}.svg`);
    const svg = await readFile(await download.path(), 'utf8');
    assert.match(svg, /width="60mm" height="40mm"/); assert.ok(svg.includes(alvo.tag));
    await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true }); await writeFile(new URL('../artifacts/etiqueta-qr.svg', import.meta.url), svg);
    // Ativo com caracteres especiais: descrição escapada no SVG baixado.
    await p.goto(`${origem}/#ativos?ativo=qr1`); await p.locator('#titulo-ativo').waitFor();
    await p.locator('.etiqueta-qr summary').click();
    const [d2] = await Promise.all([p.waitForEvent('download'), p.locator('#baixar-etiqueta').click()]);
    const svg2 = await readFile(await d2.path(), 'utf8'); assert.ok(svg2.includes('Motor &lt;fictício&gt; &amp; 1')); assert.ok(!svg2.includes('<fictício>'));
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolagem lateral em 390 px');
    assert.deepEqual(erros, []); await contexto.close();
    console.log('Etiqueta QR: endereço abre a ficha certa no celular, etiqueta 60×40 mm baixada com texto escapado, sem rolagem lateral.');
  } });
