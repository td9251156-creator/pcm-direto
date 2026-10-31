// Importação dos dados da operação (004, 008, 012) até os dashboards, com dados fictícios.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'vite';
import { executarComRecursos } from './navegador.mjs';
const { chromium } = await import(process.env.PCM_PLAYWRIGHT || new URL('../ferramentas/navegador/node_modules/playwright/index.mjs', import.meta.url).href);
const URL_BASE = 'http://127.0.0.1:4196/';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Preenche cópias dos modelos v2 em memória (dados fictícios) e devolve os bytes .xlsx.
async function arquivos(servidor) {
  const { abrirWorkbookBibliotecaV2, modeloBibliotecaV2 } = await servidor.ssrLoadModule('/src/integracao/biblioteca-pcm-v2.js');
  const { CAMPOS } = await servidor.ssrLoadModule('/src/logica/operacao.js');
  const ExcelJS = (await import('exceljs')).default;
  const abrir = (codigo) => abrirWorkbookBibliotecaV2(readFileSync(new URL(`../public/${modeloBibliotecaV2(codigo).url}`, import.meta.url)), ExcelJS);
  const preencher = (wb, base, tabela, linhas) => {
    const sheet = wb.worksheets.find((s) => s.getTable(tabela));
    const t = sheet.getTable(tabela).table;
    const [, col, linha] = /^([A-Z]+)(\d+):/.exec(t.tableRef ?? t.ref);
    const inicio = sheet.getCell(col + linha).col;
    linhas.forEach((r, i) => CAMPOS[base].forEach((campo, j) => { if (campo !== 'equipamento' && r[campo] !== undefined) sheet.getCell(+linha + 1 + i, inicio + j).value = r[campo]; }));
  };
  const d = (iso) => new Date(`${iso}T00:00:00Z`);
  const os = await abrir('PCM-MAN-004');
  preencher(os, 'ativos', 'tb_pcm_ativos', [
    { tag: 'DEMO-MOT-001', descricao_ativo: 'Motor fictício', familia: 'Motor', setor: 'Setor Demo A' },
    { tag: 'DEMO-BOM-002', descricao_ativo: 'Bomba fictícia', familia: 'Bomba', setor: 'Setor Demo B' },
  ]);
  preencher(os, 'ordens_servico', 'tb_pcm_os', [
    { numero_os: 'OS-DEMO-1', tag: 'DEMO-MOT-001', atividade: 'Inspeção fictícia', tipo_manutencao: 'PREVENTIVA', prioridade: 'ALTA', status: 'ABERTA', data_abertura: d('2026-09-01'), data_prevista: d('2026-09-10'), horas_estimadas: 3, horas_restantes: 3 },
    { numero_os: 'OS-DEMO-2', tag: 'DEMO-BOM-002', atividade: 'Troca fictícia', tipo_manutencao: 'CORRETIVA', prioridade: 'MEDIA', status: 'CONCLUIDA', data_abertura: d('2026-09-05'), data_prevista: d('2026-09-08'), data_conclusao: d('2026-09-07'), horas_estimadas: 1, horas_restantes: 0 },
    { numero_os: 'OS-DEMO-3', tag: 'SEM-CADASTRO', atividade: 'Linha com TAG inexistente', tipo_manutencao: 'CORRETIVA', prioridade: 'BAIXA', status: 'ABERTA', data_abertura: d('2026-09-06') },
  ]);
  const falhas = await abrir('PCM-MAN-008');
  preencher(falhas, 'falhas', 'tb_pcm_falhas', [
    { referencia_falha: 'F-DEMO-1', tag: 'DEMO-MOT-001', numero_os: 'OS-DEMO-1', descricao_falha: 'Falha fictícia', inicio_falha: '2026-09-02T08:00:00', fim_falha: '2026-09-02T12:00:00', inicio_reparo: '2026-09-02T09:00:00', fim_reparo: '2026-09-02T12:00:00' },
  ]);
  const custos = await abrir('PCM-MAN-012');
  preencher(custos, 'custos_manutencao', 'tb_pcm_custos', [
    { referencia_lancamento: 'C-DEMO-1', data_lancamento: d('2026-09-03'), setor: 'Setor Demo A', categoria_custo: 'MATERIAL', valor_realizado: 1500, documento_origem: 'DOC-DEMO' },
  ]);
  const grade = custos.getWorksheet('Orçamento anual');
  grade.getCell('A4').value = 2026; grade.getCell('J8').value = 1000; // setembro, material
  const bytes = async (wb) => Buffer.from(await wb.xlsx.writeBuffer());
  return { os: await bytes(os), falhas: await bytes(falhas), custos: await bytes(custos) };
}

