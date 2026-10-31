import { it, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { modeloBibliotecaV2, abrirWorkbookBibliotecaV2, prepararPreviaBibliotecaV2, lerOrcamentoAnualV2 } from '../src/integracao/biblioteca-pcm-v2.js';
import { prepararImportacao, aplicarImportacao, validarOperacao, criarOperacao, CAMPOS } from '../src/logica/operacao.js';
import { criarGestao, validarGestao } from '../src/logica/gestao.js';

// Dados fictícios. Escreve linhas na tabela do modelo a partir da linha seguinte ao cabeçalho.
async function abrir(codigo) { return abrirWorkbookBibliotecaV2(readFileSync('public/' + modeloBibliotecaV2(codigo).url), ExcelJS); }
function preencher(wb, base, tabela, linhas) {
  const sheet = wb.worksheets.find(s => s.getTable(tabela));
  const ref = sheet.getTable(tabela).table.tableRef ?? sheet.getTable(tabela).table.ref;
  const [, col, linha] = /^([A-Z]+)(\d+):/.exec(ref);
  const inicio = sheet.getCell(col + linha).col;
  linhas.forEach((r, i) => CAMPOS[base].forEach((campo, j) => {
    if (campo === 'equipamento' || r[campo] === undefined) return;
    sheet.getCell(+linha + 1 + i, inicio + j).value = r[campo];
  }));
  return wb;
}
const ATIVOS = [
  { tag: 'DEMO-MOT-001', descricao_ativo: 'Motor fictício', familia: 'Motor', setor: 'Setor Demo' },
  { tag: '0042', descricao_ativo: 'Bomba fictícia', familia: 'Bomba', setor: 'Setor Demo' },
];
const os = (numero, extra = {}) => ({ numero_os: numero, tag: 'DEMO-MOT-001', atividade: 'Inspeção fictícia', tipo_manutencao: 'PREVENTIVA',
  prioridade: 'MEDIA', status: 'ABERTA', responsavel: 'Equipe Demo', data_abertura: new Date('2026-10-01T00:00:00Z'),
  data_prevista: new Date('2026-10-10T00:00:00Z'), horas_estimadas: 2, horas_restantes: 2, ...extra });

async function previa004(ordens = [os('OS-0001'), os('OS-0002')], ativos = ATIVOS) {
  const wb = await abrir('PCM-MAN-004');
  preencher(wb, 'ativos', 'tb_pcm_ativos', ativos);
  preencher(wb, 'ordens_servico', 'tb_pcm_os', ordens);
  return prepararPreviaBibliotecaV2(wb, 'PCM-MAN-004');
}
const importar = (op, plano, opcoes = {}) => aplicarImportacao(op, plano, { id: 'imp' + Math.random().toString(36).slice(2, 8), data: '2026-10-31T10:00:00.000Z', ...opcoes }).operacao;

describe('importação dos dados da operação', () => {
  it('importa ativos e OS do 004 e não duplica ao reimportar o mesmo arquivo', async () => {
    const previa = await previa004();
    const plano = prepararImportacao(previa, null, null, [], { arquivo: 'os.xlsx' });
    expect(plano.apto).toBe(true);
    expect(plano.novos.map(n => n.chave)).toEqual(['DEMO-MOT-001', '0042', 'OS-0001', 'OS-0002']);
    const op = importar(null, plano);
    expect(validarOperacao(op)).toBe(true);
    expect(op.ativos[1].tag).toBe('0042'); // zero à esquerda preservado
    expect(op.ordens_servico[0]).toMatchObject({ numero_os: 'OS-0001', data_abertura: '2026-10-01', horas_restantes: 2 });
    const de_novo = prepararImportacao(await previa004(), null, op, []);
    expect(de_novo.apto).toBe(false);
    expect(de_novo.iguais).toHaveLength(4);
    expect(de_novo.novos).toHaveLength(0);
  });

  it('mostra conflito, mantém o salvo por padrão e guarda a versão anterior ao substituir', async () => {
    const op = importar(null, prepararImportacao(await previa004(), null, null, []));
    const plano = prepararImportacao(await previa004([os('OS-0001', { status: 'CONCLUIDA', data_conclusao: new Date('2026-10-05T00:00:00Z'), horas_restantes: 0 }), os('OS-0003')]), null, op, []);
    expect(plano.novos.map(n => n.chave)).toEqual(['OS-0003']);
    expect(plano.conflitos).toHaveLength(1);
    expect(plano.conflitos[0].campos).toEqual(['status', 'data_conclusao', 'horas_restantes']);
    const mantido = importar(op, plano);
    expect(mantido.ordens_servico.find(o => o.numero_os === 'OS-0001').status).toBe('ABERTA');
    expect(mantido.ordens_servico).toHaveLength(3);
    expect(mantido.importacoes.at(-1).conflitosMantidos).toBe(1);
    const trocado = importar(op, plano, { substituirConflitos: true });
    expect(trocado.ordens_servico.find(o => o.numero_os === 'OS-0001').status).toBe('CONCLUIDA');
    expect(trocado.importacoes.at(-1).substituidos[0]).toMatchObject({ base: 'ordens_servico', chave: 'OS-0001', anterior: { status: 'ABERTA' } });
    expect(op.ordens_servico).toHaveLength(2); // a base recebida não é alterada
  });

  it('recusa só a linha com erro, informando a linha, e recusa TAG sem cadastro', async () => {
    const previa = await previa004([os('OS-0001'), os('OS-0002', { data_abertura: '2026-02-30' }), os('OS-0003', { tag: 'SEM-CADASTRO' })], []);
    const plano = prepararImportacao(previa, null, null, [{ tag: 'DEMO-MOT-001', setor: 'Setor Demo' }]);
    expect(plano.novos.map(n => n.chave)).toEqual(['OS-0001']);
    expect(plano.rejeitados.map(r => [r.chave, r.linha])).toEqual([['OS-0002', 6], ['OS-0003', 7]]);
    expect(plano.rejeitados[0].motivos.join(' ')).toContain('Data inválida');
    expect(plano.rejeitados[1].motivos.join(' ')).toContain('SEM-CADASTRO');
  });

  it('ativo recusado não valida a TAG de uma OS do mesmo arquivo (revisão independente)', async () => {
    const ativoRuim = { tag: 'DEMO-X', descricao_ativo: 'x'.repeat(2001), familia: 'Motor', setor: 'Setor Demo' };
    const plano = prepararImportacao(await previa004([os('OS-0001', { tag: 'DEMO-X' })], [ativoRuim]), null, null, []);
    expect(plano.rejeitados.map(r => r.chave)).toEqual(['DEMO-X', 'OS-0001']);
    expect(plano.rejeitados[0].motivos.join(' ')).toContain('2000 caracteres');
    expect(plano.apto).toBe(false);
  });

  it('texto acima do limite recusa só a linha, com motivo, em vez de falhar na gravação', async () => {
    const plano = prepararImportacao(await previa004([os('OS-0001', { atividade: 'a'.repeat(2001) }), os('OS-0002')]), null, null, []);
    expect(plano.rejeitados.map(r => [r.chave, r.linha])).toEqual([['OS-0001', 5]]);
    const op = importar(null, plano);
    expect(validarGestao({ ...criarGestao(), versao: 3, operacao: op })).toBe(true);
  });

  it('recusa chave duplicada no mesmo arquivo sem perder a primeira linha', async () => {
    const plano = prepararImportacao(await previa004([os('OS-0001'), os('OS-0001', { atividade: 'Outra' })]), null, null, []);
    expect(plano.novos.filter(n => n.base === 'ordens_servico')).toHaveLength(1);
    expect(plano.rejeitados[0].motivos.join(' ')).toContain('duplicada');
  });

  it('bloqueia o arquivo inteiro quando a estrutura da tabela foi alterada', async () => {
    const wb = await abrir('PCM-MAN-004');
    wb.getWorksheet('Ordens de Serviço').getTable('tb_pcm_os').table.columns[0].name = 'outro';
    const plano = prepararImportacao(prepararPreviaBibliotecaV2(wb, 'PCM-MAN-004'), null, null, []);
    expect(plano.apto).toBe(false);
    expect(plano.bloqueios[0]).toContain('Campos incompatíveis');
  });

  it('importa falhas do 008 com vínculo pendente de OS como aviso', async () => {
    const op = importar(null, prepararImportacao(await previa004(), null, null, []));
    const wb = await abrir('PCM-MAN-008');
    preencher(wb, 'falhas', 'tb_pcm_falhas', [
      { referencia_falha: 'F-001', tag: 'DEMO-MOT-001', numero_os: 'OS-0001', descricao_falha: 'Falha fictícia', inicio_falha: '2026-10-02T08:00:00', fim_falha: '2026-10-02T10:00:00', inicio_reparo: '2026-10-02T08:30:00', fim_reparo: '2026-10-02T10:00:00' },
      { referencia_falha: 'F-002', tag: '0042', numero_os: 'OS-9999', descricao_falha: 'Falha aberta fictícia', inicio_falha: '2026-10-20T08:00:00' },
    ]);
    const plano = prepararImportacao(prepararPreviaBibliotecaV2(wb, 'PCM-MAN-008'), null, op, []);
    expect(plano.novos.map(n => n.chave)).toEqual(['F-001', 'F-002']);
    expect(plano.avisos.join(' ')).toContain('OS-9999');
    expect(validarOperacao(importar(op, plano))).toBe(true);
  });

  it('lê o orçamento anual do 012 só como orçamento geral e recusa setor escolhido ou ano ausente', async () => {
    const wb = await abrir('PCM-MAN-012');
    const s = wb.getWorksheet('Orçamento anual');
    s.getCell('A4').value = 2026; s.getCell('B8').value = 1000; s.getCell('C9').value = 0; s.getCell('M11').value = 250.5;
    const lido = lerOrcamentoAnualV2(wb);
    expect(lido.erros).toEqual([]);
    expect(lido.linhas.map(l => [l.competencia, l.categoria_custo, l.valor_orcado, l.setor])).toEqual([
      ['2026-01', 'MATERIAL', 1000, null], ['2026-02', 'MAO_OBRA', 0, null], ['2026-12', 'OUTROS', 250.5, null]]);
    const plano = prepararImportacao(prepararPreviaBibliotecaV2(wb, 'PCM-MAN-012'), lido, null, []);
    expect(plano.novos.filter(n => n.base === 'orcamento')).toHaveLength(3);
    s.getCell('B4').value = 'Setor Demo';
    expect(lerOrcamentoAnualV2(wb).erros[0].mensagem).toContain('B4 vazio');
    s.getCell('B4').value = null; s.getCell('A4').value = null;
    expect(lerOrcamentoAnualV2(wb).erros[0].mensagem).toContain('ano');
    s.getCell('A4').value = '2026'; s.getCell('B8').value = { formula: '1+1' };
    expect(lerOrcamentoAnualV2(wb).erros[0].mensagem).toContain('Fórmula');
  });

  it('lançamento de custo sem TAG é aceito; com TAG desconhecida é recusado', async () => {
    const wb = await abrir('PCM-MAN-012');
    preencher(wb, 'custos_manutencao', 'tb_pcm_custos', [
      { referencia_lancamento: 'C-1', data_lancamento: new Date('2026-10-03T00:00:00Z'), tag: '', setor: 'Setor Demo', categoria_custo: 'MATERIAL', valor_realizado: 0, documento_origem: 'DOC-1' },
      { referencia_lancamento: 'C-2', data_lancamento: new Date('2026-10-03T00:00:00Z'), tag: 'X-1', setor: 'Setor Demo', categoria_custo: 'MATERIAL', valor_realizado: 10, documento_origem: 'DOC-2' },
    ]);
    const plano = prepararImportacao(prepararPreviaBibliotecaV2(wb, 'PCM-MAN-012'), lerOrcamentoAnualV2(wb), null, []);
    expect(plano.novos.map(n => n.chave)).toEqual(['C-1']);
    expect(plano.novos[0].registro.valor_realizado).toBe(0);
    expect(plano.rejeitados.map(r => r.chave)).toEqual(['C-2']);
  });
});

describe('armazenamento dos dados da operação', () => {
  it('só a gestão versão 3 aceita dados da operação, e eles são conferidos', async () => {
    const op = importar(null, prepararImportacao(await previa004(), null, null, []));
    expect(validarGestao({ ...criarGestao(), versao: 3, operacao: op })).toBe(true);
    expect(validarGestao({ ...criarGestao(), versao: 2, operacao: op })).toBe(false);
    expect(validarGestao({ ...criarGestao(), versao: 3 })).toBe(false);
    const ruim = structuredClone(op); ruim.ordens_servico[0].data_abertura = '2026-13-01';
    expect(validarGestao({ ...criarGestao(), versao: 3, operacao: ruim })).toBe(false);
    const dup = structuredClone(op); dup.ordens_servico.push(dup.ordens_servico[0]);
    expect(validarOperacao(dup)).toBe(false);
    const extra = structuredClone(op); extra.ativos[0].script = '<script>';
    expect(validarOperacao(extra)).toBe(false);
  });
  it('base vazia é válida e não permite aplicar um plano sem registros', () => {
    expect(validarOperacao(criarOperacao())).toBe(true);
    expect(() => aplicarImportacao(null, { apto: false }, { id: 'x', data: '2026-10-31T00:00:00Z' })).toThrow();
  });
});
