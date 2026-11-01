// Registro de ciência no navegador: execução concluída mostra o bloco; a declaração é obrigatória; nome, data/hora e
// conteúdo ficam gravados; uma segunda ciência não altera a primeira; celular sem rolagem lateral. Dados fictícios.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { executarComRecursos } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const origem = 'http://127.0.0.1:4201';

await executarComRecursos({ limiteTotal: 240000,
  criarServidor: async () => { const s = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), logLevel: 'silent', server: { host: '127.0.0.1', port: 4201, strictPort: true } }); await s.listen(); return s; },
  criarNavegador: () => chromium.launch(),
  executar: async ({ navegador }) => {
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const p = await contexto.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(e.message)); await p.route('https://**/*', (r) => r.abort());
    await p.goto(`${origem}/#mais`); await p.locator('main h2').first().waitFor();
    // Equipamento, revisão ativa e uma execução registrada pelas funções do próprio app.
    const idOcorrencia = await p.evaluate(async () => {
      const app = await import('/src/estado.js'); const { prepararRevisao } = await import('/src/logica/programacao.js');
      await app.adicionar([{ id: 'ci1', setor: 'TST', tipo: 'motor_eletrico', descricao: 'Motor fictício' }]);
      const hoje = new Date().toISOString().slice(0, 10);
      const r = prepararRevisao(app.estado.programacao, app.dadosAtuais(), app.estado.gestao, { id: 'rev-ci', vigencia: hoje, elaborador: 'Pessoa fictícia', resumo: 'Teste de ciência' }, hoje);
      if (!r.ok) throw new Error(r.motivo);
      app.estado.programacao = r.programacao; await app.salvar();
      const o = r.programacao.ocorrencias.find((x) => x.situacao === 'prevista');
      const reg = await app.registrarOcorrencia(o.id, { data: hoje, observacao: 'Execução fictícia', responsavelId: '' });
      if (!reg.ok) throw new Error(reg.motivo);
      return o.id;
    });
    await p.evaluate(async (id) => { (await import('/src/telas/campo-ui.js')).abrirExecucao(id); }, idOcorrencia);
    await p.locator('#form-ciencia').waitFor();
    assert.match(await p.locator('.ciencia').innerText(), /não tem validade jurídica garantida/);
    await p.locator('#ciencia-nome').fill('Supervisora Fictícia');
    await p.locator('#form-ciencia button').click();
    assert.equal(await p.locator('#form-ciencia input[name="declaro"]').evaluate((c) => c.validity.valueMissing), true, 'declaração obrigatória');
    await p.locator('#form-ciencia input[name="declaro"]').check(); await p.locator('#form-ciencia button').click();
    await p.locator('.ciencia li').first().waitFor();
    const lerCiencias = () => p.evaluate(async () => (await import('/src/estado.js')).estado.gestao.historico.find((h) => !h.cancelada).ciencias);
    assert.equal(await p.locator('dialog.painel-execucao').count(), 1, 'um único painel aberto');
    const c1 = await lerCiencias();
    assert.equal(c1.length, 1); assert.equal(c1[0].nome, 'Supervisora Fictícia'); assert.match(c1[0].conteudo, /Execução fictícia/); assert.ok(Date.parse(c1[0].em));
    await p.locator('#ciencia-nome').fill('Gestor Fictício'); await p.locator('#form-ciencia input[name="declaro"]').check(); await p.locator('#form-ciencia button').click();
    await p.locator('.ciencia li').nth(1).waitFor();
    const c2 = await lerCiencias(); assert.equal(c2.length, 2); assert.deepEqual(c2[0], c1[0]);
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'sem rolagem lateral em 390 px');
    assert.deepEqual(erros, []); await contexto.close();
    console.log('Ciência na execução: declaração obrigatória, nome/data-hora/conteúdo gravados, segunda ciência sem alterar a primeira e celular aprovados.');
  } });