async function importar(p, codigo, nome, buffer) {
  await p.selectOption('#io-modelo', codigo);
  await p.setInputFiles('#io-arquivo', { name: nome, mimeType: XLSX, buffer });
  await p.locator('#titulo-previa, #io-previa [role="alert"]').first().waitFor();
}

await executarComRecursos({
  limiteTotal: 240000,
  criarServidor: async () => { const s = await createServer({ server: { host: '127.0.0.1', port: 4196, strictPort: true, watch: { ignored: ['**/artifacts/**'] } } }); await s.listen(); return s; },
  criarNavegador: () => chromium.launch(process.env.PCM_CHROMIUM ? { executablePath: process.env.PCM_CHROMIUM } : {}),
  executar: async ({ servidor, navegador }) => {
    const xlsx = await arquivos(servidor);
    const c = await navegador.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const p = await c.newPage();
    const erros = [];
    p.on('pageerror', (e) => erros.push(e.message));

    // Base nova: dashboards mostram o caminho para importar, sem dados fictícios misturados.
    await p.goto(`${URL_BASE}#dashboards`);
    await p.getByRole('heading', { name: 'Ainda não há dados da operação nesta base' }).waitFor();
    assert.equal(await p.locator('.pd-selo-demo').count(), 0);
    await p.getByRole('link', { name: 'Importar dados da operação' }).click();
    await p.locator('#io-arquivo').waitFor();

    // 004: prévia com aceitos e recusado; nada é gravado antes da confirmação.
    await importar(p, 'PCM-MAN-004', 'os-demo.xlsx', xlsx.os);
    const previa = await p.locator('#io-previa').innerText();
    assert.match(previa, /4\s+novo\(s\) para gravar/);
    assert.match(previa, /1\s+recusado\(s\)/);
    assert.match(previa, /SEM-CADASTRO/);
    assert.match(await p.locator('#io-salvo').innerText(), /^0 ativos/);
    await p.getByRole('button', { name: 'Confirmar importação' }).click();
    await p.locator('#io-resultado', { hasText: 'Importação gravada: 4 novo(s)' }).waitFor();
    assert.match(await p.locator('#io-salvo').innerText(), /2 ativos · 2 OS/);

    // Reimportar o mesmo arquivo não duplica.
    await importar(p, 'PCM-MAN-004', 'os-demo.xlsx', xlsx.os);
    assert.match(await p.locator('#io-previa').innerText(), /4\s+já salvo\(s\) sem mudança/);
    assert.equal(await p.getByRole('button', { name: 'Confirmar importação' }).count(), 0);
    await p.getByRole('button', { name: 'Fechar prévia' }).click();

    await importar(p, 'PCM-MAN-008', 'falhas-demo.xlsx', xlsx.falhas);
    await p.getByRole('button', { name: 'Confirmar importação' }).click();
    await p.locator('#io-resultado', { hasText: 'Importação gravada: 1 novo(s)' }).waitFor();
    await importar(p, 'PCM-MAN-012', 'custos-demo.xlsx', xlsx.custos);
    assert.match(await p.locator('#io-previa').innerText(), /Lançamentos de custo: 1 · Orçamento: 1/);
    await p.getByRole('button', { name: 'Confirmar importação' }).click();
    await p.locator('#io-resultado', { hasText: 'Importação gravada: 2 novo(s)' }).waitFor();
    assert.equal(await p.evaluate(() => document.activeElement?.id), 'io-resultado', 'Foco no resultado após importar');

    // Persistência: recarregar mantém a base; dashboards leem a base local diretamente.
    await p.reload();
    await p.goto(`${URL_BASE}#dashboards`);
    await p.locator('.pd-cartao').first().waitFor();
    assert.equal(await p.locator('.pd-selo-demo').count(), 0);
    assert.deepEqual((await p.locator('.pd-valor').allInnerTexts()).slice(0, 3), ['1 OS', '1 OS', '3 h']);
    await p.getByRole('link', { name: 'Confiabilidade' }).click();
    await p.waitForFunction(() => document.querySelector('.pd-cartao h3')?.textContent === 'Falhas registradas');
    assert.deepEqual((await p.locator('.pd-valor').allInnerTexts()).slice(0, 3), ['1 falhas', '4 h', '3 h']);
    await p.getByRole('link', { name: 'Custos' }).click();
    await p.waitForFunction(() => document.querySelector('.pd-cartao h3')?.textContent === 'Realizado');
    assert.deepEqual((await p.locator('.pd-valor').allInnerTexts()).slice(0, 2).map((t) => t.replace(/\s/g, ' ')), ['R$ 1.500', 'R$ 1.000']);
    await p.selectOption('#pd-setor', 'Setor Demo A');
    await p.waitForFunction(() => document.querySelector('#pd-ativos').textContent.includes('Setor Demo A'));
    assert.match(await p.locator('#pd-conteudo').innerText(), /não é dividido por setor/);
    await p.getByRole('button', { name: 'Limpar filtros' }).click();
    // A demonstração continua separada e identificada.
    await p.getByRole('link', { name: 'Ver demonstração' }).click();
    await p.locator('.pd-selo-demo').waitFor();
    await p.getByRole('link', { name: 'Voltar aos dados da fábrica' }).click();
    await p.locator('.pd-cartao').first().waitFor();
    assert.equal(await p.locator('.pd-selo-demo').count(), 0);
    for (const largura of [390, 1280]) {
      await p.setViewportSize({ width: largura, height: 900 });
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Dashboards reais sem rolagem horizontal em ${largura}px`);
    }

    // Backup completo leva os dados da operação.
    await p.goto(`${URL_BASE}#dados`);
    const [download] = await Promise.all([p.waitForEvent('download'), p.locator('#baixar-backup').click()]);
    const backup = JSON.parse(readFileSync(await download.path(), 'utf8'));
    assert.equal(backup.rascunho.gestao.versao, 3);
    assert.equal(backup.rascunho.gestao.operacao.ordens_servico.length, 2);
    assert.equal(backup.rascunho.gestao.operacao.importacoes.length, 3);

    // Outra aba grava primeiro: a confirmação desta aba é recusada e a base não é sobrescrita.
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto(`${URL_BASE}#importar-operacao`);
    await p.locator('#io-arquivo').waitFor();
    const outra = await c.newPage();
    await outra.goto(`${URL_BASE}#falhas`);
    await outra.waitForLoadState('networkidle');
    await outra.evaluate(async () => { const m = await import('/src/estado.js'); m.estado.gestao.organizacao.nome = 'Fábrica fictícia'; await m.salvar(); });
    await outra.close();
    // Sem mudanças a aplicar a prévia não oferece confirmação; força um conflito trocando um registro salvo nesta aba.
    await p.evaluate(async () => { const m = await import('/src/estado.js'); m.estado.gestao.operacao.ordens_servico[0].atividade = 'Alterada só na memória'; });
    await importar(p, 'PCM-MAN-004', 'os-demo.xlsx', xlsx.os);
    await p.getByRole('button', { name: 'Confirmar importação' }).click();
    await p.locator('#io-previa [role="alert"]').waitFor();
    assert.match(await p.locator('#io-previa [role="alert"]').innerText(), /Outra aba alterou os dados/);
    await p.reload();
    await p.goto(`${URL_BASE}#importar-operacao`);
    assert.match(await p.locator('#io-salvo').innerText(), /2 ativos · 2 OS · 1 falha/);

    assert.deepEqual(erros, []);
    await c.close();
    console.log('Importação da operação: prévia, recusas, confirmação, reimportação sem duplicar, dashboards reais, backup e conflito entre abas aprovados.');
  },
});
