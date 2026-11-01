import { it, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import biblioteca from '../src/dados/biblioteca.json';
import { montarDados } from '../src/logica/pacote.js';
import { criarGestao } from '../src/logica/gestao.js';
import { criarProgramacao, prepararRevisao } from '../src/logica/programacao.js';
import { prepararEmissao } from '../src/logica/emissao.js';
import { dadosPcmMan002, dadosPcmMan001, dadosPcmMan004, dadosPcmMan008 } from '../src/logica/biblioteca-v2-dados.js';
import { preencherPcmMan002, preencherPcmMan001, preencherPcmMan004, preencherPcmMan008, deslocarFormula, moverReferencias } from '../src/saida/biblioteca-v2-xlsx.js';
import { abrirWorkbookBibliotecaV2 } from '../src/integracao/biblioteca-pcm-v2.js';

const ORIGINAL = 'public/modelos/biblioteca-v2/PCM-MAN-002_Criticidade-FMECA-e-Plano_R00.xlsx';
const bytes = () => readFileSync(ORIGINAL);
const texto = (v) => (v?.richText ? v.richText.map((t) => t.text).join('') : v);

// Fábrica fictícia: n motores, plano anual ativo.
function emissao(n, extra = {}) {
  const equipamentos = Array.from({ length: n }, (_, i) => ({ id: 'eq' + i, setor: i % 2 ? 'UTL' : 'PRD', tipo: 'motor_eletrico', descricao: 'Motor fictício ' + i, numero: i + 1, tag: `${i % 2 ? 'UTL' : 'PRD'}-MOT-${String(i + 1).padStart(3, '0')}` }));
  const dados = montarDados(equipamentos, biblioteca, {}, '2026-01-05', {});
  const gestao = criarGestao();
  gestao.organizacao.nome = 'Fábrica fictícia';
  gestao.pessoas.push({ id: 'p1', nome: 'Técnica Fictícia', funcao: 'Mecânica', especialidade: 'Mecânica', ativo: true });
  const r = prepararRevisao(criarProgramacao(), dados, gestao, { id: 'rev1', vigencia: '2026-01-05', elaborador: 'Técnico fictício', resumo: 'Plano anual' }, '2026-01-05');
  expect(r.ok, r.motivo).toBe(true);
  const estado = { equipamentos, biblioteca, gestao, programacao: r.programacao, ...extra };
  return prepararEmissao(estado, { dataCorte: '2026-06-30', elaborador: 'Técnico fictício', aprovado: false, aprovador: '' });
}

async function abrirSaida(saida) {
  const zip = await JSZip.loadAsync(saida);
  const aba = async (n) => zip.file(`xl/worksheets/sheet${n}.xml`).async('string');
  return { zip, aba, wb: await abrirWorkbookBibliotecaV2(saida, ExcelJS) };
}

describe('fórmulas ao ampliar blocos', () => {
  it('desloca só partes relativas e não confunde funções, textos ou tabelas', () => {
    expect(deslocarFormula('IF(B30="","",Plano!$G30+F$5+LOG10(2))', 2)).toBe('IF(B32="","",Plano!$G32+F$5+LOG10(2))');
    expect(deslocarFormula('INDEX(tb_pcm_ativos[tag],MATCH("A30",C30,0))', 1)).toBe('INDEX(tb_pcm_ativos[tag],MATCH("A30",C31,0))');
    expect(deslocarFormula('SUM(B8:B11)', 0, 1)).toBe('SUM(C8:C11)');
  });
  it('move o que está abaixo e amplia intervalos que terminam no bloco, só na aba certa', () => {
    expect(moverReferencias('SUM(F8:F33)+A34+A10', 'Cronograma', true, 33, 5)).toBe('SUM(F8:F38)+A39+A10');
    expect(moverReferencias("SUMPRODUCT(Plano!$I$5:$I$30)+'Leia-me'!$D$15+B40", 'Plano', false, 30, 4)).toBe("SUMPRODUCT(Plano!$I$5:$I$34)+'Leia-me'!$D$15+B40");
    expect(moverReferencias('Plano!$A$1:$L$31', 'Plano', false, 30, 4)).toBe('Plano!$A$1:$L$35');
  });
});

describe('PCM-MAN-002 preenchido', () => {
  it('recusa um arquivo que não é o original esperado', async () => {
    const outro = new Uint8Array(bytes()); outro[outro.length - 10] ^= 1;
    await expect(preencherPcmMan002(outro, dadosPcmMan002(emissao(2)))).rejects.toThrow('diferente do esperado');
  });

  it('com poucos dados, não amplia nada e preserva o restante do pacote byte a byte', async () => {
    const d = dadosPcmMan002(emissao(1));
    d.atividades = d.atividades.slice(0, 3);
    const saida = await preencherPcmMan002(bytes(), d);
    const original = await JSZip.loadAsync(bytes());
    const { zip, wb } = await abrirSaida(saida);
    const alteradas = new Set(['xl/workbook.xml', ...[1, 2, 3, 4, 5, 6, 7].map((n) => `xl/worksheets/sheet${n}.xml`), ...[1, 2, 3, 4, 5].map((n) => `xl/tables/table${n}.xml`)]);
    for (const nome of Object.keys(original.files).filter((n) => !original.files[n].dir && !alteradas.has(n))) {
      expect(await zip.file(nome).async('uint8array'), nome).toEqual(await original.file(nome).async('uint8array'));
    }
    expect(Object.keys(zip.files).filter((n) => /media|drawings/.test(n)).length).toBe(Object.keys(original.files).filter((n) => /media|drawings/.test(n)).length);
    const plano = wb.getWorksheet('Plano');
    expect(plano.getCell('B21').value).toBe('PRD-MOT-001');
    expect(texto(plano.getCell('A31').value)).toMatch(/^Cinza = vem da FMECA/);
    expect(wb.getWorksheet('Leia-me').getCell('D13').value).toBe('Técnico fictício');
    expect(wb.getWorksheet('Leia-me').getCell('D14').value).toBe(null); // sem aprovação informada
    expect(wb.getWorksheet('Criticidade').getCell('B8').value).toBe('PRD-MOT-001'); // ativo listado, notas ainda não avaliadas
    expect(wb.getWorksheet('Criticidade').getCell('E8').value).toBe(null);
  });

  it('100 ativos e plano anual: amplia Cadastros, Plano e Cronograma sem truncar nem sobrescrever o rodapé', async () => {
    const e = emissao(100);
    const d = dadosPcmMan002(e);
    expect(d.ativos).toHaveLength(100);
    expect(d.atividades.length).toBeGreaterThan(100);
    const n = d.atividades.length, k = n - 10;
    const inicio = performance.now();
    const saida = await preencherPcmMan002(bytes(), d);
    expect(performance.now() - inicio).toBeLessThan(15000);
    const { zip, aba, wb } = await abrirSaida(saida);

    // Cadastros: a tabela de ativos cresce até a linha 104; as tabelas vizinhas acompanham sem perder dados.
    expect(wb.getWorksheet('Cadastros').getTable('tb_pcm_ativos').table.tableRef ?? wb.getWorksheet('Cadastros').getTable('tb_pcm_ativos').table.ref).toBe('A4:D104');
    expect(await zip.file('xl/tables/table1.xml').async('string')).toContain('ref="A4:D104"');
    const cad = wb.getWorksheet('Cadastros');
    expect(cad.getCell('A104').value).toBe(d.ativos[99].tag);
    expect(cad.getCell('F5').value).toBe('Técnica Fictícia');
    expect(cad.getCell('J5').value).toBe('PRD');

    // Plano: todas as atividades, numeradas; rodapé deslocado e mesclado na nova linha.
    const plano = wb.getWorksheet('Plano');
    expect(plano.getCell(`B${20 + n}`).value).toBe(d.atividades.at(-1).tag);
    expect(plano.getCell(`A${20 + n}`).value).toBe(15 + n);
    expect(texto(plano.getCell(`A${31 + k}`).value)).toMatch(/^Cinza = vem da FMECA/);
    const xmlPlano = await aba(4);
    expect(xmlPlano).toContain(`<mergeCell ref="A${31 + k}:L${31 + k}"/>`);
    expect(xmlPlano).toMatch(new RegExp(`sqref="B21:B${30 + k}"`));
    expect(xmlPlano).toContain(`IF(B${30 + k}="","",IFERROR(INDEX(tb_pcm_ativos[descricao_ativo],MATCH(B${30 + k}`);
    expect(xmlPlano).not.toContain('t="shared"');
    const primeira = d.atividades[0];
    expect(plano.getCell('K21').value).toEqual(new Date(`${primeira.primeira}T00:00:00Z`));
    expect(plano.getCell('G21').value).toBe(primeira.dias);

    // Cronograma: uma linha por atividade do Plano, e o total semanal soma o bloco inteiro.
    const xmlCrono = await aba(5);
    expect(xmlCrono).toContain(`<f>Plano!A${30 + k}</f>`);
    expect(xmlCrono).toContain(`SUMPRODUCT(--(F8:F${33 + k}="`);
    expect(xmlCrono).toContain(`Plano!$I$5:$I$${30 + k}`);
    expect(texto(wb.getWorksheet('Cronograma').getCell(`A${34 + k}`).value)).toBe('Horas planejadas na semana');

    // Impressão e recálculo.
    const wbXml = await zip.file('xl/workbook.xml').async('string');
    expect(wbXml).toContain(`Plano!$A$1:$L$${31 + k}`);
    expect(wbXml).toContain(`Cronograma!$A$1:$BM$${35 + k}`);
    expect(wbXml).toContain(`Cadastros!$A$1:$J$105`);
    expect(wbXml).toMatch(/fullCalcOnLoad="1"/);
    for (const nAba of [1, 2, 3, 4, 5, 6, 7]) expect(await aba(nAba)).not.toMatch(/<\/f><v[\s>/]/); // valor antigo + tipo retirado = célula inválida no Excel
  });

  it('Criticidade com 100 ativos: notas 1 a 5 do app, matriz ampliada e quadros à direita intactos', async () => {
    const e = emissao(100);
    e.estado.gestao.criticidade.notas = { eq0: [5, 1, 1, 1], eq1: [2, 3, 1, 4] };
    const d = dadosPcmMan002(e);
    expect(d.criticidade).toHaveLength(100);
    expect(d.criticidade.find((c) => c.tag === 'PRD-MOT-001')).toEqual({ tag: 'PRD-MOT-001', s: 5, q: 1, p: 1, f: 1 });
    const saida = await preencherPcmMan002(bytes(), d);
    const { zip, aba, wb } = await abrirSaida(saida);
    const crit = wb.getWorksheet('Criticidade');
    expect(crit.getCell('B8').value).toBe('PRD-MOT-001');
    expect(crit.getCell('E8').value).toBe(5);
    expect(crit.getCell('A107').value).toBe(100);
    expect(crit.getCell('B107').value).toBe(d.criticidade[99].tag);
    const xml = await aba(2);
    expect(xml).toContain('COUNTIFS($H$8:$H$107,5,$I$8:$I$107,1)');
    expect(xml).toContain('<f>IF(OR(H107="",I107=""),"",IF(E107=5,"A",MID(CHOOSE(H107,');
    expect(/sqref="[^"]*\bE8:G107\b/.test(xml)).toBe(true);
    expect(xml).toContain('<mergeCell ref="N27:R27"/>'); // quadro de estratégia não estica
    expect(xml).toContain('<mergeCell ref="M26:M27"/>');
    expect(xml).toContain('<mergeCell ref="A108:R108"/>'); // legenda desce
    expect(xml.match(/Ou operar até falhar/g) ?? []).toHaveLength(0); // texto vem de sharedStrings, nunca copiado inline
    expect(/<c r="N(2[89]|[3-9]\d|10[0-7])"/.test(xml)).toBe(false); // linhas novas (28–107) só com as colunas da tabela
    expect(await zip.file('xl/workbook.xml').async('string')).toContain('Criticidade!$A$1:$X$108');
  });

  it('marca tarefa de segurança e não inventa campos sem equivalente', () => {
    const d = dadosPcmMan002(emissao(3));
    const seg = d.atividades.find((t) => t.atividade.endsWith('(tarefa de segurança)'));
    const tarefaSeg = emissao(3).revisao.plano.find((t) => t.seguranca);
    expect(Boolean(seg)).toBe(Boolean(tarefaSeg));
    expect(d.atividades.every((t) => !('tipo' in t) && !('componente' in t))).toBe(true);
  });
});

