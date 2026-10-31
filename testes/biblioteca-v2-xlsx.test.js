import { it, expect, describe } from 'vitest';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import biblioteca from '../src/dados/biblioteca.json';
import { montarDados } from '../src/logica/pacote.js';
import { criarGestao } from '../src/logica/gestao.js';
import { criarProgramacao, prepararRevisao } from '../src/logica/programacao.js';
import { prepararEmissao } from '../src/saida/pcmd.js';
import { dadosPcmMan002 } from '../src/logica/biblioteca-v2-dados.js';
import { preencherPcmMan002, deslocarFormula, moverReferencias } from '../src/saida/biblioteca-v2-xlsx.js';
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
    expect(wb.getWorksheet('Criticidade').getCell('B8').value).toBe(null); // não preenchido pelo app
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

  it('marca tarefa de segurança e não inventa campos sem equivalente', () => {
    const d = dadosPcmMan002(emissao(3));
    const seg = d.atividades.find((t) => t.atividade.endsWith('(tarefa de segurança)'));
    const tarefaSeg = emissao(3).revisao.plano.find((t) => t.seguranca);
    expect(Boolean(seg)).toBe(Boolean(tarefaSeg));
    expect(d.atividades.every((t) => !('tipo' in t) && !('componente' in t))).toBe(true);
  });
});
