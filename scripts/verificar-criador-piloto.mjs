import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { iniciarServidor, executarComRecursos } from './navegador.mjs';

const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const origem = 'http://127.0.0.1:4231';

await executarComRecursos({
  criarServidor: () => iniciarServidor({ raiz: process.cwd(), porta: 4231 }),
  criarNavegador: () => chromium.launch({ executablePath: process.env.PCM_CHROMIUM || undefined, args: process.env.PCM_SEM_SANDBOX === '1' ? ['--no-sandbox'] : [] }),
  executar: async ({ navegador }) => {
    for (const width of [320, 390, 820, 1280]) {
      const contexto = await navegador.newContext({ viewport: { width, height: 900 } });
      const pagina = await contexto.newPage();
      await pagina.goto(`${origem}/criar/`);
      assert.ok(await pagina.getByText('Etapa 1 de 3').isVisible());
      assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Criador sem rolagem horizontal em ${width}px`);
      await contexto.close();
    }

    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
    const pagina = await contexto.newPage();
    await pagina.goto(`${origem}/criar/?modelo=PCM-MAN-005`);
    await pagina.getByRole('button', { name: 'Continuar →' }).click();
    await pagina.getByText('Informe um título para continuar.').waitFor();
    await pagina.getByLabel('Título da checklist *').fill('Checklist fictícia');
    await pagina.getByRole('button', { name: 'Continuar →' }).click();
    await pagina.locator('#item-0').fill('Verificar óleo');
    await pagina.getByRole('button', { name: '+ Adicionar item' }).click();
    await pagina.locator('#item-1').fill('Inspecionar vazamentos');
    await pagina.getByRole('button', { name: 'Mover item 2 para cima' }).click();
    assert.equal(await pagina.locator('#item-0').inputValue(), 'Inspecionar vazamentos');
    await pagina.getByRole('button', { name: 'Continuar →' }).click();
    await pagina.getByText('2 itens na ordem de execução.').waitFor();
    await pagina.getByRole('button', { name: '← Voltar' }).click();
    assert.equal(await pagina.locator('#item-0').inputValue(), 'Inspecionar vazamentos');
    await pagina.reload();
    assert.equal(await pagina.getByLabel('Título da checklist *').inputValue(), 'Checklist fictícia', 'Rascunho anterior continua compatível');

    await pagina.goto(`${origem}/criar/?modelo=PCM-MAN-016`);
    await pagina.getByLabel('Título do procedimento *').fill('Trocar filtro');
    await pagina.getByRole('button', { name: 'Continuar →' }).click();
    await pagina.getByLabel('Objetivo').fill('Trocar o filtro com segurança');
    await pagina.getByRole('button', { name: 'Continuar →' }).click();
    await pagina.locator('#acao-0').fill('Desligar o equipamento');
    await pagina.getByRole('button', { name: '+ Adicionar passo' }).click();
    await pagina.locator('#acao-1').fill('Trocar o filtro');
    await pagina.getByRole('button', { name: 'Continuar →' }).click();
    const [download] = await Promise.all([pagina.waitForEvent('download'), pagina.getByRole('button', { name: 'Gerar Excel' }).click()]);
    const zip = await JSZip.loadAsync(await readFile(await download.path()));
    const procedimento = await zip.file('xl/worksheets/sheet2.xml').async('string');
    assert.match(procedimento, /Desligar o equipamento/);
    assert.match(procedimento, /Trocar o filtro/);
    assert.deepEqual(await pagina.evaluate(async () => (await indexedDB.databases()).map(d => d.name)), [], 'Criador não abre a base operacional');
    await contexto.close();
    console.log('Criador: etapas, validação, lista editável, ordem, retomada, quatro larguras, Excel e isolamento aprovados.');
  },
});