describe('PCM-MAN-008 preenchido', () => {
  function emissao008(qtdApp = 2) {
    const e = emissao(2);
    const g = e.estado.gestao;
    e.falhas = Array.from({ length: qtdApp }, (_, i) => ({ id: 'fa' + i, equipamentoId: 'eq0', tag: 'PRD-MOT-001', data: '2026-05-0' + (1 + (i % 9)),
      sintoma: 'Vibração fictícia ' + i, causa: 'Folga', acao: 'Reaperto', peca: i ? '' : 'Rolamento fictício', responsavelId: 'p1',
      horasParada: i ? null : 2.5, dataConclusao: '', horasReparo: null }));
    g.versao = 3;
    g.operacao = { versao: 1, ativos: [{ tag: 'IMP-01', descricao_ativo: 'Ativo importado', familia: 'Bomba', setor: 'UTL', importacao: 'i1' }],
      ordens_servico: [], custos_manutencao: [], orcamento: [], importacoes: [],
      falhas: [{ referencia_falha: 'F-IMP-1', tag: 'IMP-01', equipamento: null, numero_os: 'OS-1', descricao_falha: 'Falha importada', causa: null, acao: null,
        inicio_falha: '2026-04-10T08:30:00', fim_falha: '2026-04-10T12:00:00', inicio_reparo: '2026-04-10T09:00:00', fim_reparo: '2026-04-10T12:00:00', importacao: 'i1' },
      { referencia_falha: 'F-IMP-2', tag: 'IMP-01', equipamento: null, numero_os: null, descricao_falha: 'Depois do corte', causa: null, acao: null,
        inicio_falha: '2026-07-10T08:30:00', fim_falha: null, inicio_reparo: null, fim_reparo: null, importacao: 'i1' }] };
    return e;
  }

  it('junta falhas importadas (com hora) e do app (só data), sem inventar horários', () => {
    const d = dadosPcmMan008(emissao008());
    expect(d.falhas.map((f) => f.referencia)).toEqual(['F-IMP-1', 'fa0', 'fa1']); // F-IMP-2 é posterior ao corte
    expect(d.falhas[1]).toMatchObject({ inicio: '2026-05-01', fim: null, acao: 'Reaperto · Peça: Rolamento fictício · Parada: 2,5 h · Responsável: Técnica Fictícia' });
    expect(d.ativos.map((a) => a.tag)).toContain('IMP-01');
  });

  it('falha do app com hora de início e conclusão vira data e hora; conclusão sem hora fica só com a data', async () => {
    const e = emissao008(2);
    Object.assign(e.falhas[0], { horaInicio: '07:45', dataConclusao: '2026-05-02', horaFim: '10:30' });
    Object.assign(e.falhas[1], { dataConclusao: '2026-05-03', horaInicio: '', horaFim: '' });
    const d = dadosPcmMan008(e);
    expect(d.falhas[1]).toMatchObject({ inicio: '2026-05-01T07:45:00', fim: '2026-05-02T10:30:00' });
    expect(d.falhas[2]).toMatchObject({ inicio: '2026-05-02', fim: '2026-05-03' });
    const saida = await preencherPcmMan008(readFileSync('public/modelos/biblioteca-v2/PCM-MAN-008_Falhas-e-Pareto_R00.xlsx'), d);
    const reg = (await abrirWorkbookBibliotecaV2(saida, ExcelJS)).getWorksheet('Registro de falhas');
    expect(reg.getCell('H6').value).toEqual(new Date('2026-05-01T07:45:00Z'));
    expect(reg.getCell('I6').value).toEqual(new Date('2026-05-02T10:30:00Z'));
    const xml3 = await (await JSZip.loadAsync(saida)).file('xl/worksheets/sheet3.xml').async('string');
    expect(xml3).toMatch(/<c r="I7" s="147">/); // conclusão sem hora: estilo só data
  });

  it('amplia o registro e grava data e hora como valores do Excel', async () => {
    const d = dadosPcmMan008(emissao008(40));
    const saida = await preencherPcmMan008(readFileSync('public/modelos/biblioteca-v2/PCM-MAN-008_Falhas-e-Pareto_R00.xlsx'), d);
    const zip = await JSZip.loadAsync(saida);
    const wb = await abrirWorkbookBibliotecaV2(saida, ExcelJS);
    const reg = wb.getWorksheet('Registro de falhas');
    expect(await zip.file('xl/tables/table1.xml').async('string')).toContain('ref="A4:K45"');
    expect(reg.getCell('A5').value).toBe('F-IMP-1');
    expect(reg.getCell('H5').value).toEqual(new Date('2026-04-10T08:30:00Z'));
    expect(reg.getCell('I6').value).toBe(null);
    // Falha do app (só data) usa o estilo dd/mm/aaaa do modelo; a importada mantém data e hora.
    const xml3 = await zip.file('xl/worksheets/sheet3.xml').async('string');
    expect(xml3).toMatch(/<c r="H6" s="147">/);
    expect(xml3).toMatch(/<c r="H5" s="81">/);
    expect(xml3).toMatch(/<c r="H45" s="149">/); // última linha: fechamento do bloco, só data
    expect(xml3).toMatch(/<c r="A29" s="76"/); // antiga última linha agora usa o estilo do meio
    expect(xml3).toMatch(/<c r="A45" s="83"/); // nova última linha mantém a borda de fechamento
    expect(texto(reg.getCell('A46').value)?.trim() ?? '').toBe('');
    expect(await zip.file('xl/worksheets/sheet3.xml').async('string')).toContain('<mergeCell ref="A46:K46"/>');
    expect(wb.getWorksheet('Cadastros').getCell('A5').value).toBe('IMP-01');
  });
});

