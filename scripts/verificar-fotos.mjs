// Foto na falha no navegador: redução no aparelho (≤ 1.280 px, ≤ 500 KB, sem metadados), limite de 3, gravação,
// tamanho do backup em Meus dados e foto preservada no backup e na restauração. Imagens geradas, sem dados reais.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { executarComRecursos } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const origem = 'http://127.0.0.1:4200';

await executarComRecursos({ limiteTotal: 240000,
  criarServidor: async () => { const s = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), logLevel: 'silent', server: { host: '127.0.0.1', port: 4200, strictPort: true } }); await s.listen(); return s; },
  criarNavegador: () => chromium.launch(),
  executar: async ({ navegador }) => {
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
    const p = await contexto.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(e.message)); await p.route('https://**/*', (r) => r.abort());
    await p.goto(`${origem}/#mais`); await p.locator('main h2').first().waitFor();
    await p.evaluate(async () => { const { adicionar } = await import('/src/estado.js'); await adicionar([{ id: 'ft1', setor: 'TST', tipo: 'motor_eletrico', descricao: 'Motor fictício' }]); });
    // Imagem grande gerada no navegador (ruído colorido, difícil de comprimir).
    const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 3000; c.height = 2000; const x = c.getContext('2d');
      for (let i = 0; i < 4000; i++) { x.fillStyle = `hsl(${i * 37 % 360} 70% ${30 + i % 50}%)`; x.fillRect((i * 97) % 3000, (i * 53) % 2000, 60, 40); }
      return c.toDataURL('image/png').split(',')[1]; });
    const arquivo = (nome) => ({ name: nome, mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await p.goto(`${origem}/#falhas`); await p.locator('#form-falha').waitFor();
    await p.locator('#falha-equipamento').selectOption('ft1'); await p.locator('#g-sintoma').fill('Ruído fictício');
    await p.locator('#g-fotos').setInputFiles([arquivo('a.png'), arquivo('b.png'), arquivo('c.png'), arquivo('d.png')]);
    await p.locator('#previa-fotos figure').nth(2).waitFor();
    assert.equal(await p.locator('#previa-fotos figure').count(), 3, 'limite de 3 fotos por falha');
    await p.locator('[data-remover-foto]').first().click(); assert.equal(await p.locator('#previa-fotos figure').count(), 2);
    await p.locator('#salvar-falha').click(); await p.locator('.miniaturas-falha img').first().waitFor();
    const fotos = await p.evaluate(async () => (await import('/src/estado.js')).estado.gestao.falhas[0].fotos);
    assert.equal(fotos.length, 2);
    for (const f of fotos) {
      const bytes = Buffer.from(f.dados.split(',')[1], 'base64');
      assert.ok(f.dados.startsWith('data:image/jpeg;base64,')); assert.ok(bytes.length <= 500_000, `foto com ${bytes.length} bytes`);
      assert.equal(Math.max(f.largura, f.altura), 1280); assert.ok(!bytes.includes(Buffer.from('Exif')), 'sem metadados EXIF');
    }
    await p.goto(`${origem}/#dados`); await p.locator('#baixar-backup').waitFor();
    assert.match(await p.locator('#tamanho-backup').innerText(), /Tamanho estimado do backup: .* MB \(fotos: .* MB\)/);
    const [d] = await Promise.all([p.waitForEvent('download'), p.locator('#baixar-backup').click()]);
    const backup = JSON.parse(await readFile(await d.path(), 'utf8'));
    assert.deepEqual(backup.rascunho.gestao.falhas[0].fotos.map((f) => f.id), fotos.map((f) => f.id));
    // Restaura numa base vazia e confere as fotos.
    await p.evaluate(async () => { const { estado } = await import('/src/estado.js'); estado.gestao.falhas = []; });
    const r = await p.evaluate(async (b) => (await import('/src/estado.js')).restaurarBackup(b), backup);
    assert.ok(r.ok, r.motivo);
    const depois = await p.evaluate(async () => (await import('/src/estado.js')).estado.gestao.falhas[0].fotos.map((f) => f.dados.length));
    assert.deepEqual(depois, fotos.map((f) => f.dados.length));
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolagem lateral em 390 px');
    assert.deepEqual(erros, []); await contexto.close();
    console.log(`Fotos na falha: redução para ${fotos.map((f) => Math.round(f.dados.length * 0.75 / 1000) + ' KB').join(' e ')} (1.280 px, sem EXIF), limite de 3, backup com tamanho e restauração aprovados.`);
  } });
