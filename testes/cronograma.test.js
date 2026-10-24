import { describe, it, expect } from 'vitest';
import { montarCronograma, semanasDaTarefa, resumoCarga, SEMANAS } from '../src/logica/cronograma.js';

// Cria linhas de plano simples para os testes
function linhas(qtd, vezesAno, horas = 1) {
  return Array.from({ length: qtd }, (_, i) => ({
    tag: `T-${String(i).padStart(3, '0')}`, tarefaId: `X${vezesAno}`, vezesAno, duracaoHoras: horas, ativa: true,
  }));
}

describe('ocorrências de cada tarefa', () => {
  it('cada periodicidade ocorre o número certo de vezes, dentro das 52 semanas', () => {
    for (const vezes of [52, 26, 12, 6, 4, 2, 1]) {
      const { itens } = montarCronograma(linhas(3, vezes));
      for (const item of itens) {
        expect(item.semanas).toHaveLength(vezes);
        expect(Math.min(...item.semanas)).toBeGreaterThanOrEqual(1);
        expect(Math.max(...item.semanas)).toBeLessThanOrEqual(SEMANAS);
      }
    }
  });

  it('o intervalo entre execuções é regular (trimestral = 13 semanas)', () => {
    expect(semanasDaTarefa(4, 2)).toEqual([2, 15, 28, 41]);
  });

  it('tarefa inativa não entra no cronograma', () => {
    const { itens } = montarCronograma([{ ...linhas(1, 12)[0], ativa: false }]);
    expect(itens).toHaveLength(0);
  });
});

describe('balanceamento de carga', () => {
  it('52 tarefas anuais de 1 h ficam uma em cada semana', () => {
    const { carga } = montarCronograma(linhas(52, 1));
    expect(carga.every((h) => h === 1)).toBe(true);
  });

  it('4 tarefas trimestrais não caem na mesma semana', () => {
    const { itens, carga } = montarCronograma(linhas(4, 4));
    const inicios = itens.map((i) => i.semanas[0]);
    expect(new Set(inicios).size).toBe(4);
    expect(Math.max(...carga)).toBe(1);
  });

  it('com tarefas mistas, o pico fica bem abaixo de concentrar tudo no início', () => {
    const plano = [
      ...linhas(5, 52, 0.5), ...linhas(10, 12, 1), ...linhas(10, 4, 2), ...linhas(8, 2, 3), ...linhas(12, 1, 4),
    ];
    const { carga } = montarCronograma(plano);
    const { pico, media, total } = resumoCarga(carga);

    // Comparação: todas as tarefas começando na semana 1 (sem balancear)
    const ingenua = new Array(SEMANAS).fill(0);
    for (const l of plano) for (const s of semanasDaTarefa(l.vezesAno, 0)) ingenua[s] += l.duracaoHoras;

    expect(total).toBeCloseTo(ingenua.reduce((a, b) => a + b, 0)); // mesmas horas no ano
    expect(pico).toBeLessThan(Math.max(...ingenua) / 3);
    expect(pico).toBeLessThanOrEqual(media * 2); // nenhuma semana com mais que o dobro da média
  });
});

describe('tarefa diária', () => {
  it('aparece em todas as semanas, com 5 execuções por semana nas horas', () => {
    const { itens, carga } = montarCronograma(linhas(1, 260, 0.25));
    expect(itens[0].semanas).toHaveLength(SEMANAS);
    expect(carga.every((h) => h === 1.25)).toBe(true);
    expect(resumoCarga(carga).total).toBeCloseTo(260 * 0.25);
  });
});

describe('datas do cronograma', () => {
  it('cada semana começa 7 dias depois da anterior', async () => {
    const { dataDaSemana, lerData, diaMes } = await import('../src/logica/cronograma.js');
    const inicio = lerData('2027-01-04');
    expect(diaMes(dataDaSemana(inicio, 1))).toBe('04/01');
    expect(diaMes(dataDaSemana(inicio, 2))).toBe('11/01');
    expect(diaMes(dataDaSemana(inicio, 52))).toBe('27/12');
  });

  it('o padrão é a próxima segunda-feira', async () => {
    const { proximaSegunda } = await import('../src/logica/cronograma.js');
    const d = proximaSegunda(new Date(2026, 9, 18)); // domingo, 18/10/2026
    expect(d.getDay()).toBe(1);
    expect(d.getDate()).toBe(19);
    expect(proximaSegunda(new Date(2026, 9, 19)).getDate()).toBe(26); // segunda vai para a próxima
  });
});

describe('capacidade por especialidade', () => {
  const tarefa = (i, esp, vezes, horas) => ({ tag: `T-${i}`, tarefaId: `X${i}`, especialidade: esp, vezesAno: vezes, duracaoHoras: horas, ativa: true });

  it('separa tarefas para não passar do limite semanal', () => {
    const plano = Array.from({ length: 6 }, (_, i) => tarefa(i, 'Mecânica', 4, 3));
    const { semanasAcima, cargaPorEspecialidade } = montarCronograma(plano, { Mecânica: 3 });
    expect(semanasAcima.Mecânica).toBe(0);
    expect(Math.max(...cargaPorEspecialidade.Mecânica)).toBe(3);
  });

  it('conta as semanas acima quando o limite não comporta o plano', () => {
    const plano = [tarefa(1, 'Elétrica', 52, 2), tarefa(2, 'Elétrica', 52, 2)];
    const { semanasAcima } = montarCronograma(plano, { Elétrica: 3 });
    expect(semanasAcima.Elétrica).toBe(52);
  });

  it('sem limite informado, nenhuma semana conta como acima', () => {
    const { semanasAcima } = montarCronograma([tarefa(1, 'Elétrica', 52, 9)]);
    expect(semanasAcima.Elétrica).toBe(0);
  });
});