describe('PCM-MAN-004 preenchido (histórico como ordens de serviço)', () => {
  function emissao004() {
    const e = emissao(3);
    const [o1, o2] = e.ocorrencias.filter((o) => o.dataPrevista <= '2026-06-30').slice(0, 2);
    const base = { equipamentoId: o1.equipamentoId, tarefaId: o1.tarefaId, tag: o1.tag, descricao: o1.descricao, responsavelId: 'p1', origem: 'app', cancelada: false };
    e.historico = [
      { ...base, id: 'h1', data: '2026-01-03', dataPrevista: o1.dataPrevista, observacao: 'Feito antes' },
      { ...base, id: 'h2', equipamentoId: o2.equipamentoId, tarefaId: o2.tarefaId, tag: o2.tag, descricao: o2.descricao, data: o2.dataPrevista, dataPrevista: o2.dataPrevista, observacao: '', cancelada: true },
      { ...base, id: 'h3', data: '2026-02-20', dataPrevista: '', observacao: '' },
    ];
    const g = e.estado.gestao; g.versao = 3;
    g.operacao = { versao: 1, ativos: [], falhas: [], custos_manutencao: [], orcamento: [], importacoes: [],
      ordens_servico: [{ numero_os: 'OS-9', tag: 'IMP-02', equipamento: null, atividade: 'Corretiva importada', tipo_manutencao: 'CORRETIVA', prioridade: 'ALTA', status: 'ABERTA',
        responsavel: 'Fulano fictício', data_abertura: '2026-03-01', data_prevista: '2026-03-05', data_conclusao: null, horas_estimadas: 4, horas_restantes: 4, importacao: 'i1' },
      { numero_os: 'OS-10', tag: 'IMP-02', equipamento: null, atividade: 'Depois do corte', tipo_manutencao: 'CORRETIVA', prioridade: 'ALTA', status: 'ABERTA',
        responsavel: null, data_abertura: '2026-08-01', data_prevista: null, data_conclusao: null, horas_estimadas: null, horas_restantes: null, importacao: 'i1' }] };
    return { e, o1, o2 };
  }

  it('execuções concluídas/canceladas, ocorrências vencidas programadas e OS importadas, sem inventar prioridade', () => {
    const { e, o1, o2 } = emissao004();
    const d = dadosPcmMan004(e);
    const por = new Map(d.ordens.map((o) => [o.numero, o]));
    expect(por.get('APP-h1')).toMatchObject({ status: 'CONCLUIDA', tipo: 'PREVENTIVA', prioridade: '', abertura: '2026-01-03', prazo: o1.dataPrevista, conclusao: '2026-01-03', restantes: 0, responsavel: 'Técnica Fictícia' });
    expect(por.get('APP-h1').atividade).toContain('Obs.: Feito antes');
    expect(por.get('APP-h2')).toMatchObject({ status: 'CANCELADA', conclusao: null });
    expect(por.get('APP-h3')).toMatchObject({ abertura: '2026-02-20', prazo: null });
    expect(por.get('OS-9')).toMatchObject({ prioridade: 'ALTA', status: 'ABERTA' });
    expect(por.has('OS-10')).toBe(false); // aberta depois do corte
    expect(por.has(`APP-${o1.id}`)).toBe(false); // executada: não fica programada
    expect(por.has(`APP-${o2.id}`)).toBe(true); // cancelada: continua pendente
    const programadas = d.ordens.filter((o) => o.status === 'PROGRAMADA');
    expect(programadas.length).toBeGreaterThan(0);
    expect(programadas.every((o) => o.prazo <= '2026-06-30' && o.restantes === o.estimadas)).toBe(true);
  });

  it('amplia a aba Ordens de Serviço e grava setores em H e famílias em J nos Cadastros do 004', async () => {
    const { e } = emissao004();
    const d = dadosPcmMan004(e);
    expect(d.ordens.length).toBeGreaterThan(25);
    const saida = await preencherPcmMan004(readFileSync('public/modelos/biblioteca-v2/PCM-MAN-004_Ordens-de-Servico_R00.xlsx'), d);
    const zip = await JSZip.loadAsync(saida);
    const wb = await abrirWorkbookBibliotecaV2(saida, ExcelJS);
    const ultima = 4 + d.ordens.length;
    expect(await zip.file('xl/tables/table4.xml').async('string')).toContain(`ref="A4:M${ultima}"`);
    const os = wb.getWorksheet('Ordens de Serviço');
    expect(os.getCell('A5').value).toBe(d.ordens[0].numero);
    expect(os.getCell(`A${ultima}`).value).toBe(d.ordens.at(-1).numero);
    expect(texto(os.getCell(`A${ultima + 1}`).value)).toMatch(/^Prioridade:/);
    const cad = wb.getWorksheet('Cadastros');
    expect(cad.getCell('H5').value).toBe('PRD');
    expect(cad.getCell('J5').value).toBe(d.familias[0]);
    expect(wb.getWorksheet('Leia-me').getCell('D13').value).toBe('Técnico fictício');
  });
});

