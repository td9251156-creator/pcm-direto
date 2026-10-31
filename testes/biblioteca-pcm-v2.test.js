import {it, expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ExcelJS from 'exceljs';
import contrato from '../src/dados/biblioteca-pcm-v2.json';
import {lerBibliotecaV2, modeloBibliotecaV2, prepararPreviaBibliotecaV2, abrirWorkbookBibliotecaV2} from '../src/integracao/biblioteca-pcm-v2.js';

const bytes = codigo => readFileSync('public/' + modeloBibliotecaV2(codigo).url);
async function abrir(codigo) { return abrirWorkbookBibliotecaV2(bytes(codigo), ExcelJS); }
function preencherOS(w, row = 5, numero = '00012') {
  const s = w.getWorksheet('Ordens de Serviço');
  const values = [numero, 'DEMO-MOT-001', null, 'Inspeção fictícia', 'PREVENTIVA', 'MEDIA', 'ABERTA', '', new Date('2026-10-01T00:00:00Z'), new Date('2026-10-30T00:00:00Z'), null, 2, null];
  values.forEach((v, i) => { if (i !== 2) s.getCell(row, i + 1).value = v; });
}
it('preserva as 19 cópias byte a byte e não confunde códigos antigos', () => {
  expect(contrato.modelos).toHaveLength(19);
  expect(contrato.modelos.filter(m => m.formato === 'xlsx')).toHaveLength(16);
  for (const m of contrato.modelos) expect(createHash('sha256').update(bytes(m.codigo)).digest('hex')).toBe(m.sha256);
  expect(modeloBibliotecaV2('PCM-MAN-004').titulo).toContain('Ordens');
  expect(() => modeloBibliotecaV2('PCMD-04')).toThrow('desconhecido');
});
it('não importa fórmulas de descrição como registros nem dados dos formulários', async () => {
  for (const codigo of ['PCM-MAN-004', 'PCM-MAN-008', 'PCM-MAN-012']) {
    const result = await lerBibliotecaV2(bytes(codigo), codigo, ExcelJS);
    expect(result.erros).toEqual([]);
    for (const rows of Object.values(result.bases)) expect(rows).toEqual([]);
  }
});
it('preserva zeros, datas de calendário e ausência de horas; não modifica workbook', async () => {
  const w = await abrir('PCM-MAN-004'); preencherOS(w);
  const before = w.getWorksheet('Ordens de Serviço').getCell('A5').value;
  const r = prepararPreviaBibliotecaV2(w, 'PCM-MAN-004');
  expect(r.apto).toBe(true);
  expect(r.bases.ordens_servico[0]).toMatchObject({numero_os: '00012', data_abertura: '2026-10-01', horas_restantes: null, equipamento: null});
  expect(r.avisos.some(a => a.includes('backlog'))).toBe(true);
  expect(w.getWorksheet('Ordens de Serviço').getCell('A5').value).toBe(before);
});
it('bloqueia duplicidade e datas inválidas em vez de descartar linhas', async () => {
  const w = await abrir('PCM-MAN-004'); preencherOS(w); preencherOS(w, 6);
  w.getWorksheet('Ordens de Serviço').getCell('I6').value = '2026-02-30';
  const r = prepararPreviaBibliotecaV2(w, 'PCM-MAN-004');
  expect(r.apto).toBe(false); expect(r.bases.ordens_servico).toHaveLength(2);
  expect(r.erros.some(e => e.mensagem.includes('duplicada'))).toBe(true);
  expect(r.erros.some(e => e.mensagem.includes('Data inválida'))).toBe(true);
});
it('recusa códigos de domínio inválidos antes de considerar a prévia apta', async () => {
  const w = await abrir('PCM-MAN-004'); preencherOS(w);
  for (const col of ['E5', 'F5', 'G5']) w.getWorksheet('Ordens de Serviço').getCell(col).value = 'INVALIDO';
  const r = prepararPreviaBibliotecaV2(w, 'PCM-MAN-004');
  expect(r.apto).toBe(false); expect(r.erros.filter(e => e.mensagem.includes('lista padronizada'))).toHaveLength(3);
});
it('lê expansão real da tabela e não trunca na capacidade original', async () => {
  const w = await abrir('PCM-MAN-004');
  const table = w.getWorksheet('Ordens de Serviço').getTable('tb_pcm_os');
  table.table.tableRef = 'A4:M30';
  // A linha 30 é rodapé mesclado no original; uma expansão real primeiro o desloca.
  w.getWorksheet('Ordens de Serviço').unMergeCells('A30');
  preencherOS(w, 30, 'NOVA-030');
  const r = prepararPreviaBibliotecaV2(w, 'PCM-MAN-004');
  expect(r.apto).toBe(true); expect(r.bases.ordens_servico).toHaveLength(1);
  expect(r.bases.ordens_servico[0].numero_os).toBe('NOVA-030');
});
it('recusa estrutura alterada e não interpreta grades do planner como eventos', async () => {
  const w = await abrir('PCM-MAN-004');
  const t = w.getWorksheet('Ordens de Serviço').getTable('tb_pcm_os');
  t.table.columns[0].name = 'campo_alterado';
  expect(prepararPreviaBibliotecaV2(w, 'PCM-MAN-004').apto).toBe(false);
  const planner = await lerBibliotecaV2(bytes('PCM-MAN-003'), 'PCM-MAN-003', ExcelJS);
  expect(planner.apto).toBe(false); expect(planner.bases).toEqual({});
});
it('preserva zero monetário e bloqueia reparo invertido', async () => {
  const w = await abrir('PCM-MAN-012'), s = w.getWorksheet('Lançamentos');
  ['DEMO-C-001', new Date('2026-10-01T00:00:00Z'), '', null, 'Setor fictício', 'OUTROS', 0, 'DEMO-DOC'].forEach((v, i) => { if (i !== 3) s.getCell(5, i + 1).value = v; });
  const r = prepararPreviaBibliotecaV2(w, 'PCM-MAN-012');
  expect(r.apto).toBe(true); expect(r.bases.custos_manutencao[0].valor_realizado).toBe(0);
  const f = await abrir('PCM-MAN-008'), sh = f.getWorksheet('Registro de falhas');
  ['DEMO-F-001', 'DEMO-MOT-001', null, '', 'Falha fictícia', '', '', '2026-10-01T08:00:00', '2026-10-01T10:00:00', '2026-10-01T09:00:00', '2026-10-01T07:00:00'].forEach((v, i) => { if (i !== 2) sh.getCell(5, i + 1).value = v; });
  expect(prepararPreviaBibliotecaV2(f, 'PCM-MAN-008').erros.some(e => e.mensagem.includes('Intervalo inválido'))).toBe(true);
});
