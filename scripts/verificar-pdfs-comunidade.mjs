// Fluxo da interface com SDK real e respostas de rede fictícias, sem conta ou upload real.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { iniciarServidor, executarComRecursos } from './navegador.mjs';
const ferramenta = process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href;
const { chromium } = await import(ferramenta);
const pdf = await readFile(new URL('../public/modelos/maquinas/pcm-modelo-motor_eletrico.pdf', import.meta.url));
const id = '10000000-0000-4000-8000-000000000001';
const autor = '20000000-0000-4000-8000-000000000002';
const caminho = `${autor}/${id}/30000000-0000-4000-8000-000000000003.pdf`;
await executarComRecursos({
  criarServidor: () => iniciarServidor({ raiz: fileURLToPath(new URL('../', import.meta.url)), porta: 4178 }),
  criarNavegador: () => chromium.launch({ executablePath: process.env.PCM_CHROMIUM || undefined, args: process.env.PCM_SEM_SANDBOX === '1' ? ['--no-sandbox'] : [] }),
  executar: async ({ navegador }) => {
    const contexto = await navegador.newContext({ serviceWorkers: 'block', acceptDownloads: true, viewport: { width: 390, height: 844 } });
    contexto.setDefaultTimeout(10000);
    await contexto.addInitScript(() => {
      const Canal = window.BroadcastChannel;
      window.BroadcastChannel = class extends Canal { constructor(nome) { super(nome); window.canalPdfTeste = nome; } };
    });
    let modelo; let moderador = false; let uploads = 0; let salvamentos = 0; let decisoes = 0;
    await contexto.route('https://*.supabase.co/**', async route => {
      const req = route.request(); const url = new URL(req.url());
      const responder = dados => route.fulfill({ contentType: 'application/json', body: JSON.stringify(dados) });
      if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
      if (url.pathname.includes('/rpc/catalogo_e_moderador')) return responder(moderador);
      if (url.pathname.includes('/rpc/catalogo_salvar')) {
        salvamentos++;
        const dados = req.postDataJSON().p_dados;
        assert.deepEqual(Object.keys(dados).sort(), ['apelido', 'caracteristicas', 'descricao', 'fabricante', 'modelo', 'tarefas', 'tipo_base', 'titulo']);
        modelo = { id, autor_id: autor, dados, situacao: 'rascunho', conteudo_versao: 1 };
        return responder(id);
      }
      if (url.pathname.includes('/rpc/catalogo_reservar_pdf')) return responder({ caminho, versao: 2 });
      if (url.pathname.includes('/storage/v1/object/')) {
        if (req.method() === 'POST') {
          uploads++;
          assert.equal(req.headers()['x-upsert'], 'false');
          assert.ok(req.postDataBuffer().includes(Buffer.from('%PDF-')));
          return responder({ Key: 'catalogo-pdfs/' + caminho });
        }
        return route.fulfill({ contentType: 'application/pdf', body: pdf });
      }
      if (url.pathname.includes('/functions/v1/catalogo-finalizar-pdf')) {
        assert.match(req.postDataJSON().sha256, /^[a-f0-9]{64}$/);
        modelo.pdf_caminho = caminho; modelo.pdf_tamanho = pdf.length; modelo.pdf_sha256 = req.postDataJSON().sha256;
        return responder({ pdf: { caminho, sha256: modelo.pdf_sha256, tamanho: pdf.length } });
      }
      if (url.pathname.includes('/rpc/catalogo_enviar')) { modelo.situacao = 'pendente'; modelo.conteudo_versao = 4; return responder(null); }
      if (url.pathname.includes('/rpc/catalogo_decidir')) {
        decisoes++; assert.equal(req.postDataJSON().p_versao, 4); modelo.situacao = 'aprovado'; return responder(null);
      }
      if (url.pathname.endsWith('/catalogo_modelos')) {
        const situacao = url.searchParams.get('situacao')?.replace('eq.', '');
        return responder(modelo && (!situacao || situacao === modelo.situacao) ? [modelo] : []);
      }
      return responder([]);
    });
    const pagina = await contexto.newPage();
    const erros = []; pagina.on('pageerror', e => erros.push(e.message));
    await pagina.goto('http://127.0.0.1:4178/#catalogo');
    await pagina.locator('[data-login]').waitFor();
    const canal = await pagina.evaluate(() => window.canalPdfTeste);
    const emissora = await contexto.newPage(); await emissora.goto('http://127.0.0.1:4178/#apoio');
    async function entrar(usuario) {
      await emissora.evaluate(({ canal, usuario }) => {
        const c = new BroadcastChannel(canal); c.postMessage({ event: 'SIGNED_IN', session: { user: { id: usuario, email: 'teste@example.invalid' } } }); c.close();
      }, { canal, usuario });
    }
    await entrar(autor); await pagina.locator('[data-novo]').click();
    await pagina.locator('#c-titulo').fill('Motor fictício com PDF'); await pagina.locator('#c-descricao').fill('Contribuição fictícia sem dados privados.');
    const [ficha] = await Promise.all([pagina.waitForEvent('popup'), pagina.locator('[data-ficha-editor]').click()]);
    await ficha.getByRole('heading', { name: 'Motor fictício com PDF', exact: true }).waitFor();
    assert.equal(salvamentos, 0); assert.equal(uploads, 0, 'Gerar ficha não envia dados');
    assert.equal(await ficha.evaluate(() => window.opener), null);
    await ficha.locator('img').evaluate(img => img.decode());
    await ficha.emulateMedia({ media: 'print' });
    assert.ok(await ficha.evaluate(() => {
      const titulo = document.querySelector('h1'); const original = titulo.textContent;
      titulo.textContent = 'W'.repeat(120);
      const cabe = document.documentElement.scrollWidth <= innerWidth;
      titulo.textContent = original; return cabe;
    }), 'Título sem espaços não sai da área de impressão');
    await ficha.emulateMedia({ media: 'screen' });
    await mkdir('artifacts', { recursive: true });
    const fichaPdf = await ficha.pdf({ path: 'artifacts/ficha-campos.pdf', format: 'A4', printBackground: true });
    assert.equal(fichaPdf.subarray(0,5).toString(), '%PDF-');
    await ficha.screenshot({ path: 'artifacts/ficha-campos-preview.png', fullPage: true });
    await ficha.evaluate(() => { window.print = () => { window.imprimiuTeste = true; }; });
    await ficha.locator('#imprimir-ficha').click();
    assert.equal(await ficha.evaluate(() => window.imprimiuTeste), true);
    await ficha.locator('#fechar-ficha').click();
    await pagina.locator('#c-pdf').setInputFiles({ name: 'falso.pdf', mimeType: 'application/pdf', buffer: Buffer.from('arquivo inválido') });
    await pagina.getByRole('button', { name: 'Salvar rascunho online', exact: true }).click();
    await pagina.locator('#mensagens').getByText('O arquivo escolhido não tem formato PDF.').waitFor();
    assert.equal(salvamentos, 0); assert.equal(uploads, 0);
    await pagina.locator('#c-pdf').setInputFiles({ name: 'modelo-ficticio.pdf', mimeType: 'application/pdf', buffer: pdf });
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Formulário de PDF cabe no celular');
    assert.equal(uploads, 0, 'Escolher o arquivo não inicia envio automático');
    await pagina.locator('[name="consentimento"]').check();
    await pagina.getByRole('button', { name: 'Salvar e enviar para revisão', exact: true }).click();
    await pagina.locator('[data-baixar-pdf]').waitFor();
    assert.equal(uploads, 1); assert.equal(salvamentos, 1);
    const [download] = await Promise.all([pagina.waitForEvent('download'), pagina.locator('[data-baixar-pdf]').click()]);
    assert.deepEqual(await readFile(await download.path()), pdf);
    moderador = true;
    await entrar('40000000-0000-4000-8000-000000000004');
    await pagina.locator('[data-vista="moderacao"]').click();
    await pagina.locator('[data-parecer]').waitFor();
    await pagina.getByRole('button', { name: 'Aprovar publicação', exact: true }).click();
    await pagina.locator('#mensagens').getByText('Baixe e confira o PDF antes de confirmar sua aprovação.').waitFor();
    assert.equal(decisoes, 0);
    await pagina.locator('[name="pdf-conferido"]').check();
    pagina.once('dialog', d => d.accept());
    await pagina.getByRole('button', { name: 'Aprovar publicação', exact: true }).click();
    await pagina.locator('#mensagens').getByText('Modelo publicado após revisão.').waitFor();
    assert.equal(decisoes, 1);
    await pagina.locator('[data-vista="publicos"]').click();
    await pagina.locator('[data-baixar-pdf]').waitFor();
    assert.deepEqual(erros, []);
    await contexto.close();
    console.log('Comunidade PDF: seleção sem envio automático, recusa de arquivo falso, upload privado, validação, download e decisão com versão aprovados (rede simulada).');
  },
});