const ORIGINAL_001 ='public/modelos/biblioteca-v2/PCM-MAN-001_Controle-Documental_R00.xlsx';

describe('PCM-MAN-001 preenchido', () => {
  function emissao001(requisitos = 2) {
    const e = emissao(2);
    e.estado.programacao.emissoes.push(
      { id: 'em1', modelo: 'PCM-MAN-002', versaoModelo: 'x', revisaoId: 'rev1', dataCorte: '2026-03-01' },
      { id: 'em2', modelo: 'PCM-MAN-002', versaoModelo: 'x', revisaoId: 'rev1', dataCorte: '2026-04-01' },
      { id: 'em3', modelo: 'PCMD-05', versaoModelo: 'x', revisaoId: 'rev1', dataCorte: '2026-02-01' });
    for (let i = 0; i < requisitos; i++) {
      e.estado.gestao.requisitos.push({ id: 'q' + i, referencia: `Manual fictício ${i} <b>`, versao: 'v1', data: '2025-01-10', fonte: 'https://exemplo.invalid/manual', status: i ? 'nao_verificado' : 'verificado' });
    }
    return e;
  }

  it('lista o próprio controle, os documentos já emitidos e as referências, sem inventar aprovação', () => {
    const d = dadosPcmMan001(emissao001());
    expect(d.documentos.map((x) => [x.codigo, x.tipo, x.status])).toEqual([
      ['PCM-MAN-001', 'REGISTRO', 'RASCUNHO'], ['PCM-MAN-002', 'PLANO', ''], ['PCMD-05', 'OUTRO', 'OBSOLETO'],
      ['Manual fictício 0 <b>', 'OUTRO', ''], ['Manual fictício 1 <b>', 'OUTRO', '']]);
    expect(d.documentos[1].data).toBe('2026-04-01'); // última emissão
    expect(d.documentos[0].aprovado).toBe('');
    expect(d.revisoes.map((r) => r.codigo)).toEqual(['PCM-MAN-002', 'PCM-MAN-001']);
    expect(d.pessoas).toContain('Técnico fictício');
  });

  it('emissão com corte retroativo não lista documentos posteriores; caractere de controle não invalida o XML', async () => {
    const e = emissao001(0);
    e.meta.dataCorte = '2026-03-15';
    e.meta.elaborador = 'Nome\u000bcom VT';
    const d = dadosPcmMan001(e);
    expect(d.documentos.map((x) => [x.codigo, x.data])).toEqual([['PCM-MAN-001', '2026-03-15'], ['PCM-MAN-002', '2026-03-01'], ['PCMD-05', '2026-02-01']]);
    const zip = await JSZip.loadAsync(await preencherPcmMan001(readFileSync(ORIGINAL_001), d));
    const leia = await zip.file('xl/worksheets/sheet1.xml').async('string');
    expect(leia).toContain('Nomecom VT');
    expect(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(leia)).toBe(false); // eslint-disable-line no-control-regex
  });

  it('amplia a tabela de documentos sem sobrescrever o rodapé e o Excel lê o conteúdo', async () => {
    const d = dadosPcmMan001(emissao001(30));
    expect(d.documentos).toHaveLength(33);
    const saida = await preencherPcmMan001(readFileSync(ORIGINAL_001), d);
    const zip = await JSZip.loadAsync(saida);
    const wb = await abrirWorkbookBibliotecaV2(saida, ExcelJS);
    const docs = wb.getWorksheet('Documentos');
    expect(await zip.file('xl/tables/table3.xml').async('string')).toContain('ref="A4:J37"');
    expect(docs.getCell('A5').value).toBe('PCM-MAN-001');
    expect(docs.getCell('E5').value).toBe('RASCUNHO');
    expect(docs.getCell('A37').value).toBe('Manual fictício 29 <b>'); // texto como dado, escapado no XML
    expect(texto(docs.getCell('A38').value)).toMatch(/●/);
    const xml = await zip.file('xl/worksheets/sheet2.xml').async('string');
    expect(xml).toContain('<mergeCell ref="A38:J38"/>');
    expect(xml).toContain('sqref="C5:C37"');
    expect(xml).not.toContain('<b>');
    expect(await zip.file('xl/workbook.xml').async('string')).toContain("'Documentos'!$A$1:$J$38");
    expect(wb.getWorksheet('Leia-me').getCell('D13').value).toBe('Técnico fictício');
    expect(wb.getWorksheet('Cadastros').getCell('A5').value).toBe('Técnica Fictícia');
  });
});
