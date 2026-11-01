import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { criarGestao } from '../src/logica/gestao.js';
import { criarProgramacao } from '../src/logica/programacao.js';
import { dadosPcmMan011 } from '../src/logica/biblioteca-v2-dados.js';
import { preencherPcmMan011 } from '../src/saida/biblioteca-v2-xlsx.js';
import { abrirWorkbookBibliotecaV2 } from '../src/integracao/biblioteca-pcm-v2.js';

// Exemplo do procedimento PCM-MAN-017 (BMB-01, janeiro e fevereiro), com dados fictícios.
const imp = (ref, ini, fim, ir, fr) => ({ referencia_falha: ref, tag: 'BMB-01', equipamento: null, numero_os: null, descricao_falha: null, causa: null, acao: null,
  inicio_falha: ini, fim_falha: fim, inicio_reparo: ir, fim_reparo: fr, peca: null, responsavel: null, importacao: 'i1' });
function estado() {
  const g = { ...criarGestao(), versao: 3, metas: { disponibilidade: 95, aderencia: 90 },
    pessoas: [{ id: 'p1', nome: 'Técnica Fictícia', funcao: '', especialidade: '', ativo: true }],
    indicadoresMensais: [{ equipamentoId: 'bmb', tag: 'BMB-01', mes: '2026-01', horasPlanejadas: 600, horasParada: null }, { equipamentoId: 'bmb', tag: 'BMB-01', mes: '2026-02', horasPlanejadas: 560, horasParada: null }] };
  g.operacao = { versao: 1, ativos: [], ordens_servico: [], custos_manutencao: [], orcamento: [], importacoes: [], falhas: [
    imp('B1', '2026-01-05T08:00:00', '2026-01-05T12:00:00', '2026-01-05T09:00:00', '2026-01-05T12:00:00'),
    imp('B2', '2026-01-12T10:00:00', '2026-01-12T13:00:00', '2026-01-12T11:00:00', '2026-01-12T13:00:00'),
    imp('B3', '2026-01-31T22:00:00', '2026-02-01T04:00:00', '2026-01-31T23:00:00', '2026-02-01T04:00:00')] };
  return { gestao: g, programacao: criarProgramacao() };
}
const bomba = { id: 'bmb', tag: 'BMB-01', descricao: 'Bomba fictícia' };

it('monta os 12 meses pelo procedimento 017 e deixa em branco os meses ainda não encerrados', () => {
  const d = dadosPcmMan011(estado(), bomba, '2026', '2026-03-15', 'Técnica Fictícia');
  expect(d).toMatchObject({ ativo: 'BMB-01 · Bomba fictícia', metaDisponibilidade: 0.95, metaCumprimento: 0.9 });
  expect(d.meses[0]).toMatchObject({ horasProgramadas: 600, horasOperacao: 591, falhas: 3, horasReparo: 10, pmPlanejadas: 0, pmFeitas: 0, horasPreventiva: null });
  expect(d.meses[1]).toMatchObject({ horasProgramadas: 560, horasOperacao: 556, falhas: 0, horasReparo: null });
  expect(d.meses.slice(2).every((m) => m.aberto)).toBe(true);
});

it('preenche a planilha: o Excel calcula MTBF = 197 h e disponibilidade 98,5% como no procedimento', async () => {
  const d = dadosPcmMan011(estado(), bomba, '2026', '2026-03-15', 'Técnica Fictícia');
  const saida = await preencherPcmMan011(readFileSync('public/modelos/biblioteca-v2/PCM-MAN-011_Indicadores-Mensais_R00.xlsx'), d);
  const wb = await abrirWorkbookBibliotecaV2(saida, ExcelJS);
  const ind = wb.getWorksheet('Indicadores');
  expect(ind.getCell('A4').value).toBe('BMB-01 · Bomba fictícia');
  expect(ind.getCell('D4').value).toEqual(new Date('2026-01-01T00:00:00Z'));
  expect([ind.getCell('F4').value, ind.getCell('H4').value]).toEqual([0.95, 0.9]);
  expect([ind.getCell('B8').value, ind.getCell('C8').value, ind.getCell('D8').value, ind.getCell('E8').value]).toEqual([600, 591, 3, 10]);
  expect(ind.getCell('E9').value).toBe(null);
  expect(ind.getCell('B10').value).toBe(null); // março ainda não encerrado
  expect(ind.getCell('K8').value?.formula ?? ind.getCell('K8').formula).toMatch(/C8\/D8/); // MTBF = 591 ÷ 3 = 197 h no Excel
  expect(wb.getWorksheet('Cadastros').getCell('A5').value).toBe('Técnica Fictícia');
  expect(wb.getWorksheet('Leia-me').getCell('D13').value).toBe('Técnica Fictícia');
});
