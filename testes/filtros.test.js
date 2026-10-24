import { describe, it, expect } from 'vitest';
import { filtrarCronograma } from '../src/logica/filtros.js';
const equipamentos = [{ id: 'a', setor: 'UTL' }, { id: 'b', setor: 'PRD' }];
const itens = [
  { equipamentoId: 'a', especialidade: 'Operação', vezesAno: 260, duracaoHoras: 0.25, semanas: [1, 2], seguranca: true },
  { equipamentoId: 'b', especialidade: 'Mecânica', vezesAno: 12, duracaoHoras: 2, semanas: [1] },
];
describe('filtros da impressão', () => {
  it('filtra por setor e especialidade, somando só as horas visíveis sem mover tarefas', () => {
    const v = filtrarCronograma(itens, equipamentos, { setor: 'UTL', especialidade: 'Operação' });
    expect(v.itens).toEqual([itens[0]]);
    expect(v.carga.slice(0, 2)).toEqual([1.25, 1.25]);
    expect(v.horasAno).toBe(2.5);
    expect(v.equipamentos).toBe(1);
    expect(itens[0].semanas).toEqual([1, 2]);
    expect(itens[0].seguranca).toBe(true);
  });
  it('sem filtro mantém tudo; filtro sem resultado retorna horas zeradas', () => {
    expect(filtrarCronograma(itens, equipamentos).horasAno).toBe(4.5);
    const v = filtrarCronograma(itens, equipamentos, { setor: 'OUTRO' });
    expect(v.itens).toEqual([]);
    expect(v.horasAno).toBe(0);
    expect(v.carga).toHaveLength(52);
  });
});
