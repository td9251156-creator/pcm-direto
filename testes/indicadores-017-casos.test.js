import { describe, it, expect } from 'vitest';
import { indicadores017 } from '../src/logica/indicadores-017.js';

// Mesmo formato que falhasDoAtivo devolve: início e fim já em milissegundos locais tratados como UTC.
const emMs = (texto) => (texto ? Date.parse(`${texto}Z`) : null);
const falha = ({ data, inicio, fim = null, aberta = false, reparo = null, paradaInformada = null }) => ({
  origem: 'app', data, inicio: emMs(inicio), aberta, fim: emMs(fim), paradaInformada, reparo,
});

describe('indicadores017: casos de borda do PCM-MAN-017', () => {
  it('corta a falha na virada do ano: 2 h em dezembro, 4 h em janeiro e N só em dezembro', () => {
    const f = falha({
      data: '2025-12-31', inicio: '2025-12-31T22:00:00', fim: '2026-01-01T04:00:00', reparo: 3,
    });
    expect(indicadores017([f], '2025-12', 744, '2026-02-01T00:00:00')).toMatchObject({
      hi: 2, n: 1, ho: 742, mtbf: 742, mttr: 3, disponibilidade: 99.73,
    });
    expect(indicadores017([f], '2026-01', 744, '2026-02-01T00:00:00')).toMatchObject({
      hi: 4, n: 0, ho: 740, mtbf: null, mttr: null, disponibilidade: 99.46,
    });
  });

  it('corta a falha em três meses, contando as horas certas em cada um', () => {
    const f = falha({
      data: '2026-01-20', inicio: '2026-01-20T12:00:00', fim: '2026-03-10T06:00:00', reparo: 5,
    });
    const jan = indicadores017([f], '2026-01', 744, '2026-04-01T00:00:00');
    const fev = indicadores017([f], '2026-02', 672, '2026-04-01T00:00:00');
    const mar = indicadores017([f], '2026-03', 744, '2026-04-01T00:00:00');
    expect(jan).toMatchObject({ hi: 276, n: 1, ho: 468, mtbf: 468, mttr: 5, disponibilidade: 62.9 });
    expect(fev).toMatchObject({ hi: 672, n: 0, ho: 0, mtbf: null, mttr: null, disponibilidade: 0 });
    expect(mar).toMatchObject({ hi: 222, n: 0, ho: 522, mtbf: null, mttr: null, disponibilidade: 70.16 });
  });

  it('não conta duas vezes a sobreposição de duas falhas do mesmo ativo', () => {
    const f1 = falha({ data: '2026-01-10', inicio: '2026-01-10T08:00:00', fim: '2026-01-10T12:00:00', reparo: 2 });
    const f2 = falha({ data: '2026-01-10', inicio: '2026-01-10T10:00:00', fim: '2026-01-10T14:00:00', reparo: 4 });
    // União de 08:00–14:00 = 6 h (e não 8 h somando as duas).
    expect(indicadores017([f1, f2], '2026-01', 100, '2026-02-01T00:00:00')).toMatchObject({
      hi: 6, n: 2, ho: 94, mtbf: 47, mttr: 3, disponibilidade: 94,
    });
  });

  it('sem HP, MTBF e disponibilidade ficam sem dado e o MTTR continua calculado', () => {
    const f = falha({ data: '2026-01-05', inicio: '2026-01-05T08:00:00', fim: '2026-01-05T10:00:00', reparo: 1.5 });
    expect(indicadores017([f], '2026-01', null, '2026-02-01T00:00:00')).toMatchObject({
      hp: null, hi: 2, ho: null, n: 1, mtbf: null, mttr: 1.5, disponibilidade: null,
    });
  });

  it('HI maior que HP gera alerta e deixa MTBF e disponibilidade sem dado', () => {
    const f = falha({ data: '2026-01-05', inicio: '2026-01-05T08:00:00', fim: '2026-01-05T18:00:00', reparo: 4 });
    const r = indicadores017([f], '2026-01', 5, '2026-02-01T00:00:00');
    expect(r).toMatchObject({ hp: 5, hi: 10, ho: null, n: 1, mtbf: null, disponibilidade: null });
    expect(r.alertas.join(' ')).toMatch(/HI maior que HP/);
  });

  it('falha aberta no mês fica provisória e fora do MTTR, que usa só o reparo concluído', () => {
    const fechada = falha({ data: '2026-01-05', inicio: '2026-01-05T08:00:00', fim: '2026-01-05T10:00:00', reparo: 4 });
    const aberta = falha({ data: '2026-01-18', inicio: '2026-01-18T08:00:00', aberta: true, reparo: 9 });
    expect(indicadores017([fechada, aberta], '2026-01', 200, '2026-01-20T12:00:00')).toMatchObject({
      hi: 54, n: 2, ho: 146, mtbf: 73, mttr: 4, disponibilidade: 73, provisoria: true,
    });
  });
});
