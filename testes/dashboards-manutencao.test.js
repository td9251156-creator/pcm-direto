import { describe, it, expect } from 'vitest';
import demo from '../src/dados/demo-dashboards.json';
import { normalizarFonte } from '../src/logica/dashboards/fonte.js';
import { FILTRO_VAZIO } from '../src/logica/dashboards/filtros.js';
import { calcularManutencao } from '../src/logica/dashboards/manutencao.js';

const fonteDemo = () => normalizarFonte(structuredClone(demo));
const minima = (os = [], ativos = []) => normalizarFonte({
  metadados: { data_referencia: '2026-10-29', periodo: { inicio: '2026-01-01', fim: '2026-10-29' } },
  bases: { ativos, ordens_servico: os },
});

describe('fonte dos dashboards', () => {
  it('preserva TAG como texto, zero real e vazio, sem alterar a entrada', () => {
    const entrada = { bases: { ativos: [{ tag: ' 007 ', setor: '' }], ordens_servico: [
      { numero_os: '0010', tag: '007', horas_restantes: 0 }, { numero_os: '0011', tag: '007', horas_restantes: null }] } };
    const copia = structuredClone(entrada);
    const f = normalizarFonte(entrada);
    expect(entrada).toEqual(copia);
    expect(f.bases.ativos[0]).toEqual({ tag: '007', setor: null });
    expect(f.bases.ordens_servico.map((o) => o.horas_restantes)).toEqual([0, null]);
    expect(f.bases.ordens_servico[0].numero_os).toBe('0010');
  });
  it('ignora repetidos pela chave e avisa; base ausente vira vazia', () => {
    const f = normalizarFonte({ bases: { ordens_servico: [{ numero_os: 'A' }, { numero_os: 'A' }] } });
    expect(f.bases.ordens_servico).toHaveLength(1);
    expect(f.bases.falhas).toEqual([]);
    expect(f.avisos.join(' ')).toMatch(/repetido/);
    expect(f.avisos.join(' ')).toMatch(/ausente/);
  });
});

