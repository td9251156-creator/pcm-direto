import { describe, it, expect } from 'vitest';
import demo from '../src/dados/demo-dashboards.json';
import { normalizarFonte } from '../src/logica/dashboards/fonte.js';
import { FILTRO_VAZIO } from '../src/logica/dashboards/filtros.js';
import { calcularCustos } from '../src/logica/dashboards/custos.js';

const mini = (custos, orcamento) => normalizarFonte({
  metadados: { data_referencia: '2026-10-29', periodo: { inicio: '2026-09-01', fim: '2026-09-30' }, ultimo_mes_parcial: false },
  bases: { custos_manutencao: custos, orcamento_manutencao: orcamento },
});
const c = (id, data, valor, setor = 'S1', categoria = 'MATERIAL') => ({ referencia_lancamento: id, data_lancamento: data, valor_realizado: valor, setor, categoria_custo: categoria });
const o = (comp, valor, setor = 'S1', categoria = 'MATERIAL') => ({ competencia: comp, setor, categoria_custo: categoria, valor_orcado: valor });
const periodo = { ...FILTRO_VAZIO, inicio: '2026-09-01', fim: '2026-09-30' };

describe('Custos', () => {
  it('recalcula os controles da demonstração e marca outubro como parcial', () => {
    const r = calcularCustos(normalizarFonte(structuredClone(demo)), FILTRO_VAZIO);
    expect(r.indicadores.realizado.valor).toBe(156034);
    expect(r.indicadores.orcado.valor).toBe(110000);
    expect(r.indicadores.desvio.valor).toBe(46034);
    expect(r.indicadores.desvio.estado).toBe('parcial');
    expect(r.graficos.porMes.at(-1).parcial).toBe(true);
    expect(r.frases.mes).toMatch(/parcial/);
  });
  it('desvio = realizado − orçado e consumo = realizado ÷ orçado', () => {
    const r = calcularCustos(mini([c('1', '2026-09-10', 60), c('2', '2026-09-11', 40)], [o('2026-09-01', 80)]), periodo);
    expect(r.indicadores.desvio).toMatchObject({ valor: 20, estado: 'ok' });
    expect(r.indicadores.consumo.valor).toBe(125);
  });
  it('orçamento zero informado é zero real: desvio calculado, consumo sem divisão por zero', () => {
    const r = calcularCustos(mini([c('1', '2026-09-10', 60)], [o('2026-09-01', 0)]), periodo);
    expect(r.indicadores.realizado.valor).toBe(60);
    expect(r.indicadores.orcado).toMatchObject({ valor: 0, estado: 'zero' });
    expect(r.indicadores.desvio.valor).toBe(60);
    expect(r.indicadores.consumo).toMatchObject({ valor: null, estado: 'indefinido' });
  });
  it('sem orçamento mostra só o realizado e pede o orçamento', () => {
    const r = calcularCustos(mini([c('1', '2026-09-10', 60)], []), periodo);
    expect(r.indicadores.desvio.valor).toBeNull();
    expect(r.acoes[0].texto).toMatch(/orçamento/);
  });
  it('orçamento sem valor é avisado e lançamento sem setor vira "(sem setor)"', () => {
    const r = calcularCustos(mini([c('1', '2026-09-10', 60, null)], [o('2026-09-01', null), o('2026-09-01', 50, 'S2')]), periodo);
    expect(r.indicadores.orcado.estado).toBe('parcial');
    expect(r.avisos.join(' ')).toMatch(/sem valor/);
    expect(r.porSetor.map((s) => s.rotulo)).toContain('(sem setor)');
  });
  it('orçamento repetido não é contado duas vezes e filtro de setor vale para as duas fontes', () => {
    const r = calcularCustos(mini([c('1', '2026-09-10', 10, 'S1'), c('2', '2026-09-10', 90, 'S2')], [o('2026-09-01', 50), o('2026-09-01', 50), o('2026-09-01', 70, 'S2')]), { ...periodo, setor: 'S1' });
    expect(r.indicadores.orcado.valor).toBe(50);
    expect(r.indicadores.realizado.valor).toBe(10);
    expect(r.avisos.join(' ')).toMatch(/repetida/);
  });
  it('base vazia não quebra e zero real difere de ausência', () => {
    const r = calcularCustos(mini([], []), periodo);
    expect(r.indicadores.realizado).toMatchObject({ valor: 0, estado: 'zero' });
    expect(r.indicadores.orcado.estado).toBe('indefinido');
  });
  it('não altera os dados', () => {
    const f = normalizarFonte(structuredClone(demo));
    const antes = JSON.stringify(f.bases);
    calcularCustos(f, FILTRO_VAZIO);
    expect(JSON.stringify(f.bases)).toBe(antes);
  });
});
