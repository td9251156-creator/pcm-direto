import { describe, expect, it } from 'vitest';
import { correspondeBusca } from '../src/logica/texto.js';

describe('Busca de modelos', () => {
  it('aceita palavras em qualquer ordem, espaços extras, maiúsculas e acentos', () => {
    expect(correspondeBusca('Motor elétrico · Inspeção dos rolamentos', '  ROLAMENTOS eletrico ')).toBe(true);
    expect(correspondeBusca('Ficha de falha · Ação', 'acao ficha')).toBe(true);
    expect(correspondeBusca('Motor elétrico', 'motor bomba')).toBe(false);
    expect(correspondeBusca('Motor elétrico', '   ')).toBe(true);
  });
  it('compara texto sem modificar o rótulo original', () => {
    const rotulo = 'Inspeção elétrica';
    expect(correspondeBusca(rotulo, 'inspecao eletrica')).toBe(true);
    expect(rotulo).toBe('Inspeção elétrica');
  });
});