describe('Manutenção e Programação', () => {
  it('recalcula os controles da demonstração sem filtros', () => {
    const r = calcularManutencao(fonteDemo(), FILTRO_VAZIO);
    expect(r.indicadores.abertas.valor).toBe(85);
    expect(r.indicadores.atrasadas.valor).toBe(81);
    expect(r.indicadores.backlog.valor).toBe(238.5);
    expect(r.indicadores.backlog.estado).toBe('ok');
    expect(r.pendencias.length).toBeLessThanOrEqual(8);
    expect(r.acoes.length).toBeLessThanOrEqual(3);
  });
  it('filtra por setor sem multiplicar registros', () => {
    const f = fonteDemo();
    const setor = f.bases.ativos[0].setor;
    const r = calcularManutencao(f, { ...FILTRO_VAZIO, setor });
    const todas = calcularManutencao(f, FILTRO_VAZIO);
    expect(r.indicadores.abertas.valor).toBeLessThan(todas.indicadores.abertas.valor);
    expect(r.indicadores.abertas.valor).toBeGreaterThan(0);
  });
  it('não altera os dados ao calcular', () => {
    const f = fonteDemo();
    const antes = JSON.stringify(f.bases);
    calcularManutencao(f, FILTRO_VAZIO);
    expect(JSON.stringify(f.bases)).toBe(antes);
  });
  it('base vazia: zeros e cumprimento indefinido, sem erro', () => {
    const r = calcularManutencao(minima(), FILTRO_VAZIO);
    expect(r.indicadores.abertas).toMatchObject({ valor: 0, estado: 'zero' });
    expect(r.indicadores.atrasadas).toMatchObject({ valor: 0, estado: 'zero' });
    expect(r.indicadores.cumprimento).toMatchObject({ valor: null, estado: 'indefinido' });
    expect(r.acoes).toEqual([]);
  });
  it('sem prazo é "Sem programação" e sem horas torna o backlog incompleto', () => {
    const r = calcularManutencao(minima([
      { numero_os: '1', data_abertura: '2026-10-01', status: 'ABERTA', data_prevista: null, horas_restantes: null },
      { numero_os: '2', data_abertura: '2026-10-01', status: 'ABERTA', data_prevista: '2026-10-10', horas_restantes: 2 },
    ]), FILTRO_VAZIO);
    expect(r.indicadores.atrasadas.valor).toBe(1);
    expect(r.indicadores.backlog).toMatchObject({ valor: 2, estado: 'parcial' });
    expect(r.graficos.idade.find((f) => f.rotulo === 'Sem programação').valor).toBe(1);
  });
  it('canceladas e OS abertas após a referência não entram; prazo no dia da referência não é atraso', () => {
    const r = calcularManutencao(minima([
      { numero_os: '1', data_abertura: '2026-10-01', status: 'CANCELADA', data_prevista: '2026-10-02' },
      { numero_os: '2', data_abertura: '2026-11-05', status: 'ABERTA', data_prevista: '2026-11-10' },
      { numero_os: '3', data_abertura: '2026-10-01', status: 'ABERTA', data_prevista: '2026-10-29', horas_restantes: 1 },
    ]), FILTRO_VAZIO);
    expect(r.indicadores.abertas.valor).toBe(1);
    expect(r.indicadores.atrasadas.valor).toBe(0);
    expect(r.canceladas).toBe(1);
  });
  it('cumprimento usa só concluídas do período com prazo', () => {
    const r = calcularManutencao(minima([
      { numero_os: '1', status: 'CONCLUIDA', data_abertura: '2026-09-01', data_prevista: '2026-09-10', data_conclusao: '2026-09-10' },
      { numero_os: '2', status: 'CONCLUIDA', data_abertura: '2026-09-01', data_prevista: '2026-09-10', data_conclusao: '2026-09-12' },
      { numero_os: '3', status: 'CONCLUIDA', data_abertura: '2026-09-01', data_prevista: null, data_conclusao: '2026-09-12' },
    ]), FILTRO_VAZIO);
    expect(r.indicadores.cumprimento.valor).toBe(50);
  });
  it('backlog sem nenhuma hora informada é "sem dados", não zero; sem abertas, atrasadas é zero', () => {
    const r = calcularManutencao(minima([{ numero_os: '1', data_abertura: '2026-10-01', status: 'ABERTA', data_prevista: '2026-10-05', horas_restantes: null }]), FILTRO_VAZIO);
    expect(r.indicadores.backlog).toMatchObject({ valor: null, estado: 'indefinido' });
    expect(calcularManutencao(minima(), FILTRO_VAZIO).indicadores.atrasadas.estado).toBe('zero');
  });
  it('datas com hora são comparadas pelo dia; data inválida e OS sem abertura são avisadas', () => {
    const r = calcularManutencao(minima([
      { numero_os: '1', data_abertura: '2026-10-29T08:00', status: 'ABERTA', data_prevista: '2026-10-28T17:00', horas_restantes: 1 },
      { numero_os: '2', data_abertura: '29/10/2026', status: 'ABERTA' },
    ]), FILTRO_VAZIO);
    expect(r.indicadores.abertas.valor).toBe(1);
    expect(r.indicadores.atrasadas.valor).toBe(1);
    expect(r.avisos.join(' ')).toMatch(/AAAA-MM-DD/);
    expect(r.avisos.join(' ')).toMatch(/sem data de abertura/);
  });
  it('o gráfico mensal não conta canceladas como abertas', () => {
    const r = calcularManutencao(minima([{ numero_os: '1', data_abertura: '2026-10-01', status: 'CANCELADA' }, { numero_os: '2', data_abertura: '2026-10-02', status: 'ABERTA' }]), FILTRO_VAZIO);
    expect(r.graficos.movimento[0].abertas).toBe(1);
  });
  it('OS fora do cadastro ficam fora do filtro por ativo e são avisadas', () => {
    const r = calcularManutencao(minima(
      [{ numero_os: '1', tag: 'X', data_abertura: '2026-10-01', status: 'ABERTA' }, { numero_os: '2', tag: 'A', data_abertura: '2026-10-01', status: 'ABERTA' }],
      [{ tag: 'A', setor: 'S1', familia: 'F' }]), { ...FILTRO_VAZIO, setor: 'S1' });
    expect(r.indicadores.abertas.valor).toBe(1);
    expect(r.avisos.join(' ')).toMatch(/fora do cadastro/);
  });
});
