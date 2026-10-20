// Verificação opcional de ponta a ponta, sem dependências novas no aplicativo.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { chromium } = await import(process.env.PCM_PLAYWRIGHT || 'playwright');
const raiz = fileURLToPath(new URL('../', import.meta.url));
const servidor = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { cwd: raiz, stdio: 'pipe' });
let log = '';
servidor.stdout.on('data', (d) => { log += d; });
servidor.stderr.on('data', (d) => { log += d; });
let browser;
try {
  let pronto = false;
  for (let i = 0; i < 100; i++) {
    try { pronto = (await fetch('http://127.0.0.1:4175/')).ok; } catch { /* aguarda o servidor */ }
    if (pronto) break;
    if (servidor.exitCode !== null) throw new Error(log);
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(pronto, 'Servidor de teste não iniciou: ' + log);
  browser = await chromium.launch({
    executablePath: process.env.PCM_CHROMIUM || undefined,
    args: process.env.PCM_SEM_SANDBOX === '1' ? ['--no-sandbox'] : [],
  });
  const contexto = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const page = await contexto.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('http://127.0.0.1:4175/');
  await page.getByRole('heading', { name: 'Plano de manutenção preventiva a partir da sua lista de equipamentos' }).waitFor();
  await page.getByRole('link', { name: '2. Equipamentos' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL('**/#equipamentos');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'conteudo');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'A página excedeu a largura do celular');
  await page.locator('.pular').focus();
  await page.keyboard.press('Enter');
  assert.ok(page.url().endsWith('#equipamentos'), 'Pular para conteúdo não deve trocar de tela');
  await page.goto('http://127.0.0.1:4175/#biblioteca');
  await page.locator('#importar-json').setInputFiles({ name: 'invalido.json', mimeType: 'application/json', buffer: Buffer.from('null') });
  await page.waitForFunction(() => document.querySelector('#mensagens').textContent.includes('Biblioteca não importada'));
  assert.equal(await page.locator('#tipos > details').count(), 4);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await contexto.setOffline(true);
  await page.reload();
  await page.getByRole('heading', { name: 'Biblioteca técnica', exact: true }).waitFor();
  await page.getByRole('link', { name: '4. Entrega' }).click();
  for (const [botao, extensao] of [['#baixar-xlsx', '.xlsx'], ['#baixar-docx', '.docx']]) {
    const [arquivo] = await Promise.all([page.waitForEvent('download'), page.locator(botao).click()]);
    assert.ok(arquivo.suggestedFilename().endsWith(extensao));
    const bytes = await readFile(await arquivo.path());
    assert.ok(bytes.length > 5000);
    assert.equal(bytes.subarray(0, 2).toString(), 'PK');
  }
  await contexto.setOffline(false);
  await page.evaluate(() => localStorage.setItem('pcm-direto:rascunho:v1', '{'));
  await page.reload();
  await page.getByRole('button', { name: 'Baixar dados originais para recuperação' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('pcm-direto:rascunho:v1')), '{');
  assert.deepEqual(erros, []);
  console.log('Aprovado: celular, teclado, importação inválida, recuperação, abertura offline e geração offline de XLSX e DOCX.');
} finally {
  await browser?.close();
  servidor.kill();
}
