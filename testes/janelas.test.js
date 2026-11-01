import { it, expect } from 'vitest';
import { sugerirJanela, janelaValida, TOLERANCIA_DIAS } from '../src/logica/janelas.js';
import { criarGestao, validarGestao } from '../src/logica/gestao.js';

const t = (id, dataPrevista, horas, seguranca = false, extra = {}) => ({ id, tag: `TST-${id}`, descricao: `Tarefa fictícia ${id}`, dataPrevista, horas, seguranca, ...extra });

it('exemplo da decisão D4 (±2 dias): segurança no prazo, adia 2, antecipa 2 e deixa fora quem passa da tolerância', () => {
  expect(TOLERANCIA_DIAS).toBe(2);
  const r = sugerirJanela({ data: '2026-11-20', horas: 8 }, [
    t('seg', '2026-11-20', 2, true), t('lub', '2026-11-18', 3), t('fil', '2026-11-22', 3), t('ali', '2026-11-24', 2)]);
  expect(r.incluidas.map((x) => [x.id, x.desloc])).toEqual([['seg', 0], ['lub', 2], ['fil', -2]]);
  expect(r.ocupacao).toBe(8);
  expect(r.naoCouberam).toEqual([]);
  expect(r.conflitos).toEqual([]);
});

it('segurança nunca é adiada; antecipada mostra até quando deve vir a próxima', () => {
  const r = sugerirJanela({ data: '2026-11-20', horas: 8 }, [
    t('atrasada', '2026-11-19', 1, true), t('antecipa', '2026-11-21', 1, true, { intervaloDias: 7 })]);
  expect(r.incluidas.map((x) => x.id)).toEqual(['antecipa']);
  expect(r.incluidas[0].proximaAte).toBe('2026-11-27');
});

it('capacidade: prioriza segurança e vencimento mais próximo; segurança que não cabe vira conflito, sem adiar', () => {
  const r = sugerirJanela({ data: '2026-11-20', horas: 4 }, [
    t('comum1', '2026-11-19', 2), t('seg1', '2026-11-20', 3, true), t('seg2', '2026-11-22', 2, true), t('comum2', '2026-11-21', 1)]);
  expect(r.incluidas.map((x) => x.id)).toEqual(['seg1', 'comum2']);
  expect(r.naoCouberam.map((x) => x.id)).toEqual(['seg2', 'comum1']);
  expect(r.conflitos).toHaveLength(1);
  expect(r.conflitos[0]).toMatch(/TST-seg2.*não será adiada/);
  expect(r.ocupacao).toBe(4);
});

it('valida a janela (data real, horas entre 0 e 24, id seguro)', () => {
  expect(janelaValida({ id: 'j1', data: '2026-11-20', horas: 8, descricao: 'Parada fictícia' })).toBe(true);
  for (const ruim of [{ id: 'j 1', data: '2026-11-20', horas: 8, descricao: '' }, { id: 'j1', data: '2026-02-30', horas: 8, descricao: '' },
    { id: 'j1', data: '2026-11-20', horas: 0, descricao: '' }, { id: 'j1', data: '2026-11-20', horas: 25, descricao: '' }, null]) {
    expect(janelaValida(ruim)).toBe(false);
  }
});

it('a base guarda janelas só a partir da versão 2, sem ids repetidos', () => {
  const j = { id: 'j1', data: '2026-11-20', horas: 8, descricao: 'Parada fictícia' };
  expect(validarGestao({ ...criarGestao(), versao: 2, janelasParada: [j] })).toBe(true);
  expect(validarGestao({ ...criarGestao(), versao: 1, janelasParada: [j] })).toBe(false);
  expect(validarGestao({ ...criarGestao(), versao: 2, janelasParada: [j, { ...j }] })).toBe(false);
  expect(validarGestao({ ...criarGestao(), versao: 2, janelasParada: [{ ...j, horas: 30 }] })).toBe(false);
});