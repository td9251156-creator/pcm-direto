import { describe, it, expect } from 'vitest';
import demo from '../src/dados/demo-dashboards.json';
import { normalizarFonte } from '../src/logica/dashboards/fonte.js';
import { FILTRO_VAZIO } from '../src/logica/dashboards/filtros.js';
import { calcularConfiabilidade, uniaoEmHoras } from '../src/logica/dashboards/confiabilidade.js';

const H = 3600000;
const mini = (falhas, ativos = [{ tag: 'A', setor: 'S', familia: 'F' }]) => normalizarFonte({
  metadados: { data_referencia: '2026-10-29', periodo: { inicio: '2026-10-01', fim: '2026-10-29' } }, bases: { ativos, falhas },
});
const f = (id, ini, fim, extra = {}) => ({ referencia_falha: id, tag: 'A', inicio_falha: ini, fim_falha: fim, ...extra });

describe('Confiabilidade', () => {
  it('conta as 124 falhas da demonstração e deixa MTBF pendente', () => {
    const r = calcularConfiabilidade(normalizarFonte(structuredClone(demo)), FILTRO_VAZIO);
    expect(r.indicadores.falhas.valor).toBe(124);
    expect(r.indicadores.mtbf.estado).toBe('pendente');
    expect(r.ranking.length).toBeLessThanOrEqual(8);
  });
  it('une sobreposições por TAG', () => {
    expect(uniaoEmHoras([[0, 4 * H], [2 * H, 6 * H], [10 * H, 11 * H]])).toBe(7);
  });
  it('não conta duas vezes falhas sobrepostas do mesmo ativo', () => {
    const r = calcularConfiabilidade(mini([f('1', '2026-10-05T08:00:00', '2026-10-05T12:00:00'), f('2', '2026-10-05T10:00:00', '2026-10-05T14:00:00')]), FILTRO_VAZIO);
    expect(r.indicadores.falhas.valor).toBe(2);
    expect(r.indicadores.indisponibilidade.valor).toBe(6);
  });
  it('recorta ao período e separa reparo de indisponibilidade', () => {
    const r = calcularConfiabilidade(mini([f('1', '2026-10-01T22:00:00', '2026-10-02T02:00:00', { inicio_reparo: '2026-10-02T00:00:00', fim_reparo: '2026-10-02T01:00:00' })]),
      { ...FILTRO_VAZIO, inicio: '2026-10-02' });
    expect(r.indicadores.falhas.valor).toBe(0);
    const r2 = calcularConfiabilidade(mini([f('1', '2026-10-02T00:00:00', '2026-10-03T02:00:00')]), { ...FILTRO_VAZIO, fim: '2026-10-02' });
    expect(r2.indicadores.indisponibilidade.valor).toBe(24);
  });
  it('falha aberta fica fora das horas e marca incompleto', () => {
    const r = calcularConfiabilidade(mini([f('1', '2026-10-05T08:00:00', null), f('2', '2026-10-06T08:00:00', '2026-10-06T09:00:00')]), FILTRO_VAZIO);
    expect(r.indicadores.indisponibilidade).toMatchObject({ valor: 1, estado: 'parcial' });
    expect(r.acoes.some((a) => /aberta/.test(a.texto))).toBe(true);
  });
  it('fim anterior ao início é avisado e não gera horas negativas; base vazia não quebra', () => {
    const r = calcularConfiabilidade(mini([f('1', '2026-10-05T10:00:00', '2026-10-05T08:00:00')]), FILTRO_VAZIO);
    expect(r.indicadores.indisponibilidade).toMatchObject({ valor: null, estado: 'indefinido' });
    expect(r.avisos.join(' ')).toMatch(/anterior ao início/);
    expect(calcularConfiabilidade(mini([]), FILTRO_VAZIO).indicadores.falhas).toMatchObject({ valor: 0, estado: 'zero' });
  });
});
