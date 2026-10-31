import { describe, it, expect } from 'vitest';

const calcular = async entrada => {
  const { calcularIndicadores } = await import('../src/logica/indicadores.js');
  return calcularIndicadores(entrada);
};
const exemplo = { horasPlanejadas: 720, horasParada: 6, falhas: 3, horasReparo: 6, reparosConcluidos: 3 };
const indefinidos = { horasOperadas: null, mtbf: null, mttr: null, disponibilidade: null };

describe('indicadores com entradas explícitas', () => {
  it('reproduz o exemplo aprovado sem confundir horas planejadas com operadas', async () => {
    const r = await calcular(exemplo);
    expect(r.horasOperadas).toBe(714);
    expect(r.mtbf).toBe(238);
    expect(r.mttr).toBe(2);
    expect(r.disponibilidade).toBeCloseTo(99.16666666666667, 12);
  });

  it('usa o período informado e denominadores próprios de falhas e reparos', async () => {
    expect(await calcular({ horasPlanejadas: 1200, horasParada: 12, falhas: 6, horasReparo: 9, reparosConcluidos: 3 }))
      .toEqual({ horasOperadas: 1188, mtbf: 198, mttr: 3, disponibilidade: 99 });
  });

  it('não deduz o tempo de reparo das horas de parada', async () => {
    const r = await calcular({ horasPlanejadas: 720, horasParada: 6, falhas: 3, reparosConcluidos: 3 });
    expect(r.horasOperadas).toBe(714);
    expect(r.mtbf).toBe(238);
    expect(r.mttr).toBeNull();
    expect(r.disponibilidade).toBeCloseTo(99.16666666666667, 12);
  });

  it('calcula o MTTR sem exigir os dados de operação ou o número de falhas', async () => {
    expect(await calcular({ horasReparo: 6, reparosConcluidos: 3 })).toEqual({ ...indefinidos, mttr: 2 });
  });

  it('calcula a disponibilidade sem exigir contagem de falhas ou reparos', async () => {
    const r = await calcular({ horasPlanejadas: 10, horasParada: 3 });
    expect(r).toEqual({ horasOperadas: 7, mtbf: null, mttr: null, disponibilidade: 70 });
  });

  it('distingue zero informado de tempo desconhecido', async () => {
    expect(await calcular({ horasPlanejadas: 720, horasParada: 0, falhas: 0, horasReparo: 0, reparosConcluidos: 1 }))
      .toEqual({ horasOperadas: 720, mtbf: null, mttr: 0, disponibilidade: 100 });
    expect((await calcular({ ...exemplo, horasParada: null })).horasOperadas).toBeNull();
    expect((await calcular({ ...exemplo, horasReparo: null })).mttr).toBeNull();
  });

  it('não divide por zero nem substitui o quociente indefinido pelas horas do período', async () => {
    const r = await calcular({ ...exemplo, falhas: 0, reparosConcluidos: 0 });
    expect(r.mtbf).toBeNull();
    expect(r.mttr).toBeNull();
    expect(r.horasOperadas).toBe(714);
    expect(r.disponibilidade).toBeCloseTo(99.16666666666667, 12);
  });

  it('mantém a operação zero explícita, mas não divide a disponibilidade por período zero', async () => {
    expect(await calcular({ horasPlanejadas: 0, horasParada: 0, falhas: 1, horasReparo: 0, reparosConcluidos: 1 }))
      .toEqual({ horasOperadas: 0, mtbf: 0, mttr: 0, disponibilidade: null });
  });

  it('recusa horas de operação inválidas sem apagar um MTTR com dados válidos', async () => {
    for (const campo of ['horasPlanejadas', 'horasParada']) {
      for (const valor of [undefined, null, -1, NaN, Infinity, -Infinity, '6', true, false, [], {}]) {
        expect(await calcular({ ...exemplo, [campo]: valor })).toEqual({ ...indefinidos, mttr: 2 });
      }
    }
  });

  it('recusa tempo de reparo inválido sem apagar operação e disponibilidade válidas', async () => {
    for (const horasReparo of [undefined, null, -1, NaN, Infinity, -Infinity, '6', true, false, [], {}]) {
      const r = await calcular({ ...exemplo, horasReparo });
      expect(r.mttr).toBeNull();
      expect(r.horasOperadas).toBe(714);
      expect(r.mtbf).toBe(238);
      expect(r.disponibilidade).toBeCloseTo(99.16666666666667, 12);
    }
  });

  it('exige contagem inteira de falhas sem inferi-la dos reparos', async () => {
    for (const falhas of [undefined, null, -1, 1.5, NaN, Infinity, '3', true, false]) {
      const r = await calcular({ ...exemplo, falhas });
      expect(r.mtbf).toBeNull();
      expect(r.mttr).toBe(2);
      expect(r.disponibilidade).toBeCloseTo(99.16666666666667, 12);
    }
  });

  it('exige contagem inteira de reparos concluídos sem inferi-la das falhas', async () => {
    for (const reparosConcluidos of [undefined, null, -1, 1.5, NaN, Infinity, '3', true, false]) {
      const r = await calcular({ ...exemplo, reparosConcluidos });
      expect(r.mttr).toBeNull();
      expect(r.mtbf).toBe(238);
      expect(r.horasOperadas).toBe(714);
    }
  });

  it('não gera operação negativa nem corrige silenciosamente parada maior que o período', async () => {
    expect(await calcular({ ...exemplo, horasPlanejadas: 5, horasParada: 6 }))
      .toEqual({ ...indefinidos, mttr: 2 });
  });

  it('trata entrada ausente ou objeto inválido sem lançar e aceita um registro sem protótipo', async () => {
    for (const entrada of [undefined, null, [], new Date(), new Map(), 'dados', 1, true, () => {}]) {
      expect(await calcular(entrada)).toEqual(indefinidos);
    }
    expect(await calcular(Object.assign(Object.create(null), exemplo))).toEqual(await calcular(exemplo));
  });

  it('preserva a precisão e evita transbordamento no cálculo percentual', async () => {
    const r = await calcular({ horasPlanejadas: 10, horasParada: 3, falhas: 3, horasReparo: 5, reparosConcluidos: 3 });
    expect(r.mtbf).toBe(7 / 3);
    expect(r.mttr).toBe(5 / 3);
    const grande = await calcular({ horasPlanejadas: Number.MAX_VALUE, horasParada: 0, falhas: 1, horasReparo: Number.MAX_VALUE, reparosConcluidos: 1 });
    expect(grande).toEqual({ horasOperadas: Number.MAX_VALUE, mtbf: Number.MAX_VALUE, mttr: Number.MAX_VALUE, disponibilidade: 100 });
    expect(Object.values(grande).every(Number.isFinite)).toBe(true);
  });

  it('não altera os dados recebidos', async () => {
    const entrada = Object.freeze({ ...exemplo });
    const antes = structuredClone(entrada);
    await calcular(entrada);
    expect(entrada).toEqual(antes);
  });
});
