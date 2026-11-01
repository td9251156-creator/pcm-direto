// Gera public/apresentacao/criticidade-pc.webp (1280×800) com a tela de Criticidade e o exemplo fictício do app.
// Uso: node scripts/capturar-criticidade.mjs   (Vite local; nenhuma rede externa, nenhum dado real)
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { executarComRecursos } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const origem = 'http://127.0.0.1:4197';
// Notas fictícias (segurança, qualidade, produção, frequência) para três ativos do exemplo.
const NOTAS = [[5, 3, 4, 2], [2, 4, 5, 3], [1, 1, 2, 1]];

await executarComRecursos({ limiteTotal: 180000,
  criarServidor: async () => { const s = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), logLevel: 'silent', server: { host: '127.0.0.1', port: 4197, strictPort: true } }); await s.listen(); return s; },
  criarNavegador: () => chromium.launch(),
  executar: async ({ navegador }) => {
    const contexto = await navegador.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
    const p = await contexto.newPage(); await p.route('https://**/*', (r) => r.abort());
    // Carrega na sessão os equipamentos do exemplo fictício do app e abre a Criticidade.
    await p.goto(`${origem}/#mais`); await p.locator('main h2').first().waitFor();
    await p.evaluate(async () => {
      const { estado, adicionar } = await import('/src/estado.js');
      const { EXEMPLO } = await import('/src/dados/exemplo.js');
      if (!estado.equipamentos.length) await adicionar(EXEMPLO.slice(0, 6).map((e, i) => ({ ...e, id: 'ex' + i })));
      location.hash = 'criticidade';
    });
    await p.locator('.avaliacao').first().waitFor();
    for (const [i, notas] of NOTAS.entries()) {
      const form = p.locator('.avaliacao').nth(i);
      for (const [j, n] of notas.entries()) await form.locator(`[name="nota-${j}"]`).selectOption(String(n));
      await form.getByRole('button').click();
      await p.waitForFunction((k) => document.querySelectorAll('.avaliacao')[k]?.textContent.includes('Classe: '), i);
      await p.locator('.avaliacao').nth(i).waitFor();
    }
    // Avisos passageiros (backup, "dados guardados") não fazem parte da tela apresentada.
    await p.addStyleTag({ content: '#lembrete-backup,#mensagens,.aviso-armazenamento{display:none!important}' });
    await p.evaluate(async () => { await document.fonts.ready; document.querySelector('#lembrete-backup')?.remove(); window.scrollTo(0, 0); });
    const png = await p.screenshot({ type: 'png' });
    // Converte para webp no próprio navegador (sem dependência nova).
    const webp = await p.evaluate(async (b64) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = document.createElement('canvas'); c.width = 1280; c.height = 800; c.getContext('2d').drawImage(img, 0, 0, 1280, 800);
      return c.toDataURL('image/webp', 0.82).split(',')[1];
    }, png.toString('base64'));
    await writeFile(new URL('../public/apresentacao/criticidade-pc.webp', import.meta.url), Buffer.from(webp, 'base64'));
    await contexto.close();
    console.log('Imagem gerada: public/apresentacao/criticidade-pc.webp (1280×800).');
  } });
