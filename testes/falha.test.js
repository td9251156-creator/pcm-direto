import { describe, it, expect } from 'vitest';
import { identificacaoDaFalha } from '../src/logica/falha.js';
describe('identificação histórica de falhas', () => {
  const anterior = { equipamentoId: 'eq1', tag: 'UTL-MOT-001' };
  it('preserva a TAG original ao corrigir um relato após renomear ou remover o ativo', () => {
    expect(identificacaoDaFalha({ id: 'eq1', tag: 'PRD-MOT-001' }, anterior)).toEqual(anterior);
    expect(identificacaoDaFalha(undefined, anterior)).toEqual(anterior);
  });
  it('captura a TAG atual somente na criação ou troca explícita do ativo', () => {
    const eq = { id: 'eq2', tag: 'PRD-MOT-002' };
    expect(identificacaoDaFalha(eq, anterior)).toEqual({ equipamentoId: 'eq2', tag: eq.tag });
    expect(identificacaoDaFalha(eq)).toEqual({ equipamentoId: 'eq2', tag: eq.tag });
  });
});
